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
        });
    }

    // Inject secrets from keychain and OAuth access token into env vars.
    let mut enriched_servers: Vec<McpServerConfig> = Vec::with_capacity(servers_to_sync.len());
    let mut auth_missing_servers: Vec<String> = Vec::new();

    for mut server in servers_to_sync {
        let status = inject_secrets(&mut server)
            .await
            .map_err(|e| e.to_string())?;
        match status {
            ServerAuthStatus::Ready => enriched_servers.push(server),
            ServerAuthStatus::MissingRequiredAuth(reason) => auth_missing_servers.push(reason),
        }
    }

    if enriched_servers.is_empty() && !auth_missing_servers.is_empty() {
        return Ok(SyncResult {
            client_id,
            success: false,
            servers_written: 0,
            error: Some(format!(
                "Sync blocked: {}",
                auth_missing_servers.join(" ")
            )),
        });
    }

    let count = enriched_servers.len();
    let config_path = adapter.config_path();
    let existing_content = config_path
        .as_ref()
        .and_then(|path| read_existing_content(path).ok().flatten());

    match adapter.write_servers(&enriched_servers, existing_content.as_deref()) {
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

            if let Some(sync_cfg) = cfg.sync.iter_mut().find(|s| s.client_id == client_id) {
                sync_cfg.last_synced = Some(timestamp);
                sync_cfg.server_ids = ids_to_sync;
            } else {
                cfg.sync.push(config::ClientSyncConfig {
                    client_id: client_id.clone(),
                    enabled: true,
                    server_ids: ids_to_sync,
                    last_synced: Some(timestamp),
                });
            }

            config::write_config(&cfg).map_err(|e| e.to_string())?;

            Ok(SyncResult {
                client_id: client_id.clone(),
                success: auth_missing_servers.is_empty(),
                servers_written: count,
                error: if auth_missing_servers.is_empty() {
                    None
                } else {
                    Some(format!(
                        "Partial sync: {}",
                        auth_missing_servers.join(" ")
                    ))
                },
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
            }),
        }
    }

    Ok(results)
}

enum ServerAuthStatus {
    Ready,
    MissingRequiredAuth(String),
}

async fn inject_secrets(server: &mut McpServerConfig) -> anyhow::Result<ServerAuthStatus> {
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

    if requires_conductor_oauth(server) && !server.env.contains_key("OAUTH_TOKEN") {
        return Ok(ServerAuthStatus::MissingRequiredAuth(format!(
            "Server '{}' requires Conductor OAuth auth but no token is stored. Re-authenticate this server in Conductor and sync again.",
            server.name
        )));
    }

    Ok(ServerAuthStatus::Ready)
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

fn rollback_client_config(
    path: Option<&std::path::PathBuf>,
    previous_content: Option<&str>,
) -> Option<String> {
    let Some(path) = path else {
        return None;
    };

    let result = if let Some(content) = previous_content {
        backup::atomic_write(path, content)
    } else if path.exists() {
        std::fs::remove_file(path).map_err(anyhow::Error::from)
    } else {
        Ok(())
    };

    result.err().map(|e| e.to_string())
}

fn requires_conductor_oauth(server: &McpServerConfig) -> bool {
    let Some(url) = &server.url else {
        return false;
    };

    let url = url.to_ascii_lowercase();
    url.contains("mcp.linear.app")
}
