use crate::clients::{get_all_adapters, ClientDetection};
use crate::config::{self, McpConfig};
use serde::Serialize;

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

// ── Update Check ────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateInfo {
    pub current_version: String,
    pub latest_version: String,
    pub download_url: String,
    pub release_notes: String,
    pub published_at: String,
    pub update_available: bool,
}

fn parse_version(v: &str) -> Option<(u64, u64, u64)> {
    let v = v.strip_prefix('v').unwrap_or(v);
    let parts: Vec<&str> = v.split('.').collect();
    if parts.len() != 3 {
        return None;
    }
    Some((
        parts[0].parse().ok()?,
        parts[1].parse().ok()?,
        parts[2].parse().ok()?,
    ))
}

fn version_is_newer(current: &str, latest: &str) -> bool {
    match (parse_version(current), parse_version(latest)) {
        (Some(c), Some(l)) => l > c,
        _ => false,
    }
}

#[tauri::command]
pub async fn check_for_updates() -> Result<UpdateInfo, String> {
    let current_version = env!("CARGO_PKG_VERSION").to_string();

    let client = reqwest::Client::builder()
        .user_agent("Conductor-Desktop")
        .build()
        .map_err(|e| e.to_string())?;

    let resp = client
        .get("https://api.github.com/repos/aryabyte21/conductor/releases/latest")
        .send()
        .await
        .map_err(|e| format!("Failed to fetch releases: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("GitHub API returned status {}", resp.status()));
    }

    let release: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    let tag = release["tag_name"]
        .as_str()
        .unwrap_or("")
        .to_string();
    let latest_version = tag.strip_prefix('v').unwrap_or(&tag).to_string();

    // Find .dmg asset download URL
    let download_url = release["assets"]
        .as_array()
        .and_then(|assets| {
            assets.iter().find_map(|a| {
                let name = a["name"].as_str().unwrap_or("");
                if name.ends_with(".dmg") {
                    a["browser_download_url"].as_str().map(|s| s.to_string())
                } else {
                    None
                }
            })
        })
        .unwrap_or_else(|| {
            release["html_url"]
                .as_str()
                .unwrap_or("https://github.com/aryabyte21/conductor/releases/latest")
                .to_string()
        });

    let release_notes = release["body"].as_str().unwrap_or("").to_string();
    let published_at = release["published_at"].as_str().unwrap_or("").to_string();
    let update_available = version_is_newer(&current_version, &latest_version);

    Ok(UpdateInfo {
        current_version,
        latest_version,
        download_url,
        release_notes,
        published_at,
        update_available,
    })
}
