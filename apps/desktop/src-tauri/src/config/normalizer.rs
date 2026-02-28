use crate::config::{McpServerConfig, TransportType};
use anyhow::{Context, Result};
use std::collections::HashMap;

/// Parse a client's raw config file content and extract MCP server configurations.
pub fn parse_client_config(client_id: &str, raw: &str) -> Result<Vec<McpServerConfig>> {
    match client_id {
        "claude-desktop" | "cursor" | "windsurf" | "claude-code" => {
            parse_mcp_servers_json(raw, client_id)
        }
        "vscode" => parse_vscode_config(raw),
        "vscode-mcp" => parse_vscode_mcp_json(raw),
        "zed" => parse_zed_config(raw),
        "jetbrains" => parse_jetbrains_config(raw),
        "codex" => parse_codex_config(raw),
        _ => Err(anyhow::anyhow!("Unknown client: {}", client_id)),
    }
}

/// Parse standard JSON format with top-level "mcpServers" key.
/// Used by Claude Desktop, Cursor, Windsurf, Claude Code.
fn parse_mcp_servers_json(raw: &str, source: &str) -> Result<Vec<McpServerConfig>> {
    let value: serde_json::Value =
        serde_json::from_str(raw).context("Failed to parse JSON config")?;

    let servers_obj = value
        .get("mcpServers")
        .and_then(|v| v.as_object())
        .cloned()
        .unwrap_or_default();

    let mut servers = Vec::new();
    for (name, server_val) in servers_obj {
        let server = json_value_to_server(&name, &server_val, source)?;
        servers.push(server);
    }

    Ok(servers)
}

/// Parse VS Code settings.json with nested "mcp" -> "servers" key.
fn parse_vscode_config(raw: &str) -> Result<Vec<McpServerConfig>> {
    let value: serde_json::Value =
        serde_json::from_str(raw).context("Failed to parse VS Code JSON config")?;

    // VS Code stores MCP servers under "mcp" -> "servers"
    let servers_obj = value
        .get("mcp")
        .and_then(|mcp| mcp.get("servers"))
        .and_then(|v| v.as_object())
        .cloned()
        .unwrap_or_default();

    let mut servers = Vec::new();
    for (name, server_val) in servers_obj {
        let server = json_value_to_server(&name, &server_val, "vscode")?;
        servers.push(server);
    }

    Ok(servers)
}

/// Parse VS Code mcp.json with top-level "servers" key.
fn parse_vscode_mcp_json(raw: &str) -> Result<Vec<McpServerConfig>> {
    let value: serde_json::Value =
        serde_json::from_str(raw).context("Failed to parse VS Code mcp.json config")?;

    let servers_obj = value
        .get("servers")
        .and_then(|v| v.as_object())
        .cloned()
        .unwrap_or_default();

    let mut servers = Vec::new();
    for (name, server_val) in servers_obj {
        let server = json_value_to_server(&name, &server_val, "vscode")?;
        servers.push(server);
    }

    Ok(servers)
}

/// Parse Zed editor settings.json with "context_servers" key.
/// Zed wraps the command in a nested object structure.
fn parse_zed_config(raw: &str) -> Result<Vec<McpServerConfig>> {
    let value: serde_json::Value =
        serde_json::from_str(raw).context("Failed to parse Zed JSON config")?;

    let servers_obj = value
        .get("context_servers")
        .and_then(|v| v.as_object())
        .cloned()
        .unwrap_or_default();

    let mut servers = Vec::new();
    for (name, server_val) in servers_obj {
        // Zed format: { "command": { "path": "cmd", "args": [...], "env": {...} } }
        // or { "command": "cmd", "args": [...] }
        let (command, args, env) = if let Some(cmd_obj) = server_val.get("command") {
            if let Some(cmd_str) = cmd_obj.as_str() {
                let args = server_val
                    .get("args")
                    .and_then(|a| a.as_array())
                    .map(|arr| {
                        arr.iter()
                            .filter_map(|v| v.as_str().map(|s| s.to_string()))
                            .collect()
                    })
                    .unwrap_or_default();
                let env = extract_env_map(server_val.get("env"));
                (Some(cmd_str.to_string()), args, env)
            } else if let Some(cmd_obj) = cmd_obj.as_object() {
                let path = cmd_obj
                    .get("path")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();
                let args = cmd_obj
                    .get("args")
                    .and_then(|a| a.as_array())
                    .map(|arr| {
                        arr.iter()
                            .filter_map(|v| v.as_str().map(|s| s.to_string()))
                            .collect()
                    })
                    .unwrap_or_default();
                let env = extract_env_map(cmd_obj.get("env"));
                (Some(path), args, env)
            } else {
                (None, Vec::new(), HashMap::new())
            }
        } else {
            // Fallback: try top-level command/args
            let cmd = server_val
                .get("command")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            let args = server_val
                .get("args")
                .and_then(|a| a.as_array())
                .map(|arr| {
                    arr.iter()
                        .filter_map(|v| v.as_str().map(|s| s.to_string()))
                        .collect()
                })
                .unwrap_or_default();
            let env = extract_env_map(server_val.get("env"));
            (cmd, args, env)
        };

        let transport = if server_val.get("url").is_some() {
            TransportType::Sse
        } else {
            TransportType::Stdio
        };

        servers.push(McpServerConfig {
            id: uuid::Uuid::new_v4().to_string(),
            name: name.clone(),
            enabled: true,
            transport,
            command,
            args,
            env,
            url: server_val
                .get("url")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string()),
            secret_env_keys: Vec::new(),
            icon_url: None,
            tags: Vec::new(),
            source: Some("zed".to_string()),
            registry_id: None,
            display_name: None,
            description: None,
            created_at: None,
            updated_at: None,
        });
    }

    Ok(servers)
}

