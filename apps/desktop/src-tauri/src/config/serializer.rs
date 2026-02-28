use crate::config::{McpServerConfig, TransportType};
use anyhow::{Context, Result};

/// Serialize servers into the format expected by a specific client.
/// If `existing_content` is provided, the serializer preserves non-MCP settings.
pub fn serialize_to_client_format(
    client_id: &str,
    servers: &[McpServerConfig],
    existing_content: Option<&str>,
) -> Result<String> {
    match client_id {
        "claude-desktop" | "cursor" | "windsurf" | "claude-code" => {
            serialize_standard_json(servers, existing_content)
        }
        "vscode" => serialize_vscode(servers, existing_content),
        "vscode-mcp" => serialize_vscode_mcp(servers, existing_content),
        "zed" => serialize_zed(servers, existing_content),
        "jetbrains" => serialize_jetbrains(servers),
        "codex" => serialize_codex(servers, existing_content),
        _ => Err(anyhow::anyhow!("Unknown client format: {}", client_id)),
    }
}

/// Standard JSON format with top-level "mcpServers" key.
/// Merges Conductor servers into existing content, preserving client-specific servers.
fn serialize_standard_json(
    servers: &[McpServerConfig],
    existing_content: Option<&str>,
) -> Result<String> {
    let mut root: serde_json::Value = if let Some(content) = existing_content {
        serde_json::from_str(content).unwrap_or_else(|_| serde_json::json!({}))
    } else {
        serde_json::json!({})
    };

    let conductor_servers = servers_to_json_object(servers);
    let conductor_names: std::collections::HashSet<&str> =
        servers.iter().map(|s| s.name.as_str()).collect();

    // Start with existing servers that are NOT managed by Conductor
    let mut merged = serde_json::Map::new();
    if let Some(existing) = root.get("mcpServers").and_then(|v| v.as_object()) {
        for (name, value) in existing {
            if !conductor_names.contains(name.as_str()) {
                merged.insert(name.clone(), value.clone());
            }
        }
    }
    // Add/overwrite Conductor-managed servers
    for (name, value) in conductor_servers {
        merged.insert(name, value);
    }

    root["mcpServers"] = serde_json::Value::Object(merged);

    serde_json::to_string_pretty(&root).context("Failed to serialize JSON")
}

/// VS Code format: preserves all non-mcp settings, merges into "mcp" -> "servers".
fn serialize_vscode(servers: &[McpServerConfig], existing_content: Option<&str>) -> Result<String> {
    let mut root: serde_json::Value = if let Some(content) = existing_content {
        serde_json::from_str(content).unwrap_or_else(|_| serde_json::json!({}))
    } else {
        serde_json::json!({})
    };

    let conductor_servers = servers_to_json_object(servers);
    let conductor_names: std::collections::HashSet<&str> =
        servers.iter().map(|s| s.name.as_str()).collect();

    // Ensure "mcp" object exists and preserve other mcp settings
    if root.get("mcp").is_none() {
        root["mcp"] = serde_json::json!({});
    }

    // Merge: keep client-specific servers, add/overwrite Conductor servers
    let mut merged = serde_json::Map::new();
    if let Some(existing) = root
        .get("mcp")
        .and_then(|m| m.get("servers"))
        .and_then(|v| v.as_object())
    {
        for (name, value) in existing {
            if !conductor_names.contains(name.as_str()) {
                merged.insert(name.clone(), value.clone());
            }
        }
    }
    for (name, value) in conductor_servers {
        merged.insert(name, value);
    }

    root["mcp"]["servers"] = serde_json::Value::Object(merged);

    serde_json::to_string_pretty(&root).context("Failed to serialize VS Code JSON")
}

/// VS Code mcp.json format: top-level "servers" key.
fn serialize_vscode_mcp(
    servers: &[McpServerConfig],
    existing_content: Option<&str>,
) -> Result<String> {
    let mut root: serde_json::Value = if let Some(content) = existing_content {
        serde_json::from_str(content).unwrap_or_else(|_| serde_json::json!({}))
    } else {
        serde_json::json!({})
    };

    let conductor_servers = servers_to_json_object(servers);
    let conductor_names: std::collections::HashSet<&str> =
        servers.iter().map(|s| s.name.as_str()).collect();

    let mut merged = serde_json::Map::new();
    if let Some(existing) = root.get("servers").and_then(|v| v.as_object()) {
        for (name, value) in existing {
            if !conductor_names.contains(name.as_str()) {
                merged.insert(name.clone(), value.clone());
            }
        }
    }
    for (name, value) in conductor_servers {
        merged.insert(name, value);
    }

    root["servers"] = serde_json::Value::Object(merged);

    serde_json::to_string_pretty(&root).context("Failed to serialize VS Code mcp.json")
}

