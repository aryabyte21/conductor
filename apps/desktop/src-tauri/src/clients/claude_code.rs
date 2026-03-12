use crate::clients::ClientAdapter;
use crate::config::McpServerConfig;
use crate::config::{backup, normalizer, serializer};
use anyhow::Result;
use std::path::PathBuf;

pub struct ClaudeCodeAdapter;

impl ClaudeCodeAdapter {
    fn get_config_path() -> Option<PathBuf> {
        let home = dirs::home_dir()?;
        // Claude Code's canonical user config is ~/.claude/settings.json.
        // The ~/.claude.json file is Claude Code's internal metadata store
        // (startup count, tips, etc.) which also supports mcpServers but is
        // NOT the intended location for user-managed server configs.
        // Writing to ~/.claude.json while settings.json also has mcpServers
        // causes duplicate server connections and startup failures.
        Some(home.join(".claude").join("settings.json"))
    }
}

impl ClientAdapter for ClaudeCodeAdapter {
    fn id(&self) -> &str {
        "claude-code"
    }

    fn display_name(&self) -> &str {
        "Claude Code"
    }

    fn icon(&self) -> &str {
        "claude-code"
    }

    fn detect(&self) -> bool {
        if let Some(path) = Self::get_config_path() {
            if path.exists() {
                return true;
            }
        }
        // Check if claude CLI is available
        which_exists("claude")
    }

    fn config_path(&self) -> Option<PathBuf> {
        Self::get_config_path()
    }

    fn read_servers(&self) -> Result<Vec<McpServerConfig>> {
        let path = Self::get_config_path()
            .ok_or_else(|| anyhow::anyhow!("Cannot determine config path for Claude Code"))?;
        if !path.exists() {
            return Ok(Vec::new());
        }
        let content = std::fs::read_to_string(&path)?;
        normalizer::parse_client_config("claude-code", &content)
    }

    fn write_servers(
        &self,
        servers: &[McpServerConfig],
        existing_content: Option<&str>,
        previously_synced_names: &[String],
    ) -> Result<()> {
        let path = Self::get_config_path()
            .ok_or_else(|| anyhow::anyhow!("Cannot determine config path for Claude Code"))?;

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

        let output = serializer::serialize_to_client_format(
            "claude-code",
            servers,
            current_content.as_deref(),
            previously_synced_names,
        )?;

        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }

        backup::atomic_write(&path, &output)?;
        Ok(())
    }
}

fn which_exists(cmd: &str) -> bool {
    std::process::Command::new("which")
        .arg(cmd)
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}
