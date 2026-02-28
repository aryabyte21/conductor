use thiserror::Error;

#[derive(Error, Debug)]
pub enum ConductorError {
    #[error("Failed to read config: {0}")]
    ConfigRead(String),

    #[error("Failed to write config: {0}")]
    ConfigWrite(String),

    #[error("Failed to parse config: {0}")]
    ConfigParse(String),

    #[error("Client not found: {0}")]
    ClientNotFound(String),

    #[error("No MCP clients detected")]
    ClientNotDetected(String),

    #[error("Server not found: {0}")]
    ServerNotFound(String),

    #[error("Server name collision: {0}")]
    ServerNameCollision(String),

    #[error("Secret access failed: {0}")]
    SecretAccess(String),

    #[error("OAuth flow failed: {0}")]
    OAuthFailed(String),

    #[error("Registry fetch failed: {0}")]
    RegistryFetch(String),

    #[error("File watcher failed: {0}")]
    WatcherFailed(String),

    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),

    #[error("Serialization error: {0}")]
    SerializationError(String),
}

impl From<serde_json::Error> for ConductorError {
    fn from(e: serde_json::Error) -> Self {
        ConductorError::SerializationError(e.to_string())
    }
}

impl From<anyhow::Error> for ConductorError {
    fn from(e: anyhow::Error) -> Self {
        ConductorError::ConfigRead(e.to_string())
    }
}

impl From<ConductorError> for String {
    fn from(e: ConductorError) -> Self {
        e.to_string()
    }
}