/// Zed format: flat command structure. Merges with existing context_servers.
fn serialize_zed(servers: &[McpServerConfig], existing_content: Option<&str>) -> Result<String> {
    let mut root: serde_json::Value = if let Some(content) = existing_content {
        serde_json::from_str(content).unwrap_or_else(|_| serde_json::json!({}))
    } else {
        serde_json::json!({})
    };

    let conductor_names: std::collections::HashSet<&str> =
        servers.iter().map(|s| s.name.as_str()).collect();

    // Start with existing client-specific servers
    let mut context_servers = serde_json::Map::new();
    if let Some(existing) = root.get("context_servers").and_then(|v| v.as_object()) {
        for (name, value) in existing {
            if !conductor_names.contains(name.as_str()) {
                context_servers.insert(name.clone(), value.clone());
            }
        }
    }

    // Add Conductor servers
    for server in servers {
        if !server.enabled {
            continue;
        }

        let mut server_obj = serde_json::Map::new();

        if server.transport == TransportType::Stdio {
            if let Some(ref cmd) = server.command {
                server_obj.insert("command".to_string(), serde_json::json!(cmd));
            }
            if !server.args.is_empty() {
                server_obj.insert("args".to_string(), serde_json::json!(server.args));
            }
            if !server.env.is_empty() {
                server_obj.insert("env".to_string(), serde_json::json!(server.env));
            }
        } else {
            if let Some(ref url) = server.url {
                server_obj.insert("url".to_string(), serde_json::json!(url));
            }
        }

        context_servers.insert(server.name.clone(), serde_json::Value::Object(server_obj));
    }

    root["context_servers"] = serde_json::Value::Object(context_servers);

    serde_json::to_string_pretty(&root).context("Failed to serialize Zed JSON")
}

/// JetBrains XML format.
fn serialize_jetbrains(servers: &[McpServerConfig]) -> Result<String> {
    use quick_xml::events::{BytesEnd, BytesStart, Event};
    use quick_xml::Writer;
    use std::io::Cursor;

    let mut writer = Writer::new_with_indent(Cursor::new(Vec::new()), b' ', 2);

    // Write XML declaration
    writer
        .write_event(Event::Decl(quick_xml::events::BytesDecl::new(
            "1.0",
            Some("UTF-8"),
            None,
        )))
        .context("Failed to write XML declaration")?;

    // Root element
    let mut root = BytesStart::new("mcpSettings");
    root.push_attribute(("version", "1"));
    writer
        .write_event(Event::Start(root))
        .context("Failed to write root element")?;

    // Servers element
    writer
        .write_event(Event::Start(BytesStart::new("servers")))
        .context("Failed to write servers element")?;

    for server in servers {
        let mut elem = BytesStart::new("serverConfiguration");
        elem.push_attribute(("name", server.name.as_str()));
        if let Some(ref cmd) = server.command {
            elem.push_attribute(("command", cmd.as_str()));
        }
        if !server.args.is_empty() {
            elem.push_attribute(("args", server.args.join(" ").as_str()));
        }
        if let Some(ref url) = server.url {
            elem.push_attribute(("url", url.as_str()));
        }
        let enabled_str = server.enabled.to_string();
        elem.push_attribute(("enabled", enabled_str.as_str()));

        if server.env.is_empty() {
            writer
                .write_event(Event::Empty(elem))
                .context("Failed to write server element")?;
        } else {
            writer
                .write_event(Event::Start(elem))
                .context("Failed to write server start")?;

            writer
                .write_event(Event::Start(BytesStart::new("envs")))
                .context("Failed to write envs element")?;

            for (key, val) in &server.env {
                let mut env_elem = BytesStart::new("env");
                env_elem.push_attribute(("name", key.as_str()));
                env_elem.push_attribute(("value", val.as_str()));
                writer
                    .write_event(Event::Empty(env_elem))
                    .context("Failed to write env element")?;
            }

            writer
                .write_event(Event::End(BytesEnd::new("envs")))
                .context("Failed to write envs end")?;
            writer
                .write_event(Event::End(BytesEnd::new("serverConfiguration")))
                .context("Failed to write server end")?;
        }
    }

    writer
        .write_event(Event::End(BytesEnd::new("servers")))
        .context("Failed to write servers end")?;
    writer
        .write_event(Event::End(BytesEnd::new("mcpSettings")))
        .context("Failed to write root end")?;

    let result = writer.into_inner().into_inner();
    String::from_utf8(result).context("Invalid UTF-8 in XML output")
}

