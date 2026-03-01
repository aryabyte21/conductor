use crate::config::{McpServerConfig, TransportType};
use anyhow::{Context, Result};

/// Resolve the full path to `npx` once per process. Falls back to `"npx"`.
fn find_npx_path() -> &'static str {
    static NPX_PATH: std::sync::OnceLock<String> = std::sync::OnceLock::new();
    NPX_PATH.get_or_init(|| {
        std::process::Command::new("which")
            .arg("npx")
            .output()
            .ok()
            .filter(|o| o.status.success())
            .and_then(|o| String::from_utf8(o.stdout).ok())
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .unwrap_or_else(|| "npx".to_string())
    })
}

/// Serialize servers into the format expected by a specific client.
/// If `existing_content` is provided, the serializer preserves non-MCP settings.
/// `previously_synced_names` is the cumulative set of all server names Conductor
/// has ever synced to this client — used to remove orphaned servers during merge.
pub fn serialize_to_client_format(
    client_id: &str,
    servers: &[McpServerConfig],
    existing_content: Option<&str>,
    previously_synced_names: &[String],
) -> Result<String> {
    match client_id {
        "claude-desktop" | "cursor" | "windsurf" | "claude-code" => {
            serialize_standard_json(client_id, servers, existing_content, previously_synced_names)
        }
        "vscode" => serialize_vscode(servers, existing_content, previously_synced_names),
        "vscode-mcp" => serialize_vscode_mcp(servers, existing_content, previously_synced_names),
        "zed" => serialize_zed(servers, existing_content, previously_synced_names),
        "jetbrains" => serialize_jetbrains(servers),
        "codex" => serialize_codex(servers, existing_content, previously_synced_names),
        _ => Err(anyhow::anyhow!("Unknown client format: {}", client_id)),
    }
}

