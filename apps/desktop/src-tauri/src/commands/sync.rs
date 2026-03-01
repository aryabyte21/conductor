use crate::clients;
use crate::config::{self, backup, McpServerConfig, SyncResult};
use std::collections::HashSet;
use std::path::Path;

#[tauri::command]
pub async fn sync_to_client(
    client_id: String,
    server_ids: Option<Vec<String>>,
) -> Result<SyncResult, String> {
    let adapter =
        clients::get_adapter(&client_id).ok_or_else(|| format!("Unknown client: {}", client_id))?;

    let cfg = config::read_config().map_err(|e| e.to_string())?;

    // If no server_ids provided, sync all enabled servers
    let ids_to_sync = server_ids.unwrap_or_else(|| {
        cfg.servers
            .iter()
            .filter(|s| s.enabled)
            .map(|s| s.id.clone())
            .collect()
    });

    let servers_to_sync: Vec<McpServerConfig> = cfg
        .servers
        .iter()
        .filter(|s| ids_to_sync.contains(&s.id) && s.enabled)
        .cloned()
        .collect();

    if servers_to_sync.is_empty() {
        return Ok(SyncResult {
            client_id: client_id.clone(),
            success: true,
            servers_written: 0,
            error: None,
            warnings: vec![],
        });
    }

    let mut warnings: Vec<String> = Vec::new();

    // Inject secrets from keychain and OAuth access token into env vars.
    // Fault-tolerant: if one server's secret injection fails, log a warning
    // and still include the server (without the failed secret).
    let mut enriched_servers: Vec<McpServerConfig> = Vec::with_capacity(servers_to_sync.len());
    for mut server in servers_to_sync {
        match inject_secrets(&mut server).await {
            Ok(()) => {}
            Err(e) => {
                warnings.push(format!("Server '{}': {}", server.name, e));
            }
        }
        enriched_servers.push(server);
    }

    let count = enriched_servers.len();
    let synced_names: Vec<String> = enriched_servers.iter().map(|s| s.name.clone()).collect();
    let config_path = adapter.config_path();

    // Don't swallow file-read errors — capture them as warnings so rollback
    // knows whether we actually had previous content or just failed to read it.
    let existing_content = match config_path.as_ref() {
        Some(path) => match read_existing_content(path) {
            Ok(content) => content,
            Err(e) => {
                warnings.push(format!(
                    "Could not read {}: {}",
                    path.display(),
                    e
                ));
                None
            }
        },
        None => None,
    };

    // Read previously_synced_names from existing sync entry (cumulative tracking).
    // If empty and a sync entry exists, seed from the client's actual server names
    // so that pre-existing Conductor-managed servers are recognized as orphans if
    // later deleted (migration path for existing installs).
    let prev_synced_names: Vec<String> = {
        let sync_entry = cfg.sync.iter().find(|s| s.client_id == client_id);
        match sync_entry {
            Some(entry) if !entry.previously_synced_names.is_empty() => {
                entry.previously_synced_names.clone()
            }
            Some(_) => {
                // Migration seed: use client's current server names as the baseline
                match adapter.read_servers() {
                    Ok(client_servers) => client_servers.into_iter().map(|s| s.name).collect(),
                    Err(_) => Vec::new(),
                }
            }
            None => Vec::new(),
        }
    };

    match adapter.write_servers(&enriched_servers, existing_content.as_deref(), &prev_synced_names) {
        Ok(()) => {
            if let Err(verify_err) = verify_written_servers(&*adapter, &enriched_servers) {
                let rollback_err =
                    rollback_client_config(config_path.as_ref(), existing_content.as_deref());
                let error = match rollback_err {
                    Some(rb_err) => format!(
                        "Sync verification failed: {}. Rollback also failed: {}",
                        verify_err, rb_err
                    ),
                    None => format!(
                        "Sync verification failed: {}. Rolled back client config.",
                        verify_err
                    ),
                };

                return Ok(SyncResult {
                    client_id,
                    success: false,
                    servers_written: 0,
                    error: Some(error),
                    warnings,
                });
            }

            // Log activity
            config::log_activity(
                "sync",
                &format!("Synced {} servers to {}", count, client_id),
                None,
                Some(client_id.clone()),
                None,
            );

            // Update sync timestamp in master config
            let mut cfg = config::read_config().map_err(|e| e.to_string())?;
            let timestamp = chrono::Utc::now().to_rfc3339();

            // Build cumulative previously_synced_names = previous ∪ current
            let mut cumulative: HashSet<String> = prev_synced_names.into_iter().collect();
            for name in &synced_names {
                cumulative.insert(name.clone());
            }
            let updated_prev: Vec<String> = cumulative.into_iter().collect();

            if let Some(sync_cfg) = cfg.sync.iter_mut().find(|s| s.client_id == client_id) {
                sync_cfg.last_synced = Some(timestamp);
                sync_cfg.server_ids = ids_to_sync;
                sync_cfg.synced_server_names = synced_names;
                sync_cfg.previously_synced_names = updated_prev;
            } else {
                cfg.sync.push(config::ClientSyncConfig {
                    client_id: client_id.clone(),
                    enabled: true,
                    server_ids: ids_to_sync,
                    synced_server_names: synced_names,
                    previously_synced_names: updated_prev,
                    last_synced: Some(timestamp),
                });
            }

            config::write_config(&cfg).map_err(|e| e.to_string())?;

            Ok(SyncResult {
                client_id,
                success: true,
                servers_written: count,
                error: None,
                warnings,
            })
        }
        Err(e) => {
            let rollback_err =
                rollback_client_config(config_path.as_ref(), existing_content.as_deref());
            let error = match rollback_err {
                Some(rb_err) => format!("{} (rollback failed: {})", e, rb_err),
                None => e.to_string(),
            };

            Ok(SyncResult {
                client_id,
                success: false,
                servers_written: 0,
                error: Some(error),
                warnings,
            })
        }
    }
}

