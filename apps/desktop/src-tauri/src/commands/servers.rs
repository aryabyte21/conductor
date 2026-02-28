use crate::config::{self, McpServerConfig, TransportType, log_activity};
use serde::Deserialize;
use std::collections::HashMap;

fn now_iso() -> String {
    chrono::Utc::now().to_rfc3339()
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddServerRequest {
    pub name: String,
    #[serde(default)]
    pub display_name: Option<String>,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub transport: Option<TransportType>,
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
    pub registry_id: Option<String>,
}

#[tauri::command]
pub async fn add_server(request: AddServerRequest) -> Result<McpServerConfig, String> {
    let mut cfg = config::read_config().map_err(|e| e.to_string())?;

    if cfg.servers.iter().any(|s| s.name == request.name) {
        return Err(format!("Server with name '{}' already exists", request.name));
    }

    let transport = request.transport.unwrap_or_else(|| {
        if request.url.is_some() {
            TransportType::Sse
        } else {
            TransportType::Stdio
        }
    });

    let ts = now_iso();
    let server = McpServerConfig {
        id: uuid::Uuid::new_v4().to_string(),
        name: request.name,
        display_name: request.display_name,
        description: request.description,
        enabled: true,
        transport,
        command: request.command,
        args: request.args,
        env: request.env,
        url: request.url,
        secret_env_keys: request.secret_env_keys,
        icon_url: request.icon_url,
        tags: request.tags,
        source: Some("conductor".to_string()),
        registry_id: request.registry_id,
        created_at: Some(ts.clone()),
        updated_at: Some(ts),
    };

    cfg.servers.push(server.clone());
    config::write_config(&cfg).map_err(|e| e.to_string())?;

    log_activity("add", &format!("Added server {}", server.name), None, None, Some(server.id.clone()));

    Ok(server)
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateServerRequest {
    #[serde(default)]
    pub display_name: Option<String>,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub transport: Option<TransportType>,
    #[serde(default)]
    pub command: Option<String>,
    #[serde(default)]
    pub args: Option<Vec<String>>,
    #[serde(default)]
    pub env: Option<HashMap<String, String>>,
    #[serde(default)]
    pub url: Option<String>,
    #[serde(default)]
    pub secret_env_keys: Option<Vec<String>>,
    #[serde(default)]
    pub icon_url: Option<String>,
    #[serde(default)]
    pub enabled: Option<bool>,
}

#[tauri::command]
pub async fn update_server(server_id: String, request: UpdateServerRequest) -> Result<McpServerConfig, String> {
    let mut cfg = config::read_config().map_err(|e| e.to_string())?;

    let server = cfg
        .servers
        .iter_mut()
        .find(|s| s.id == server_id)
        .ok_or_else(|| format!("Server with id '{}' not found", server_id))?;

    // For optional string fields, empty string means "clear the field"
    if let Some(dn) = request.display_name {
        server.display_name = if dn.is_empty() { None } else { Some(dn) };
    }
    if let Some(desc) = request.description {
        server.description = if desc.is_empty() { None } else { Some(desc) };
    }
    if let Some(t) = request.transport {
        server.transport = t;
    }
    if let Some(cmd) = request.command {
        server.command = if cmd.is_empty() { None } else { Some(cmd) };
    }
    if let Some(a) = request.args {
        server.args = a;
    }
    if let Some(e) = request.env {
        server.env = e;
    }
    if let Some(u) = request.url {
        server.url = if u.is_empty() { None } else { Some(u) };
    }
    if let Some(sek) = request.secret_env_keys {
        server.secret_env_keys = sek;
    }
    if let Some(iu) = request.icon_url {
        server.icon_url = if iu.is_empty() { None } else { Some(iu) };
    }
    if let Some(en) = request.enabled {
        server.enabled = en;
    }

    server.updated_at = Some(now_iso());

    let updated = server.clone();
    config::write_config(&cfg).map_err(|e| e.to_string())?;

    Ok(updated)
}

#[tauri::command]
pub async fn delete_server(server_id: String) -> Result<(), String> {
    let mut cfg = config::read_config().map_err(|e| e.to_string())?;

    let original_len = cfg.servers.len();
    cfg.servers.retain(|s| s.id != server_id);

    if cfg.servers.len() == original_len {
        return Err(format!("Server with id '{}' not found", server_id));
    }

    for sync_cfg in &mut cfg.sync {
        sync_cfg.server_ids.retain(|sid| *sid != server_id);
    }

    config::write_config(&cfg).map_err(|e| e.to_string())?;

    log_activity("delete", &format!("Deleted server {}", server_id), None, None, Some(server_id));

    Ok(())
}

#[tauri::command]
pub async fn toggle_server(server_id: String, enabled: bool) -> Result<McpServerConfig, String> {
    let mut cfg = config::read_config().map_err(|e| e.to_string())?;

    let server = cfg
        .servers
        .iter_mut()
        .find(|s| s.id == server_id)
        .ok_or_else(|| format!("Server with id '{}' not found", server_id))?;

    server.enabled = enabled;
    server.updated_at = Some(now_iso());
    let updated = server.clone();
    config::write_config(&cfg).map_err(|e| e.to_string())?;

    let action = if enabled { "Enabled" } else { "Disabled" };
    log_activity("add", &format!("{} server {}", action, updated.name), None, None, Some(updated.id.clone()));

    Ok(updated)
}