/// Standard JSON format with top-level "mcpServers" key.
/// Merges Conductor servers into existing content, preserving client-specific servers.
/// Removes orphans: servers previously synced by Conductor but no longer expected.
fn serialize_standard_json(
    client_id: &str,
    servers: &[McpServerConfig],
    existing_content: Option<&str>,
    previously_synced_names: &[String],
) -> Result<String> {
    let mut root: serde_json::Value = match existing_content {
        Some(content) => serde_json::from_str(content).map_err(|e| {
            anyhow::anyhow!(
                "Client config has invalid JSON ({}). Fix it manually or delete and re-sync.",
                e
            )
        })?,
        None => serde_json::json!({}),
    };

    // Claude Code and VS Code support native `headers`; others need mcp-remote proxy.
    let use_proxy = !matches!(client_id, "claude-code");
    let conductor_servers = servers_to_json_object(servers, use_proxy);
    let conductor_names_lower: std::collections::HashSet<String> =
        servers.iter().map(|s| s.name.to_lowercase()).collect();
    let prev_synced_lower: std::collections::HashSet<String> =
        previously_synced_names.iter().map(|s| s.to_lowercase()).collect();

    // Start with existing servers that are NOT managed by Conductor.
    // Skip orphans: servers previously synced by Conductor but no longer expected.
    let mut merged = serde_json::Map::new();
    if let Some(existing) = root.get("mcpServers").and_then(|v| v.as_object()) {
        for (name, value) in existing {
            let name_lower = name.to_lowercase();
            let is_conductor = conductor_names_lower.contains(&name_lower);
            let was_conductor = prev_synced_lower.contains(&name_lower);
            if !is_conductor && !was_conductor {
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
fn serialize_vscode(servers: &[McpServerConfig], existing_content: Option<&str>, previously_synced_names: &[String]) -> Result<String> {
    let mut root: serde_json::Value = match existing_content {
        Some(content) => serde_json::from_str(content).map_err(|e| {
            anyhow::anyhow!(
                "VS Code settings has invalid JSON ({}). Fix it manually or delete and re-sync.",
                e
            )
        })?,
        None => serde_json::json!({}),
    };

    let conductor_servers = servers_to_json_object(servers, false); // VS Code supports native headers
    let conductor_names_lower: std::collections::HashSet<String> =
        servers.iter().map(|s| s.name.to_lowercase()).collect();
    let prev_synced_lower: std::collections::HashSet<String> =
        previously_synced_names.iter().map(|s| s.to_lowercase()).collect();

    // Ensure "mcp" object exists and preserve other mcp settings
    if root.get("mcp").is_none() {
        root["mcp"] = serde_json::json!({});
    }

    // Merge: keep truly user-added servers, skip Conductor-managed orphans
    let mut merged = serde_json::Map::new();
    if let Some(existing) = root
        .get("mcp")
        .and_then(|m| m.get("servers"))
        .and_then(|v| v.as_object())
    {
        for (name, value) in existing {
            let name_lower = name.to_lowercase();
            let is_conductor = conductor_names_lower.contains(&name_lower);
            let was_conductor = prev_synced_lower.contains(&name_lower);
            if !is_conductor && !was_conductor {
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
    previously_synced_names: &[String],
) -> Result<String> {
    let mut root: serde_json::Value = match existing_content {
        Some(content) => serde_json::from_str(content).map_err(|e| {
            anyhow::anyhow!(
                "VS Code mcp.json has invalid JSON ({}). Fix it manually or delete and re-sync.",
                e
            )
        })?,
        None => serde_json::json!({}),
    };

    let conductor_servers = servers_to_json_object(servers, false); // VS Code supports native headers
    let conductor_names_lower: std::collections::HashSet<String> =
        servers.iter().map(|s| s.name.to_lowercase()).collect();
    let prev_synced_lower: std::collections::HashSet<String> =
        previously_synced_names.iter().map(|s| s.to_lowercase()).collect();

    let mut merged = serde_json::Map::new();
    if let Some(existing) = root.get("servers").and_then(|v| v.as_object()) {
        for (name, value) in existing {
            let name_lower = name.to_lowercase();
            let is_conductor = conductor_names_lower.contains(&name_lower);
            let was_conductor = prev_synced_lower.contains(&name_lower);
            if !is_conductor && !was_conductor {
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
fn serialize_zed(servers: &[McpServerConfig], existing_content: Option<&str>, previously_synced_names: &[String]) -> Result<String> {
    let mut root: serde_json::Value = match existing_content {
        Some(content) => serde_json::from_str(content).map_err(|e| {
            anyhow::anyhow!(
                "Zed settings has invalid JSON ({}). Fix it manually or delete and re-sync.",
                e
            )
        })?,
        None => serde_json::json!({}),
    };

    let conductor_names_lower: std::collections::HashSet<String> =
        servers.iter().map(|s| s.name.to_lowercase()).collect();
    let prev_synced_lower: std::collections::HashSet<String> =
        previously_synced_names.iter().map(|s| s.to_lowercase()).collect();

    // Start with existing truly user-added servers, skip Conductor-managed orphans
    let mut context_servers = serde_json::Map::new();
    if let Some(existing) = root.get("context_servers").and_then(|v| v.as_object()) {
        for (name, value) in existing {
            let name_lower = name.to_lowercase();
            let is_conductor = conductor_names_lower.contains(&name_lower);
            let was_conductor = prev_synced_lower.contains(&name_lower);
            if !is_conductor && !was_conductor {
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
        } else if let Some(ref url) = server.url {
            // URL server — Zed doesn't support the MCP-level OAuth protocol,
            // so always wrap URL servers via mcp-remote which handles auth
            // negotiation transparently.
            let mut args = vec![
                "-y".to_string(),
                "mcp-remote".to_string(),
                url.clone(),
            ];

            if let Some(token) = server.env.get("OAUTH_TOKEN") {
                if !token.trim().is_empty() {
                    args.push("--header".to_string());
                    args.push(format!("Authorization:Bearer {}", token));
                }
            }

            server_obj.insert(
                "command".to_string(),
                serde_json::json!(find_npx_path()),
            );
            server_obj.insert("args".to_string(), serde_json::json!(args));
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

        // JetBrains doesn't support MCP-level OAuth for URL servers, so
        // always wrap URL servers via mcp-remote which handles auth transparently.
        let is_url_server = server.url.is_some()
            && matches!(
                server.transport,
                TransportType::Sse | TransportType::StreamableHttp
            );

        if is_url_server {
            let url = server.url.as_deref().unwrap_or_default();
            elem.push_attribute(("command", find_npx_path()));
            let mut args_str = format!("-y mcp-remote {}", url);
            if let Some(token) = server.env.get("OAUTH_TOKEN") {
                if !token.trim().is_empty() {
                    args_str.push_str(&format!(" --header Authorization:Bearer {}", token));
                }
            }
            elem.push_attribute(("args", args_str.as_str()));
        } else if server.transport == TransportType::Stdio {
            if let Some(ref cmd) = server.command {
                elem.push_attribute(("command", cmd.as_str()));
            }
            if !server.args.is_empty() {
                elem.push_attribute(("args", server.args.join(" ").as_str()));
            }
        } else if let Some(ref url) = server.url {
            elem.push_attribute(("url", url.as_str()));
        }

        let enabled_str = server.enabled.to_string();
        elem.push_attribute(("enabled", enabled_str.as_str()));

        // Only emit <envs> for stdio servers (URL servers are wrapped via mcp-remote).
        let has_env = !is_url_server && !server.env.is_empty();

        if !has_env {
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
fn serialize_codex(servers: &[McpServerConfig], existing_content: Option<&str>, previously_synced_names: &[String]) -> Result<String> {
    let mut doc: toml_edit::DocumentMut = match existing_content {
        Some(content) => content.parse().map_err(|e| {
            anyhow::anyhow!(
                "Codex config has invalid TOML ({}). Fix it manually or delete and re-sync.",
                e
            )
        })?,
        None => toml_edit::DocumentMut::new(),
    };

    let conductor_names_lower: std::collections::HashSet<String> =
        servers.iter().map(|s| s.name.to_lowercase()).collect();
    let prev_synced_lower: std::collections::HashSet<String> =
        previously_synced_names.iter().map(|s| s.to_lowercase()).collect();

    // Preserve truly user-added servers, skip Conductor-managed orphans
    let mut mcp_table = toml_edit::Table::new();
    if let Some(existing) = doc.get("mcp_servers").and_then(|v| v.as_table()) {
        for (name, value) in existing.iter() {
            let name_lower = name.to_lowercase();
            let is_conductor = conductor_names_lower.contains(&name_lower);
            let was_conductor = prev_synced_lower.contains(&name_lower);
            if !is_conductor && !was_conductor {
                mcp_table.insert(name, value.clone());
            }
        }
    }

    // Remove old mcp_servers and rebuild with merged content
    doc.remove("mcp_servers");

    // Add Conductor servers
    for server in servers {
        let mut table = toml_edit::Table::new();

        if server.url.is_some() {
            // URL-based server: Codex doesn't support the MCP-level OAuth
            // protocol, so we always wrap URL servers via `mcp-remote` which
            // handles the OAuth dance transparently.  If we have an explicit
            // OAUTH_TOKEN, pass it as a --header arg so mcp-remote includes it
            // without needing to negotiate.
            let url = server.url.as_deref().unwrap_or_default();
            let npx = find_npx_path();
            table.insert("command", toml_edit::value(npx));

            let mut args_array = toml_edit::Array::new();
            args_array.push("-y");
            args_array.push("mcp-remote");
            args_array.push(url);

            if let Some(token) = server.env.get("OAUTH_TOKEN") {
                if !token.trim().is_empty() {
                    args_array.push("--header");
                    args_array.push(format!("Authorization:Bearer {}", token).as_str());
                }
            }
            table.insert("args", toml_edit::value(args_array));
        } else {
            // Stdio server
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
///
/// When `use_proxy_for_auth` is **false** (Claude Code, VS Code), URL servers
/// with an `OAUTH_TOKEN` emit `headers.Authorization` natively.
///
/// When `use_proxy_for_auth` is **true** (Cursor, Claude Desktop, Windsurf),
/// URL servers with an `OAUTH_TOKEN` are wrapped as stdio via `mcp-remote`
/// so that the auth header is passed through the proxy subprocess.  URL servers
/// *without* an OAuth token are still emitted as plain URLs.
fn servers_to_json_object(
    servers: &[McpServerConfig],
    use_proxy_for_auth: bool,
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
                // `env` is only meaningful for stdio servers (subprocess env vars).
                if !server.env.is_empty() {
                    obj.insert("env".to_string(), serde_json::json!(server.env));
                }
            }
            TransportType::Sse | TransportType::StreamableHttp => {
                let has_oauth = server
                    .env
                    .get("OAUTH_TOKEN")
                    .map(|t| !t.trim().is_empty())
                    .unwrap_or(false);

                if use_proxy_for_auth && has_oauth {
                    // Client doesn't support native headers — wrap via mcp-remote.
                    let url = server.url.as_deref().unwrap_or_default();
                    let token = server.env.get("OAUTH_TOKEN").unwrap();
                    obj.insert(
                        "command".to_string(),
                        serde_json::json!(find_npx_path()),
                    );
                    obj.insert(
                        "args".to_string(),
                        serde_json::json!([
                            "-y",
                            "mcp-remote",
                            url,
                            "--header",
                            format!("Authorization:Bearer {}", token),
                        ]),
                    );
                } else {
                    // Client supports native headers (or no auth needed).
                    if let Some(ref url) = server.url {
                        obj.insert("url".to_string(), serde_json::json!(url));
                    }
                    if server.transport == TransportType::StreamableHttp {
                        obj.insert(
                            "transport".to_string(),
                            serde_json::json!("streamable-http"),
                        );
                    }
                    // Promote OAUTH_TOKEN to Authorization header for clients
                    // that support it (Claude Code, VS Code).
                    if has_oauth {
                        let token = server.env.get("OAUTH_TOKEN").unwrap();
                        obj.insert(
                            "headers".to_string(),
                            serde_json::json!({
                                "Authorization": format!("Bearer {}", token)
                            }),
                        );
                    }
                }
            }
        }

        if !server.enabled {
            obj.insert("disabled".to_string(), serde_json::json!(true));
        }

        map.insert(server.name.clone(), serde_json::Value::Object(obj));
    }

    map
}
