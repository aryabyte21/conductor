use crate::config::{self, McpServerConfig};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;

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
            // Strip secrets and sensitive env vars before export.
            // This is defensive: if users forgot to mark a key as secret,
            // we still redact obvious credential-like values.
            let mut secret_keys: HashSet<String> = s.secret_env_keys.iter().cloned().collect();
            let env_keys: Vec<String> = s.env.keys().cloned().collect();
            for key in env_keys {
                let redact = secret_keys.contains(&key)
                    || looks_sensitive_env_key(&key)
                    || s.env
                        .get(&key)
                        .map(|v| looks_sensitive_env_value(v))
                        .unwrap_or(false);
                if redact {
                    s.env.remove(&key);
                    secret_keys.insert(key);
                }
            }
            s.secret_env_keys = secret_keys.into_iter().collect();
            s.secret_env_keys.sort();
            // Generate fresh IDs for exported servers
            s.id = uuid::Uuid::new_v4().to_string();
            s.source = Some("stack".to_string());
            s.registry_id = None;
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

/// Validate that a URL is safe to fetch (no SSRF to internal networks)
fn validate_url_safe(url: &str) -> Result<(), String> {
    let parsed = url::Url::parse(url).map_err(|e| format!("Invalid URL: {}", e))?;

    // Only allow HTTPS
    if parsed.scheme() != "https" {
        return Err("Only HTTPS URLs are allowed".to_string());
    }

    let host = parsed.host_str().ok_or("URL has no host")?;

    // Reject localhost and loopback
    if host == "localhost" || host == "127.0.0.1" || host == "::1" || host == "[::1]" || host == "0.0.0.0" {
        return Err("URLs pointing to localhost are not allowed".to_string());
    }

    // Reject private IP ranges
    if let Ok(ip) = host.parse::<std::net::IpAddr>() {
        let is_private = match ip {
            std::net::IpAddr::V4(v4) => {
                v4.is_loopback()
                    || v4.is_private()          // 10.x, 172.16-31.x, 192.168.x
                    || v4.is_link_local()       // 169.254.x.x
                    || v4.octets()[0] == 0      // 0.x.x.x
            }
            std::net::IpAddr::V6(v6) => {
                v6.is_loopback() || v6.is_unspecified()
            }
        };
        if is_private {
            return Err("URLs pointing to private/internal networks are not allowed".to_string());
        }
    }

    Ok(())
}

/// Fetch a stack from a URL and return it.
#[tauri::command]
pub async fn get_stack_from_url(url: String) -> Result<McpStack, String> {
    // Validate URL is safe (no SSRF)
    validate_url_safe(&url)?;

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| e.to_string())?;
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

fn looks_sensitive_env_key(key: &str) -> bool {
    let upper = key.to_ascii_uppercase();
    let sensitive_markers = [
        "SECRET",
        "TOKEN",
        "PASSWORD",
        "PRIVATE",
        "API_KEY",
        "ACCESS_KEY",
        "AUTH",
        "CREDENTIAL",
    ];
    sensitive_markers
        .iter()
        .any(|marker| upper.contains(marker))
}

fn looks_sensitive_env_value(value: &str) -> bool {
    let trimmed = value.trim();
    if trimmed.is_empty() || trimmed.len() < 20 {
        return false;
    }

    let looks_structured_secret = trimmed.starts_with("sk-")
        || trimmed.starts_with("ghp_")
        || trimmed.starts_with("github_pat_")
        || trimmed.starts_with("xox")
        || trimmed.starts_with("AIza")
        || trimmed.starts_with("ya29.")
        || trimmed.starts_with("Bearer ");

    let no_spaces = !trimmed.contains(char::is_whitespace);
    let high_entropy_hint = trimmed.chars().any(|c| c.is_ascii_digit())
        && trimmed.chars().any(|c| c.is_ascii_uppercase())
        && trimmed.chars().any(|c| c.is_ascii_lowercase());

    looks_structured_secret || (no_spaces && high_entropy_hint)
}