/// Parse JetBrains MCP XML configuration.
fn parse_jetbrains_config(raw: &str) -> Result<Vec<McpServerConfig>> {
    let doc = roxmltree::Document::parse(raw).context("Failed to parse JetBrains XML config")?;

    let mut servers = Vec::new();

    // JetBrains MCP config is stored in XML format
    // Look for <mcpServers> or <server> elements
    for node in doc.descendants() {
        if node.tag_name().name() == "serverConfiguration"
            || node.tag_name().name() == "server"
            || node.tag_name().name() == "mcpServer"
        {
            let name = node.attribute("name").unwrap_or("unnamed").to_string();
            let command = node.attribute("command").map(|s| s.to_string());
            let args_str = node.attribute("args").unwrap_or("");
            let args: Vec<String> = if args_str.is_empty() {
                Vec::new()
            } else {
                args_str.split_whitespace().map(|s| s.to_string()).collect()
            };

            let mut env = HashMap::new();
            for child in node.children() {
                if child.tag_name().name() == "env" || child.tag_name().name() == "envs" {
                    for env_node in child.children() {
                        if let (Some(key), Some(val)) =
                            (env_node.attribute("name"), env_node.attribute("value"))
                        {
                            env.insert(key.to_string(), val.to_string());
                        }
                    }
                }
            }

            let transport = if node.attribute("url").is_some() {
                TransportType::Sse
            } else {
                TransportType::Stdio
            };

            servers.push(McpServerConfig {
                id: uuid::Uuid::new_v4().to_string(),
                name,
                enabled: node
                    .attribute("enabled")
                    .map(|v| v == "true")
                    .unwrap_or(true),
                transport,
                command,
                args,
                env,
                url: node.attribute("url").map(|s| s.to_string()),
                secret_env_keys: Vec::new(),
                icon_url: None,
                tags: Vec::new(),
                source: Some("jetbrains".to_string()),
                registry_id: None,
                display_name: None,
                description: None,
                created_at: None,
                updated_at: None,
            });
        }
    }

    Ok(servers)
}

/// Parse Codex TOML configuration.
/// Supports both formats:
/// - Named subtables: [mcp_servers.name] (official Codex format)
/// - Array of tables: [[mcp_servers]] with name field (legacy)
fn parse_codex_config(raw: &str) -> Result<Vec<McpServerConfig>> {
    let value: toml_edit::DocumentMut = raw.parse().context("Failed to parse Codex TOML config")?;

    let mut servers = Vec::new();

    // Try named subtables first: [mcp_servers.server-name]
    if let Some(mcp_item) = value.get("mcp_servers") {
        if let Some(mcp_table) = mcp_item.as_table() {
            // Check if this is a table of subtables (named format) vs other
            let has_subtables = mcp_table
                .iter()
                .any(|(_, v)| v.is_table() || v.is_inline_table());
            if has_subtables {
                for (name, server_item) in mcp_table.iter() {
                    if let Some(table) = server_item.as_table() {
                        let server = parse_codex_server_table(name, table);
                        servers.push(server);
                    } else if let Some(table) = server_item.as_inline_table() {
                        // Handle inline tables too
                        let server = parse_codex_server_inline(name, table);
                        servers.push(server);
                    }
                }
                if !servers.is_empty() {
                    return Ok(servers);
                }
            }
        }

        // Fallback: array of tables [[mcp_servers]]
        if let Some(arr) = mcp_item.as_array_of_tables() {
            for table in arr {
                let name = table
                    .get("name")
                    .and_then(|v| v.as_str())
                    .unwrap_or("unnamed")
                    .to_string();
                let server = parse_codex_server_table(&name, table);
                servers.push(server);
            }
        }
    }

    Ok(servers)
}

