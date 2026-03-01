use crate::clients::{get_all_adapters, ClientDetection};
use crate::config::{self, McpConfig};

#[tauri::command]
pub async fn detect_clients() -> Result<Vec<ClientDetection>, String> {
    let adapters = get_all_adapters();
    let cfg = config::read_config().map_err(|e| e.to_string())?;
    let mut detections = Vec::new();

    // Compute config_updated_at: max updated_at across all enabled servers
    let config_updated_at = cfg
        .servers
        .iter()
        .filter(|s| s.enabled)
        .filter_map(|s| s.updated_at.as_ref())
        .max()
        .cloned();

    // Compute expected server names: names of all enabled servers in Conductor
    let expected_server_names: Vec<String> = cfg
        .servers
        .iter()
        .filter(|s| s.enabled)
        .map(|s| s.name.clone())
        .collect();

    for adapter in &adapters {
        let detected = adapter.detect();
        let (server_count, server_names) = if detected {
            match adapter.read_servers() {
                Ok(servers) => (
                    servers.len(),
                    servers.iter().map(|s| s.name.clone()).collect(),
                ),
                Err(_) => (0, Vec::new()),
            }
        } else {
            (0, Vec::new())
        };

        let sync_entry = cfg.sync.iter().find(|s| s.client_id == adapter.id());
        let last_synced_at = sync_entry.and_then(|s| s.last_synced.clone());
        let last_synced_server_names = sync_entry
            .map(|s| s.synced_server_names.clone())
            .unwrap_or_default();
        let last_synced_server_count = last_synced_server_names.len();
        let previously_synced_names = sync_entry
            .map(|s| s.previously_synced_names.clone())
            .unwrap_or_default();

        detections.push(ClientDetection {
            client_id: adapter.id().to_string(),
            display_name: adapter.display_name().to_string(),
            icon: adapter.icon().to_string(),
            detected,
            config_path: adapter
                .config_path()
                .map(|p| p.to_string_lossy().to_string()),
            server_count,
            server_names,
            expected_server_names: expected_server_names.clone(),
            last_synced_server_names,
            last_synced_server_count,
            previously_synced_names,
            last_synced_at,
            config_updated_at: config_updated_at.clone(),
        });
    }

    Ok(detections)
}

#[tauri::command]
pub async fn read_master_config() -> Result<McpConfig, String> {
    config::read_config().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_master_config(config: McpConfig) -> Result<(), String> {
    config::write_config(&config).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_app_version() -> Result<String, String> {
    Ok(env!("CARGO_PKG_VERSION").to_string())
}
