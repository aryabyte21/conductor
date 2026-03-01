use crate::config::{self, McpServerConfig, TransportType};
use serde::{Deserialize, Serialize};

/// Raw server from the Smithery API — lenient deserialization.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RawRegistryServer {
    #[serde(default)]
    pub qualified_name: Option<String>,
    #[serde(default)]
    pub display_name: Option<String>,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub icon_url: Option<String>,
    #[serde(default)]
    pub homepage: Option<String>,
    #[serde(default)]
    pub use_count: Option<usize>,
    #[serde(default)]
    pub verified: Option<bool>,
    #[serde(default)]
    pub created_at: Option<String>,
    #[serde(default)]
    pub connections: Vec<RegistryConnection>,
}

/// Server sent to the frontend — all fields present with sensible defaults.
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RegistryServer {
    pub id: String,
    pub qualified_name: String,
    pub display_name: String,
    pub description: String,
    #[serde(default)]
    pub icon_url: Option<String>,
    #[serde(default)]
    pub homepage: Option<String>,
    #[serde(default)]
    pub verified: bool,
    #[serde(default)]
    pub use_count: usize,
    #[serde(default)]
    pub created_at: Option<String>,
    #[serde(default)]
    pub connections: Vec<RegistryConnection>,
}

impl From<RawRegistryServer> for RegistryServer {
    fn from(raw: RawRegistryServer) -> Self {
        let qn = raw.qualified_name.unwrap_or_default();
        let dn = raw
            .display_name
            .unwrap_or_else(|| qn.split('/').last().unwrap_or(&qn).to_string());
        RegistryServer {
            id: qn.clone(),
            qualified_name: qn,
            display_name: dn,
            description: raw
                .description
                .unwrap_or_else(|| "No description".to_string()),
            icon_url: raw.icon_url,
            homepage: raw.homepage,
            verified: raw.verified.unwrap_or(false),
            use_count: raw.use_count.unwrap_or(0),
            created_at: raw.created_at,
            connections: raw.connections,
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RegistryConnection {
    #[serde(rename = "type")]
    pub connection_type: Option<String>,
    pub url: Option<String>,
    pub config_schema: Option<serde_json::Value>,
}

/// Wrapper for the Smithery search response (may contain a `servers` array).
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RegistrySearchResponse {
    pub servers: Vec<RawRegistryServer>,
}

/// Get popular servers from the Smithery registry (no search query).
#[tauri::command]
pub async fn get_popular_servers() -> Result<Vec<RegistryServer>, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| e.to_string())?;
    fetch_servers(&client, "https://registry.smithery.ai/servers?pageSize=20").await
}

/// Search the Smithery MCP server registry.
///
/// Uses a dual-search strategy to work around Smithery's purely semantic search:
///   1. Semantic search via `?q=` for conceptual matches
///   2. Namespace search via `?namespace=` for exact name matches
///
/// Results are merged, deduplicated, and re-ranked so that servers whose name
/// contains the query string appear first.
#[tauri::command]
pub async fn search_registry(query: String) -> Result<Vec<RegistryServer>, String> {
    let encoded_query = urlencoding::encode(&query);
    let query_lower = query.trim().to_lowercase();

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| e.to_string())?;

    // Fire both searches concurrently
    let semantic_url = format!(
        "https://registry.smithery.ai/servers?q={}&pageSize=20",
        encoded_query
    );
    let namespace_url = format!(
        "https://registry.smithery.ai/servers?namespace={}&pageSize=10",
        encoded_query
    );

    let (semantic_result, namespace_result) =
        tokio::join!(fetch_servers(&client, &semantic_url), fetch_servers(&client, &namespace_url));

    let mut seen = std::collections::HashSet::new();
    let mut servers: Vec<RegistryServer> = Vec::new();

    // Merge — namespace hits first (they are exact name matches)
    if let Ok(ns) = namespace_result {
        for s in ns {
            if seen.insert(s.id.clone()) {
                servers.push(s);
            }
        }
    }
    if let Ok(sem) = semantic_result {
        for s in sem {
            if seen.insert(s.id.clone()) {
                servers.push(s);
            }
        }
    }

    if servers.is_empty() {
        return Ok(servers);
    }

    // Re-rank: name/displayName containing the query > everything else.
    // Within each tier, sort by use_count descending so popular servers rank first.
    servers.sort_by(|a, b| {
        let a_match = name_match_score(&a.qualified_name, &a.display_name, &query_lower);
        let b_match = name_match_score(&b.qualified_name, &b.display_name, &query_lower);
        b_match
            .cmp(&a_match)
            .then_with(|| b.use_count.cmp(&a.use_count))
    });

    Ok(servers)
}

