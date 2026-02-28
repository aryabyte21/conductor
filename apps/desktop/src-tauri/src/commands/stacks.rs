use crate::config::{self, McpServerConfig};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct McpStack {
    pub name: String,
    pub description: String,
    pub servers: Vec<McpServerConfig>,
    pub tags: Vec<String>,
    pub version: String,
    pub created_at: String,
}

/// Export selected servers as a shareable stack.
#[tauri::command]
pub async fn export_stack(
    name: String,
    description: String,
    server_ids: Vec<String>,
    tags: Vec<String>,
) -> Result<String, String> {
    let cfg = config::read_config().map_err(|e| e.to_string())?;

    let servers: Vec<McpServerConfig> = cfg
        .servers
        .iter()
        .filter(|s| server_ids.contains(&s.id))
        .cloned()
        .map(|mut s| {
            // Strip secrets and sensitive env vars before export
            for key in &s.secret_env_keys {
                s.env.remove(key);
            }
            // Generate fresh IDs for exported servers
            s.id = uuid::Uuid::new_v4().to_string();
            s.source = Some("stack".to_string());
            s
        })
        .collect();

    if servers.is_empty() {
        return Err("No servers found with the given IDs".to_string());
    }

    let stack = McpStack {
        name,
        description,
        servers,
        tags,
        version: "1.0.0".to_string(),
        created_at: chrono::Utc::now().to_rfc3339(),
    };

    serde_json::to_string_pretty(&stack).map_err(|e| e.to_string())
}

/// Import a stack from JSON, adding all servers to the master config.
#[tauri::command]
pub async fn import_stack(stack_json: String) -> Result<McpStack, String> {
    let stack: McpStack =
        serde_json::from_str(&stack_json).map_err(|e| format!("Invalid stack JSON: {}", e))?;

    let mut cfg = config::read_config().map_err(|e| e.to_string())?;

    for mut server in stack.servers.clone() {
        // Generate fresh ID to avoid collisions
        server.id = uuid::Uuid::new_v4().to_string();
        server.source = Some("stack".to_string());

        // Check for name collision, append suffix if needed
        let original_name = server.name.clone();
        let mut counter = 1;
        while cfg.servers.iter().any(|s| s.name == server.name) {
            server.name = format!("{} ({})", original_name, counter);
            counter += 1;
        }

        cfg.servers.push(server);
    }

    config::write_config(&cfg).map_err(|e| e.to_string())?;

    Ok(stack)
}

/// Save an exported stack JSON to the master config for persistence.
#[tauri::command]
pub async fn save_exported_stack(stack_json: String) -> Result<config::SavedStack, String> {
    let mut cfg = config::read_config().map_err(|e| e.to_string())?;

    let saved = config::SavedStack {
        id: uuid::Uuid::new_v4().to_string(),
        json: stack_json,
        created_at: chrono::Utc::now().to_rfc3339(),
    };

    cfg.stacks.push(saved.clone());
    config::write_config(&cfg).map_err(|e| e.to_string())?;

    Ok(saved)
}

/// Get all saved exported stacks.
#[tauri::command]
pub async fn get_saved_stacks() -> Result<Vec<config::SavedStack>, String> {
    let cfg = config::read_config().map_err(|e| e.to_string())?;
    Ok(cfg.stacks)
}

/// Delete a saved stack by ID.
#[tauri::command]
pub async fn delete_saved_stack(stack_id: String) -> Result<(), String> {
    let mut cfg = config::read_config().map_err(|e| e.to_string())?;
    cfg.stacks.retain(|s| s.id != stack_id);
    config::write_config(&cfg).map_err(|e| e.to_string())?;
    Ok(())
}

/// Fetch a stack from a URL and return it.
#[tauri::command]
pub async fn get_stack_from_url(url: String) -> Result<McpStack, String> {
    let client = reqwest::Client::new();
    let response = client
        .get(&url)
        .header("Accept", "application/json")
        .send()
        .await
        .map_err(|e| format!("Failed to fetch stack: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Failed to fetch stack: HTTP {}", response.status()));
    }

    let body = response.text().await.map_err(|e| e.to_string())?;
    let stack: McpStack =
        serde_json::from_str(&body).map_err(|e| format!("Invalid stack JSON: {}", e))?;

    Ok(stack)
}
