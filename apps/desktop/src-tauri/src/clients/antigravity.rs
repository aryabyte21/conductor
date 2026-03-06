use crate::clients::{app_installed, ClientAdapter};
use crate::config::McpServerConfig;
use crate::config::{backup, normalizer, serializer};
use anyhow::Result;
use std::path::PathBuf;

pub struct AntigravityAdapter;

impl AntigravityAdapter {
    /// The canonical config path for writing — always mcp_config.json.
    fn mcp_json_path() -> Option<PathBuf> {
        let home = dirs::home_dir()?;
        Some(home.join(".gemini").join("antigravity").join("mcp_config.json"))
    }

    /// Config path for reading — mcp.json if it exists, else settings.json for migration.
    fn get_config_path() -> Option<PathBuf> {
        let mcp_json = Self::mcp_json_path()?;
        if mcp_json.exists() {
            return Some(mcp_json);
        }
        // Read from settings.json only as a one-time migration source
        let config_dir = dirs::config_dir()?;
        let settings = config_dir
            .join("Antigravity")
            .join("User")
            .join("settings.json");
        if settings.exists() {
            return Some(settings);
        }
        // Default write target
        Some(mcp_json)
    }

    fn is_mcp_json(path: &std::path::Path) -> bool {
        path.file_name()
            .and_then(|f| f.to_str())
            .map(|f| f == "mcp_config.json" || f == "mcp.json")
            .unwrap_or(false)
    }
}

impl ClientAdapter for AntigravityAdapter {
    fn id(&self) -> &str {
        "antigravity"
    }

    fn display_name(&self) -> &str {
        "Antigravity"
    }

    fn icon(&self) -> &str {
        "antigravity"
    }

    fn detect(&self) -> bool {
        if let Some(path) = Self::get_config_path() {
            if path.exists() {
                return true;
            }
        }
        app_installed("Antigravity.app", "antigravity")
    }

    fn config_path(&self) -> Option<PathBuf> {
        Self::get_config_path()
    }

    fn read_servers(&self) -> Result<Vec<McpServerConfig>> {
        let path = Self::get_config_path()
            .ok_or_else(|| anyhow::anyhow!("Cannot determine config path for Antigravity"))?;
        if !path.exists() {
            return Ok(Vec::new());
        }
        let content = std::fs::read_to_string(&path)?;
        // Standard format (mcpServers) for mcp_config.json
        if Self::is_mcp_json(&path) {
            normalizer::parse_client_config("claude-desktop", &content)
        } else {
            normalizer::parse_client_config("vscode", &content)
        }
    }

    fn write_servers(
        &self,
        servers: &[McpServerConfig],
        existing_content: Option<&str>,
        previously_synced_names: &[String],
    ) -> Result<()> {
        // Always write to mcp.json — Antigravity warns against MCP in settings.json
        let path = Self::mcp_json_path()
            .ok_or_else(|| anyhow::anyhow!("Cannot determine config path for Antigravity"))?;

        // Read existing mcp.json content (ignore settings.json for write merge)
        let current_content = match existing_content {
            Some(c) => Some(c.to_string()),
            None => {
                if path.exists() {
                    Some(std::fs::read_to_string(&path)?)
                } else {
                    None
                }
            }
        };

        let output =
            serializer::serialize_to_client_format("antigravity", servers, current_content.as_deref(), previously_synced_names)?;

        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }

        backup::atomic_write(&path, &output)?;
        Ok(())
    }
}
