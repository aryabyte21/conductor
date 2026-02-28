use crate::clients;
use crate::config::{self, McpServerConfig, SyncResult};

#[tauri::command]
pub async fn sync_to_client(
    client_id: String,
    server_ids: Option<Vec<String>>,
) -> Result<SyncResult, String> {
    let adapter = clients::get_adapter(&client_id)
        .ok_or_else(|| format!("Unknown client: {}", client_id))?;

    let cfg = config::read_config().map_err(|e| e.to_string())?;

    // If no server_ids provided, sync all enabled servers
    let ids_to_sync = server_ids.unwrap_or_else(|| {
        cfg.servers.iter().filter(|s| s.enabled).map(|s| s.id.clone()).collect()
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

    // Inject secrets from keychain into env vars
    let enriched_servers: Vec<McpServerConfig> = servers_to_sync
        .into_iter()
        .map(|mut server| {
            inject_secrets(&mut server);
            server
        })
        .collect();

    let count = enriched_servers.len();

    match adapter.write_servers(&enriched_servers, None) {
        Ok(()) => {
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
                client_id,
                success: true,
                servers_written: count,
                error: None,
            })
        }
        Err(e) => Ok(SyncResult {
            client_id,
            success: false,
            servers_written: 0,
            error: Some(e.to_string()),
        }),
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

        let result = sync_to_client(adapter.id().to_string(), Some(enabled_server_ids.clone())).await;
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

fn inject_secrets(server: &mut McpServerConfig) {
    // Inject secret env vars from keychain
    for key in &server.secret_env_keys {
        let username = format!("{}:{}", server.id, key);
        if let Ok(entry) = keyring::Entry::new("conductor", &username) {
            if let Ok(secret) = entry.get_password() {
                server.env.insert(key.clone(), secret);
            }
        }
    }

    // Also inject OAuth token if one exists for this server.
    // Many MCP servers expect an OAUTH_TOKEN env var for authentication.
    // This ensures users don't need to re-authenticate in each client.
    let token_key = format!("{}:oauth_token", server.id);
    if let Ok(entry) = keyring::Entry::new("conductor", &token_key) {
        if let Ok(token) = entry.get_password() {
            // Only inject if the server doesn't already have it as a secret_env_key
            // (to avoid overwriting user-specified keys)
            if !server.secret_env_keys.iter().any(|k| k == "OAUTH_TOKEN") {
                server.env.insert("OAUTH_TOKEN".to_string(), token);
            }
        }
    }
}
