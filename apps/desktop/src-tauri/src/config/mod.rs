pub mod backup;
pub mod normalizer;
pub mod serializer;

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum TransportType {
    Stdio,
    Sse,
    StreamableHttp,
}

impl Default for TransportType {
    fn default() -> Self {
        TransportType::Stdio
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct McpServerConfig {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub display_name: Option<String>,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub enabled: bool,
    #[serde(default)]
    pub transport: TransportType,
    #[serde(default)]
    pub command: Option<String>,
    #[serde(default)]
    pub args: Vec<String>,
    #[serde(default)]
    pub env: HashMap<String, String>,
    #[serde(default)]
    pub url: Option<String>,
    #[serde(default)]
    pub secret_env_keys: Vec<String>,
    #[serde(default)]
    pub icon_url: Option<String>,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub source: Option<String>,
    #[serde(default)]
    pub registry_id: Option<String>,
    #[serde(default)]
    pub created_at: Option<String>,
    #[serde(default)]
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivityEntry {
    pub id: String,
    #[serde(rename = "type")]
    pub entry_type: String,
    pub description: String,
    pub timestamp: String,
    #[serde(default)]
    pub details: Option<String>,
    #[serde(default)]
    pub client_id: Option<String>,
    #[serde(default)]
    pub server_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    #[serde(default = "default_true")]
    pub launch_at_login: bool,
    #[serde(default)]
    pub start_minimized: bool,
    #[serde(default = "default_true")]
    pub auto_sync: bool,
    #[serde(default = "default_sync_delay")]
    pub sync_delay: u32,
    #[serde(default = "default_true")]
    pub notify_external: bool,
    #[serde(default = "default_backup_retention")]
    pub backup_retention: u32,
    #[serde(default = "default_true")]
    pub sync_notifications: bool,
    #[serde(default = "default_true")]
    pub error_notifications: bool,
}

fn default_true() -> bool { true }
fn default_sync_delay() -> u32 { 5 }
fn default_backup_retention() -> u32 { 30 }

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            launch_at_login: false,
            start_minimized: false,
            auto_sync: true,
            sync_delay: 5,
            notify_external: true,
            backup_retention: 30,
            sync_notifications: true,
            error_notifications: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct McpConfig {
    pub servers: Vec<McpServerConfig>,
    #[serde(default)]
    pub sync: Vec<ClientSyncConfig>,
    #[serde(default)]
    pub activity: Vec<ActivityEntry>,
    #[serde(default)]
    pub settings: AppSettings,
    #[serde(default)]
    pub stacks: Vec<SavedStack>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SavedStack {
    pub id: String,
    pub json: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClientSyncConfig {
    pub client_id: String,
    #[serde(default)]
    pub enabled: bool,
    #[serde(default)]
    pub server_ids: Vec<String>,
    #[serde(default)]
    pub last_synced: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncResult {
    pub client_id: String,
    pub success: bool,
    #[serde(default)]
    pub servers_written: usize,
    #[serde(default)]
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportResult {
    pub added: usize,
    pub skipped: usize,
    pub servers: Vec<McpServerConfig>,
}

/// Returns the path to the Conductor master config file.
pub fn master_config_path() -> anyhow::Result<std::path::PathBuf> {
    let home = dirs::home_dir().ok_or_else(|| anyhow::anyhow!("Cannot determine home directory"))?;
    let config_dir = home.join(".conductor");
    if !config_dir.exists() {
        std::fs::create_dir_all(&config_dir)?;
    }
    Ok(config_dir.join("config.json"))
}

/// Reads the master config from disk, returning a default if it doesn't exist.
pub fn read_config() -> anyhow::Result<McpConfig> {
    let path = master_config_path()?;
    if !path.exists() {
        return Ok(McpConfig::default());
    }
    let content = std::fs::read_to_string(&path)?;
    let config: McpConfig = serde_json::from_str(&content)?;
    Ok(config)
}

/// Writes the master config to disk with atomic write and backup.
pub fn write_config(config: &McpConfig) -> anyhow::Result<()> {
    let path = master_config_path()?;
    let content = serde_json::to_string_pretty(config)?;
    backup::atomic_write(&path, &content)?;
    Ok(())
}

/// Appends an activity entry to the config, capping at 200 entries.
pub fn log_activity(
    entry_type: &str,
    description: &str,
    details: Option<String>,
    client_id: Option<String>,
    server_id: Option<String>,
) {
    if let Ok(mut cfg) = read_config() {
        let entry = ActivityEntry {
            id: uuid::Uuid::new_v4().to_string(),
            entry_type: entry_type.to_string(),
            description: description.to_string(),
            timestamp: chrono::Utc::now().to_rfc3339(),
            details,
            client_id,
            server_id,
        };
        cfg.activity.push(entry);
        // Cap at 200 entries, remove oldest first
        if cfg.activity.len() > 200 {
            let drain = cfg.activity.len() - 200;
            cfg.activity.drain(..drain);
        }
        let _ = write_config(&cfg);
    }
}
