use crate::oauth;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OAuthStatus {
    pub server_id: String,
    pub authenticated: bool,
    pub provider: Option<String>,
    pub expires_at: Option<String>,
}

/// Start an OAuth flow for a server.
/// Picks a random port, starts a temporary callback server, and opens the browser.
#[tauri::command]
pub async fn start_oauth_flow(
    app_handle: tauri::AppHandle,
    server_id: String,
    provider: String,
) -> Result<String, String> {
    let auth_url = oauth::start_oauth_server(app_handle, &server_id, &provider)
        .await
        .map_err(|e| e.to_string())?;

    // Open the auth URL in the default browser
    if let Err(e) = open::that(&auth_url) {
        return Err(format!("Failed to open browser: {}", e));
    }

    Ok(auth_url)
}

/// Check the authentication status for a server.
#[tauri::command]
pub async fn check_auth_status(server_id: String) -> Result<OAuthStatus, String> {
    let authenticated = crate::oauth::get_valid_oauth_token(&server_id)
        .await
        .map(|token| token.is_some())
        .unwrap_or(false);

    let provider = if authenticated {
        let provider_key = format!("{}:oauth_provider", server_id);
        keyring::Entry::new("conductor", &provider_key)
            .ok()
            .and_then(|e| e.get_password().ok())
    } else {
        None
    };

    let expires_at = if authenticated {
        let expires_key = format!("{}:oauth_expires", server_id);
        keyring::Entry::new("conductor", &expires_key)
            .ok()
            .and_then(|e| e.get_password().ok())
    } else {
        None
    };

    Ok(OAuthStatus {
        server_id,
        authenticated,
        provider,
        expires_at,
    })
}

/// Revoke OAuth authentication for a server.
/// Cleans up all keyring entries including dynamically-registered client IDs.
#[tauri::command]
pub async fn revoke_auth(server_id: String) -> Result<(), String> {
    // Core OAuth keys
    let mut keys = vec![
        format!("{}:oauth_token", server_id),
        format!("{}:oauth_provider", server_id),
        format!("{}:oauth_expires", server_id),
        format!("{}:oauth_refresh", server_id),
    ];

    // Also clean up per-provider client credential keys that may have been
    // stored during dynamic client registration or manual configuration.
    let providers = ["GITHUB", "GOOGLE", "NOTION", "SLACK", "LINEAR"];
    for provider in &providers {
        keys.push(format!("{}:OAUTH_{}_CLIENT_ID", server_id, provider));
        keys.push(format!("{}:OAUTH_{}_CLIENT_SECRET", server_id, provider));
    }
    // Generic credential keys
    keys.push(format!("{}:OAUTH_CLIENT_ID", server_id));
    keys.push(format!("{}:OAUTH_CLIENT_SECRET", server_id));
    keys.push(format!("{}:CLIENT_ID", server_id));
    keys.push(format!("{}:CLIENT_SECRET", server_id));

    for username in &keys {
        if let Ok(entry) = keyring::Entry::new("conductor", username) {
            // Ignore errors for keys that don't exist
            let _ = entry.delete_credential();
        }
    }

    Ok(())
}
