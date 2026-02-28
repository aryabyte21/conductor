use crate::clients::ClientAdapter;
use crate::config::McpServerConfig;
use crate::config::{backup, normalizer, serializer};
use anyhow::Result;
use std::path::PathBuf;

pub struct JetBrainsAdapter;

impl JetBrainsAdapter {
    /// JetBrains stores MCP config in the most recent IDE's config directory.
    /// We search for common JetBrains IDEs on macOS.
    fn get_config_path() -> Option<PathBuf> {
        let home = dirs::home_dir()?;
        let app_support = home
            .join("Library")
            .join("Application Support")
            .join("JetBrains");

        if !app_support.exists() {
            return None;
        }

        // Look for the most recent IDE config directory
        let ide_prefixes = [
            "IntelliJIdea",
            "WebStorm",
            "PyCharm",
            "GoLand",
            "RustRover",
            "CLion",
            "Rider",
            "PhpStorm",
            "DataGrip",
        ];

        let mut latest_path: Option<PathBuf> = None;
        let mut latest_version: String = String::new();

        if let Ok(entries) = std::fs::read_dir(&app_support) {
            for entry in entries.flatten() {
                let name = entry.file_name().to_string_lossy().to_string();
                for prefix in &ide_prefixes {
                    if name.starts_with(prefix) {
                        let version = name.trim_start_matches(prefix).to_string();
                        if version > latest_version {
                            let mcp_path = entry.path().join("options").join("mcp.xml");
                            latest_version = version;
                            latest_path = Some(mcp_path);
                        }
                    }
                }
            }
        }

        latest_path
    }
}

impl ClientAdapter for JetBrainsAdapter {
    fn id(&self) -> &str {
        "jetbrains"
    }

    fn display_name(&self) -> &str {
        "JetBrains IDE"
    }

    fn icon(&self) -> &str {
        "jetbrains"
    }

    fn detect(&self) -> bool {
        if let Some(path) = Self::get_config_path() {
            return path.exists();
        }
        // Check if any JetBrains IDE is installed
        let apps = [
            "/Applications/IntelliJ IDEA.app",
            "/Applications/WebStorm.app",
            "/Applications/PyCharm.app",
            "/Applications/GoLand.app",
            "/Applications/RustRover.app",
            "/Applications/CLion.app",
            "/Applications/Rider.app",
            "/Applications/PhpStorm.app",
        ];
        apps.iter().any(|app| std::path::Path::new(app).exists())
    }

    fn config_path(&self) -> Option<PathBuf> {
        Self::get_config_path()
    }

    fn read_servers(&self) -> Result<Vec<McpServerConfig>> {
        let path = Self::get_config_path()
            .ok_or_else(|| anyhow::anyhow!("Cannot determine config path for JetBrains IDE"))?;
        if !path.exists() {
            return Ok(Vec::new());
        }
        let content = std::fs::read_to_string(&path)?;
        normalizer::parse_client_config("jetbrains", &content)
    }

    fn write_servers(
        &self,
        servers: &[McpServerConfig],
        existing_content: Option<&str>,
    ) -> Result<()> {
        let path = Self::get_config_path()
            .ok_or_else(|| anyhow::anyhow!("Cannot determine config path for JetBrains IDE"))?;

        // Read existing servers to preserve client-specific ones
        let conductor_names: std::collections::HashSet<&str> =
            servers.iter().map(|s| s.name.as_str()).collect();

        let mut all_servers: Vec<McpServerConfig> = Vec::new();

        // First, add existing servers not managed by Conductor
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
        if let Some(ref content) = current_content {
            if let Ok(existing_servers) = normalizer::parse_client_config("jetbrains", content) {
                for s in existing_servers {
                    if !conductor_names.contains(s.name.as_str()) {
                        all_servers.push(s);
                    }
                }
            }
        }

        // Then add Conductor servers
        all_servers.extend(servers.iter().cloned());

        let output = serializer::serialize_to_client_format("jetbrains", &all_servers, None)?;

        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }

        backup::atomic_write(&path, &output)?;
        Ok(())
    }
}