#[tauri::command]
pub async fn sync_to_all_clients() -> Result<Vec<SyncResult>, String> {
    let cfg = config::read_config().map_err(|e| e.to_string())?;
    let adapters = clients::get_all_adapters();

    let enabled_server_ids: Vec<String> = cfg
        .servers
        .iter()
        .filter(|s| s.enabled)
        .map(|s| s.id.clone())
        .collect();

    let mut results = Vec::new();

    for adapter in &adapters {
        if !adapter.detect() {
            continue;
        }

        let result =
            sync_to_client(adapter.id().to_string(), Some(enabled_server_ids.clone())).await;
        match result {
            Ok(r) => results.push(r),
            Err(e) => results.push(SyncResult {
                client_id: adapter.id().to_string(),
                success: false,
                servers_written: 0,
                error: Some(e),
                warnings: vec![],
            }),
        }
    }

    Ok(results)
}

async fn inject_secrets(server: &mut McpServerConfig) -> anyhow::Result<()> {
    // Inject secret env vars from keychain
    for key in &server.secret_env_keys {
        let username = format!("{}:{}", server.id, key);
        if let Ok(entry) = keyring::Entry::new("conductor", &username) {
            if let Ok(secret) = entry.get_password() {
                server.env.insert(key.clone(), secret);
            }
        }
    }

    // Inject OAuth token if one exists and the server hasn't set OAUTH_TOKEN itself.
    // This avoids silently overwriting user-provided env values.
    if !server.env.contains_key("OAUTH_TOKEN") {
        if let Some(token) = crate::oauth::get_valid_oauth_token(&server.id).await? {
            server.env.insert("OAUTH_TOKEN".to_string(), token);
        }
    }

    Ok(())
}

fn verify_written_servers(
    adapter: &dyn crate::clients::ClientAdapter,
    expected_servers: &[McpServerConfig],
) -> anyhow::Result<()> {
    let actual_servers = adapter.read_servers()?;
    let actual_names: HashSet<&str> = actual_servers.iter().map(|s| s.name.as_str()).collect();

    for server in expected_servers {
        if !actual_names.contains(server.name.as_str()) {
            anyhow::bail!(
                "Client config verification failed for '{}': missing server '{}'",
                adapter.id(),
                server.name
            );
        }
    }

    Ok(())
}

fn read_existing_content(path: &Path) -> anyhow::Result<Option<String>> {
    if !path.exists() {
        return Ok(None);
    }
    let content = std::fs::read_to_string(path)?;
    Ok(Some(content))
}

/// Attempt to restore a client config file to its previous state.
/// NEVER deletes config files — a partially-written config is better than no config.
fn rollback_client_config(
    path: Option<&std::path::PathBuf>,
    previous_content: Option<&str>,
) -> Option<String> {
    let Some(path) = path else {
        return None;
    };

    if let Some(content) = previous_content {
        backup::atomic_write(path, content)
            .err()
            .map(|e| e.to_string())
    } else {
        // No previous content available. Do NOT delete the file — a stale or
        // partially-written config is far safer than a missing one (which can
        // crash clients like Claude Desktop).
        eprintln!(
            "Warning: rollback skipped for {} (no previous content captured)",
            path.display()
        );
        None
    }
}
