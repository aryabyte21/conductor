use crate::clients::ClientAdapter;
use crate::config::McpServerConfig;
use crate::config::{backup, normalizer, serializer};
use anyhow::Result;
use std::path::PathBuf;

pub struct ClaudeDesktopAdapter;

impl ClaudeDesktopAdapter {
    fn get_config_path() -> Option<PathBuf> {
        let home = dirs::home_dir()?;
        let path = home
            .join("Library")
            .join("Application Support")
            .join("Claude")
            .join("claude_desktop_config.json");
        Some(path)
    }
}

impl ClientAdapter for ClaudeDesktopAdapter {
    fn id(&self) -> &str {
        "claude-desktop"
    }

    fn display_name(&self) -> &str {
        "Claude Desktop"
    }

    fn icon(&self) -> &str {
        "claude"
    }

    fn detect(&self) -> bool {
        if let Some(path) = Self::get_config_path() {
            if path.exists() {
                return true;
            }
        }
        // Also check if the app is installed
        std::path::Path::new("/Applications/Claude.app").exists()
    }

    fn config_path(&self) -> Option<PathBuf> {
        Self::get_config_path()
    }

    fn read_servers(&self) -> Result<Vec<McpServerConfig>> {
        let path = Self::get_config_path()
            .ok_or_else(|| anyhow::anyhow!("Cannot determine config path for Claude Desktop"))?;
        if !path.exists() {
            return Ok(Vec::new());
        }
        let content = std::fs::read_to_string(&path)?;
        normalizer::parse_client_config("claude-desktop", &content)
    }

    fn write_servers(
        &self,
        servers: &[McpServerConfig],
        existing_content: Option<&str>,
    ) -> Result<()> {
        let path = Self::get_config_path()
            .ok_or_else(|| anyhow::anyhow!("Cannot determine config path for Claude Desktop"))?;

        let existing = if existing_content.is_some() {
            existing_content
        } else if path.exists() {
            None // Will be read by serializer if needed
        } else {
            None
        };

        let current_content = match existing {
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
            serializer::serialize_to_client_format("claude-desktop", servers, current_content.as_deref())?;

        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }

        backup::atomic_write(&path, &output)?;
        Ok(())
    }
}
