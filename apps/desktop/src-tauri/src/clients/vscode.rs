use crate::clients::ClientAdapter;
use crate::config::McpServerConfig;
use crate::config::{backup, normalizer, serializer};
use anyhow::Result;
use std::path::PathBuf;

pub struct VSCodeAdapter;

impl VSCodeAdapter {
    fn get_config_path() -> Option<PathBuf> {
        let home = dirs::home_dir()?;
        // VS Code uses a dedicated mcp.json file (not settings.json)
        let mcp_json = home
            .join("Library")
            .join("Application Support")
            .join("Code")
            .join("User")
            .join("mcp.json");
        if mcp_json.exists() {
            return Some(mcp_json);
        }
        // Fallback to legacy settings.json location
        let settings = home
            .join("Library")
            .join("Application Support")
            .join("Code")
            .join("User")
            .join("settings.json");
        if settings.exists() {
            return Some(settings);
        }
        // Default to mcp.json
        Some(mcp_json)
    }

    fn is_mcp_json(path: &std::path::Path) -> bool {
        path.file_name()
            .and_then(|f| f.to_str())
            .map(|f| f == "mcp.json")
            .unwrap_or(false)
    }
}

impl ClientAdapter for VSCodeAdapter {
    fn id(&self) -> &str {
        "vscode"
    }

    fn display_name(&self) -> &str {
        "VS Code"
    }

    fn icon(&self) -> &str {
        "vscode"
    }

    fn detect(&self) -> bool {
        if let Some(path) = Self::get_config_path() {
            if path.exists() {
                return true;
            }
        }
        std::path::Path::new("/Applications/Visual Studio Code.app").exists()
    }

    fn config_path(&self) -> Option<PathBuf> {
        Self::get_config_path()
    }

    fn read_servers(&self) -> Result<Vec<McpServerConfig>> {
        let path = Self::get_config_path()
            .ok_or_else(|| anyhow::anyhow!("Cannot determine config path for VS Code"))?;
        if !path.exists() {
            return Ok(Vec::new());
        }
        let content = std::fs::read_to_string(&path)?;
        if Self::is_mcp_json(&path) {
            normalizer::parse_client_config("vscode-mcp", &content)
        } else {
            normalizer::parse_client_config("vscode", &content)
        }
    }

    fn write_servers(
        &self,
        servers: &[McpServerConfig],
        existing_content: Option<&str>,
    ) -> Result<()> {
        let path = Self::get_config_path()
            .ok_or_else(|| anyhow::anyhow!("Cannot determine config path for VS Code"))?;

        let format = if Self::is_mcp_json(&path) {
            "vscode-mcp"
        } else {
            "vscode"
        };

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
            serializer::serialize_to_client_format(format, servers, current_content.as_deref())?;

        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }

        backup::atomic_write(&path, &output)?;
        Ok(())
    }
}