/// Parse a single Codex server from a TOML table.
fn parse_codex_server_table(name: &str, table: &toml_edit::Table) -> McpServerConfig {
    let command = table
        .get("command")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let args = table
        .get("args")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(|s| s.to_string()))
                .collect()
        })
        .unwrap_or_default();

    let mut env = HashMap::new();
    if let Some(env_table) = table.get("env").and_then(|v| v.as_inline_table()) {
        for (key, val) in env_table.iter() {
            if let Some(val_str) = val.as_str() {
                env.insert(key.to_string(), val_str.to_string());
            }
        }
    } else if let Some(env_table) = table.get("env").and_then(|v| v.as_table()) {
        for (key, val) in env_table.iter() {
            if let Some(val_str) = val.as_str() {
                env.insert(key.to_string(), val_str.to_string());
            }
        }
    }

    let transport = if table.get("url").is_some() {
        TransportType::Sse
    } else {
        TransportType::Stdio
    };

    McpServerConfig {
        id: uuid::Uuid::new_v4().to_string(),
        name: name.to_string(),
        enabled: table
            .get("enabled")
            .and_then(|v| v.as_bool())
            .unwrap_or(true),
        transport,
        command,
        args,
        env,
        url: table
            .get("url")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string()),
        secret_env_keys: Vec::new(),
        icon_url: None,
        tags: Vec::new(),
        source: Some("codex".to_string()),
        registry_id: None,
        display_name: None,
        description: None,
        created_at: None,
        updated_at: None,
    }
}

/// Parse a single Codex server from a TOML inline table.
fn parse_codex_server_inline(name: &str, table: &toml_edit::InlineTable) -> McpServerConfig {
    let command = table
        .get("command")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let args = table
        .get("args")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(|s| s.to_string()))
                .collect()
        })
        .unwrap_or_default();

    let mut env = HashMap::new();
    if let Some(env_table) = table.get("env").and_then(|v| v.as_inline_table()) {
        for (key, val) in env_table.iter() {
            if let Some(val_str) = val.as_str() {
                env.insert(key.to_string(), val_str.to_string());
            }
        }
    }

    McpServerConfig {
        id: uuid::Uuid::new_v4().to_string(),
        name: name.to_string(),
        enabled: table
            .get("enabled")
            .and_then(|v| v.as_bool())
            .unwrap_or(true),
        transport: if table.get("url").is_some() {
            TransportType::Sse
        } else {
            TransportType::Stdio
        },
        command,
        args,
        env,
        url: table
            .get("url")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string()),
        secret_env_keys: Vec::new(),
        icon_url: None,
        tags: Vec::new(),
        source: Some("codex".to_string()),
        registry_id: None,
        display_name: None,
        description: None,
        created_at: None,
        updated_at: None,
    }
}

/// Convert a JSON value into an McpServerConfig.
fn json_value_to_server(
    name: &str,
    value: &serde_json::Value,
    source: &str,
) -> Result<McpServerConfig> {
    let command = value
        .get("command")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let args = value
        .get("args")
        .and_then(|a| a.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(|s| s.to_string()))
                .collect()
        })
        .unwrap_or_default();

    let env = extract_env_map(value.get("env"));

    let url = value
        .get("url")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let transport = if url.is_some() {
        if value
            .get("transport")
            .and_then(|v| v.as_str())
            .map(|s| s == "streamable-http")
            .unwrap_or(false)
        {
            TransportType::StreamableHttp
        } else {
            TransportType::Sse
        }
    } else {
        TransportType::Stdio
    };

    let disabled = value
        .get("disabled")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);

    Ok(McpServerConfig {
        id: uuid::Uuid::new_v4().to_string(),
        name: name.to_string(),
        enabled: !disabled,
        transport,
        command,
        args,
        env,
        url,
        secret_env_keys: Vec::new(),
        icon_url: None,
        tags: Vec::new(),
        source: Some(source.to_string()),
        registry_id: None,
        display_name: None,
        description: None,
        created_at: None,
        updated_at: None,
    })
}

/// Extract environment variables from a JSON Value.
fn extract_env_map(env_val: Option<&serde_json::Value>) -> HashMap<String, String> {
    let mut env = HashMap::new();
    if let Some(obj) = env_val.and_then(|v| v.as_object()) {
        for (key, val) in obj {
            if let Some(val_str) = val.as_str() {
                env.insert(key.clone(), val_str.to_string());
            } else {
                env.insert(key.clone(), val.to_string());
            }
        }
    }
    env
}
