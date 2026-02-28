pub mod antigravity;
pub mod claude_code;
pub mod claude_desktop;
pub mod codex;
pub mod cursor;
pub mod jetbrains;
pub mod vscode;
pub mod windsurf;
pub mod zed;

use crate::config::McpServerConfig;
use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// Trait for MCP client adapters that can detect, read from, and write to
/// different AI coding tool configurations.
pub trait ClientAdapter: Send + Sync {
    /// Unique identifier for this client (e.g., "claude-desktop").
    fn id(&self) -> &str;

    /// Human-readable display name (e.g., "Claude Desktop").
    fn display_name(&self) -> &str;

    /// Icon identifier for the frontend.
    fn icon(&self) -> &str;

    /// Check if this client is installed / has a config file.
    fn detect(&self) -> bool;

    /// Return the path to this client's MCP config file.
    fn config_path(&self) -> Option<PathBuf>;

    /// Read MCP server configurations from this client's config.
    fn read_servers(&self) -> Result<Vec<McpServerConfig>>;

    /// Write MCP server configurations to this client's config,
    /// optionally merging with existing content.
    fn write_servers(
        &self,
        servers: &[McpServerConfig],
        existing_content: Option<&str>,
    ) -> Result<()>;
}

/// Information about a detected client.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClientDetection {
    pub client_id: String,
    pub display_name: String,
    pub icon: String,
    pub detected: bool,
    pub config_path: Option<String>,
    pub server_count: usize,
    #[serde(default)]
    pub server_names: Vec<String>,
    #[serde(default)]
    pub last_synced_at: Option<String>,
    #[serde(default)]
    pub config_updated_at: Option<String>,
}

/// Returns all available client adapters.
pub fn get_all_adapters() -> Vec<Box<dyn ClientAdapter>> {
    vec![
        Box::new(claude_desktop::ClaudeDesktopAdapter),
        Box::new(cursor::CursorAdapter),
        Box::new(vscode::VSCodeAdapter),
        Box::new(claude_code::ClaudeCodeAdapter),
        Box::new(windsurf::WindsurfAdapter),
        Box::new(zed::ZedAdapter),
        Box::new(jetbrains::JetBrainsAdapter),
        Box::new(codex::CodexAdapter),
        Box::new(antigravity::AntigravityAdapter),
    ]
}

/// Find a specific adapter by client ID.
pub fn get_adapter(client_id: &str) -> Option<Box<dyn ClientAdapter>> {
    get_all_adapters().into_iter().find(|a| a.id() == client_id)
}