/// Codex TOML format with [mcp_servers.name] named subtables.
/// Merges Conductor servers with existing client-specific servers.
fn serialize_codex(servers: &[McpServerConfig], existing_content: Option<&str>) -> Result<String> {
    let mut doc: toml_edit::DocumentMut = if let Some(content) = existing_content {
        content.parse().unwrap_or_default()
    } else {
        toml_edit::DocumentMut::new()
    };

    let conductor_names: std::collections::HashSet<&str> =
        servers.iter().map(|s| s.name.as_str()).collect();

    // Preserve existing servers not managed by Conductor
    let mut mcp_table = toml_edit::Table::new();
    if let Some(existing) = doc.get("mcp_servers").and_then(|v| v.as_table()) {
        for (name, value) in existing.iter() {
            if !conductor_names.contains(name) {
                mcp_table.insert(name, value.clone());
            }
        }
    }

    // Remove old mcp_servers and rebuild with merged content
    doc.remove("mcp_servers");

    // Add Conductor servers
    for server in servers {
        let mut table = toml_edit::Table::new();
        if let Some(ref cmd) = server.command {
            table.insert("command", toml_edit::value(cmd));
        }
        if !server.args.is_empty() {
            let mut args_array = toml_edit::Array::new();
            for arg in &server.args {
                args_array.push(arg.as_str());
            }
            table.insert("args", toml_edit::value(args_array));
        }
        if !server.env.is_empty() {
            let mut env_table = toml_edit::InlineTable::new();
            for (key, val) in &server.env {
                env_table.insert(key, val.as_str().into());
            }
            table.insert("env", toml_edit::value(env_table));
        }
        if let Some(ref url) = server.url {
            table.insert("url", toml_edit::value(url));
        }

        // Codex streamable HTTP auth must be expressed as HTTP headers.
        // For OAuth-backed servers synced by Conductor, promote OAUTH_TOKEN to
        // Authorization header so URL servers like Linear actually authenticate.
        if server.url.is_some() {
            if let Some(token) = server.env.get("OAUTH_TOKEN") {
                if !token.trim().is_empty() {
                    let mut headers = toml_edit::InlineTable::new();
                    headers.insert("Authorization", format!("Bearer {}", token).as_str().into());
                    table.insert("http_headers", toml_edit::value(headers));
                }
            }
        }

        if !server.enabled {
            table.insert("enabled", toml_edit::value(false));
        }

        mcp_table.insert(&server.name, toml_edit::Item::Table(table));
    }

    doc.insert("mcp_servers", toml_edit::Item::Table(mcp_table));

    Ok(doc.to_string())
}

/// Convert a slice of server configs into a JSON object for standard formats.
fn servers_to_json_object(
    servers: &[McpServerConfig],
) -> serde_json::Map<String, serde_json::Value> {
    let mut map = serde_json::Map::new();

    for server in servers {
        let mut obj = serde_json::Map::new();

        match server.transport {
            TransportType::Stdio => {
                if let Some(ref cmd) = server.command {
                    obj.insert("command".to_string(), serde_json::json!(cmd));
                }
                if !server.args.is_empty() {
                    obj.insert("args".to_string(), serde_json::json!(server.args));
                }
            }
            TransportType::Sse | TransportType::StreamableHttp => {
                if let Some(ref url) = server.url {
                    obj.insert("url".to_string(), serde_json::json!(url));
                }
                if server.transport == TransportType::StreamableHttp {
                    obj.insert(
                        "transport".to_string(),
                        serde_json::json!("streamable-http"),
                    );
                }
            }
        }

        if !server.env.is_empty() {
            obj.insert("env".to_string(), serde_json::json!(server.env));
        }

        if !server.enabled {
            obj.insert("disabled".to_string(), serde_json::json!(true));
        }

        map.insert(server.name.clone(), serde_json::Value::Object(obj));
    }

    map
}
