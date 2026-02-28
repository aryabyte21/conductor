use crate::clients::ClientAdapter;
use crate::config::McpServerConfig;
use crate::config::{backup, normalizer, serializer};
use anyhow::Result;
use std::path::PathBuf;

pub struct ZedAdapter;

impl ZedAdapter {
    fn get_config_path() -> Option<PathBuf> {
        let home = dirs::home_dir()?;
        Some(home.join(".config").join("zed").join("settings.json"))
    }
}

impl ClientAdapter for ZedAdapter {
    fn id(&self) -> &str {
        "zed"
    }

    fn display_name(&self) -> &str {
        "Zed"
    }

    fn icon(&self) -> &str {
        "zed"
    }

    fn detect(&self) -> bool {
        if let Some(path) = Self::get_config_path() {
            if path.exists() {
                return true;
            }
        }
        std::path::Path::new("/Applications/Zed.app").exists()
    }

    fn config_path(&self) -> Option<PathBuf> {
        Self::get_config_path()
    }

    fn read_servers(&self) -> Result<Vec<McpServerConfig>> {
        let path = Self::get_config_path()
            .ok_or_else(|| anyhow::anyhow!("Cannot determine config path for Zed"))?;
        if !path.exists() {
            return Ok(Vec::new());
        }
        let content = std::fs::read_to_string(&path)?;
        normalizer::parse_client_config("zed", &content)
    }

    fn write_servers(
        &self,
        servers: &[McpServerConfig],
        existing_content: Option<&str>,
    ) -> Result<()> {
        let path = Self::get_config_path()
            .ok_or_else(|| anyhow::anyhow!("Cannot determine config path for Zed"))?;

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
            serializer::serialize_to_client_format("zed", servers, current_content.as_deref())?;

        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }

        backup::atomic_write(&path, &output)?;
        Ok(())
    }
}