/// Score how well a server's name matches the query.
///   3 = exact match on qualifiedName or displayName
///   2 = qualifiedName or displayName contains query
///   1 = qualifiedName or displayName starts with query
///   0 = no name match (semantic only)
fn name_match_score(qualified_name: &str, display_name: &str, query_lower: &str) -> u8 {
    let qn = qualified_name.to_lowercase();
    let dn = display_name.to_lowercase();

    // Check the slug part of the qualified name (after the last '/')
    let slug = qn.rsplit('/').next().unwrap_or(&qn);

    if slug == query_lower || dn == query_lower {
        3
    } else if slug.starts_with(query_lower) || dn.starts_with(query_lower) {
        2
    } else if qn.contains(query_lower) || dn.contains(query_lower) {
        1
    } else {
        0
    }
}

/// Fetch and parse servers from a Smithery API URL.
async fn fetch_servers(
    client: &reqwest::Client,
    url: &str,
) -> Result<Vec<RegistryServer>, String> {
    let response = client
        .get(url)
        .header("Accept", "application/json")
        .send()
        .await
        .map_err(|e| format!("Failed to query registry: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Registry returned status {}", response.status()));
    }

    let body = response.text().await.map_err(|e| e.to_string())?;

    let raw_servers: Vec<RawRegistryServer> =
        match serde_json::from_str::<RegistrySearchResponse>(&body) {
            Ok(resp) => resp.servers,
            Err(_) => serde_json::from_str(&body)
                .map_err(|e| format!("Failed to parse registry response: {}", e))?,
        };

    Ok(raw_servers.into_iter().map(RegistryServer::from).collect())
}

/// Install a server from the Smithery registry by its qualified name.
#[tauri::command]
pub async fn install_from_registry(registry_id: String) -> Result<McpServerConfig, String> {
    // Fetch server details from registry
    let encoded_id = urlencoding::encode(&registry_id);
    let url = format!("https://registry.smithery.ai/servers/{}", encoded_id);

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| e.to_string())?;
    let response = client
        .get(&url)
        .header("Accept", "application/json")
        .send()
        .await
        .map_err(|e| format!("Failed to fetch server details: {}", e))?;

    if !response.status().is_success() {
        return Err(format!(
            "Registry returned status {} for server '{}'",
            response.status(),
            registry_id
        ));
    }

    let raw_info: RawRegistryServer = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse server details: {}", e))?;

    let server_info = RegistryServer::from(raw_info);

    let name = if server_info.display_name.is_empty() {
        server_info
            .qualified_name
            .split('/')
            .last()
            .unwrap_or(&registry_id)
            .to_string()
    } else {
        server_info.display_name.clone()
    };

    // Determine transport and connection details
    let (transport, command, args, server_url) = if let Some(conn) = server_info.connections.first()
    {
        match conn.connection_type.as_deref() {
            Some("stdio") => {
                let pkg_name = &server_info.qualified_name;
                let pkg = if pkg_name.is_empty() {
                    &registry_id
                } else {
                    pkg_name
                };
                (
                    TransportType::Stdio,
                    Some("npx".to_string()),
                    vec![
                        "-y".to_string(),
                        "@smithery/cli@latest".to_string(),
                        "run".to_string(),
                        pkg.to_string(),
                    ],
                    None,
                )
            }
            Some("sse") | Some("streamable-http") => {
                let t = if conn.connection_type.as_deref() == Some("streamable-http") {
                    TransportType::StreamableHttp
                } else {
                    TransportType::Sse
                };
                (t, None, Vec::new(), conn.url.clone())
            }
            _ => {
                let pkg_name = &server_info.qualified_name;
                let pkg = if pkg_name.is_empty() {
                    &registry_id
                } else {
                    pkg_name
                };
                (
                    TransportType::Stdio,
                    Some("npx".to_string()),
                    vec![
                        "-y".to_string(),
                        "@smithery/cli@latest".to_string(),
                        "run".to_string(),
                        pkg.to_string(),
                    ],
                    None,
                )
            }
        }
    } else {
        (
            TransportType::Stdio,
            Some("npx".to_string()),
            vec![
                "-y".to_string(),
                "@smithery/cli@latest".to_string(),
                "run".to_string(),
                registry_id.clone(),
            ],
            None,
        )
    };

    // Check for name collision
    let mut cfg = config::read_config().map_err(|e| e.to_string())?;

    let final_name = if cfg.servers.iter().any(|s| s.name == name) {
        format!("{} (registry)", name)
    } else {
        name
    };

    let ts = chrono::Utc::now().to_rfc3339();
    let description = if server_info.description == "No description" {
        None
    } else {
        Some(server_info.description.clone())
    };

    let server = McpServerConfig {
        id: uuid::Uuid::new_v4().to_string(),
        name: final_name.clone(),
        display_name: Some(server_info.display_name.clone()),
        description,
        enabled: true,
        transport,
        command,
        args,
        env: std::collections::HashMap::new(),
        url: server_url,
        secret_env_keys: Vec::new(),
        icon_url: server_info.icon_url,
        tags: Vec::new(),
        source: Some("registry".to_string()),
        registry_id: Some(registry_id),
        created_at: Some(ts.clone()),
        updated_at: Some(ts),
    };

    cfg.servers.push(server.clone());
    config::write_config(&cfg).map_err(|e| e.to_string())?;

    Ok(server)
}
