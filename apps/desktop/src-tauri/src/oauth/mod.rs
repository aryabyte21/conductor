use anyhow::{Context, Result};
use axum::extract::Query;
use axum::response::Html;
use axum::routing::get;
use axum::Router;
use std::collections::HashMap;
use std::sync::Arc;
use tauri::Emitter;
use tokio::sync::oneshot;
use tokio::time::{timeout, Duration};

/// Start a temporary OAuth callback server on a random port.
/// Returns the authorization URL that the caller should open in a browser.
/// The server listens for the callback, stores tokens in keychain,
/// emits a Tauri event, and shuts down after callback or 5-minute timeout.
pub async fn start_oauth_server(
    app_handle: tauri::AppHandle,
    server_id: &str,
    provider: &str,
) -> Result<String> {
    // Bind to a random available port
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
        .await
        .context("Failed to bind to random port")?;
    let port = listener
        .local_addr()
        .context("Failed to get local address")?
        .port();

    let redirect_uri = format!("http://localhost:{}/callback", port);

    // Build the authorization URL based on the provider
    let auth_url = build_auth_url(provider, &redirect_uri)?;

    let server_id_owned = server_id.to_string();
    let provider_owned = provider.to_string();

    // Create a shutdown channel
    let (shutdown_tx, shutdown_rx) = oneshot::channel::<()>();
    let shutdown_tx = Arc::new(tokio::sync::Mutex::new(Some(shutdown_tx)));

    let server_id_for_handler = server_id_owned.clone();
    let provider_for_handler = provider_owned.clone();
    let app_handle_for_handler = app_handle.clone();
    let shutdown_for_handler = shutdown_tx.clone();

    // Build the axum router with a single callback route
    let app = Router::new().route(
        "/callback",
        get(move |query: Query<HashMap<String, String>>| {
            let server_id = server_id_for_handler.clone();
            let provider = provider_for_handler.clone();
            let app_handle = app_handle_for_handler.clone();
            let shutdown = shutdown_for_handler.clone();

            async move {
                let result = handle_callback(&server_id, &provider, &query, &app_handle).await;

                // Trigger shutdown after handling the callback
                if let Some(tx) = shutdown.lock().await.take() {
                    let _ = tx.send(());
                }

                match result {
                    Ok(()) => Html(success_html()),
                    Err(e) => Html(error_html(&e.to_string())),
                }
            }
        }),
    );

    // Spawn the server with a 5-minute timeout
    tokio::spawn(async move {
        let server = axum::serve(listener, app);

        let graceful = server.with_graceful_shutdown(async {
            let _ = shutdown_rx.await;
        });

        // 5-minute timeout — pass the future itself, not an awaited value
        let _ = timeout(Duration::from_secs(300), graceful).await;
    });

    Ok(auth_url)
}

/// Build the authorization URL for the given provider.
fn build_auth_url(provider: &str, redirect_uri: &str) -> Result<String> {
    let encoded_redirect = urlencoding::encode(redirect_uri);

    let url = match provider {
        "github" => {
            format!(
                "https://github.com/login/oauth/authorize?client_id=conductor_app&redirect_uri={}&scope=repo",
                encoded_redirect
            )
        }
        "google" => {
            format!(
                "https://accounts.google.com/o/oauth2/v2/auth?client_id=conductor_app&redirect_uri={}&response_type=code&scope=openid+email+profile",
                encoded_redirect
            )
        }
        "notion" => {
            format!(
                "https://api.notion.com/v1/oauth/authorize?client_id=conductor_app&redirect_uri={}&response_type=code",
                encoded_redirect
            )
        }
        "slack" => {
            format!(
                "https://slack.com/oauth/v2/authorize?client_id=conductor_app&redirect_uri={}&scope=chat:write",
                encoded_redirect
            )
        }
        "linear" => {
            format!(
                "https://linear.app/oauth/authorize?client_id=conductor_app&redirect_uri={}&response_type=code&scope=read",
                encoded_redirect
            )
        }
        _ => {
            // Generic OAuth URL — the provider name is used as a base URL hint
            format!(
                "https://{}/oauth/authorize?client_id=conductor_app&redirect_uri={}&response_type=code",
                provider, encoded_redirect
            )
        }
    };

    Ok(url)
}

/// Handle the OAuth callback: extract code/token, store in keychain, emit event.
async fn handle_callback(
    server_id: &str,
    provider: &str,
    query: &HashMap<String, String>,
    app_handle: &tauri::AppHandle,
) -> Result<()> {
    // Check for error response
    if let Some(error) = query.get("error") {
        let description = query
            .get("error_description")
            .cloned()
            .unwrap_or_else(|| error.clone());
        anyhow::bail!("OAuth error: {}", description);
    }

    // Get the authorization code
    let code = query
        .get("code")
        .ok_or_else(|| anyhow::anyhow!("No authorization code in callback"))?;

    // Store the auth code as the token (in a real implementation,
    // you would exchange this for an access token)
    let token_key = format!("{}:oauth_token", server_id);
    let entry = keyring::Entry::new("conductor", &token_key)
        .context("Failed to create keyring entry")?;
    entry
        .set_password(code)
        .context("Failed to store token in keychain")?;

    // Store the provider
    let provider_key = format!("{}:oauth_provider", server_id);
    if let Ok(entry) = keyring::Entry::new("conductor", &provider_key) {
        let _ = entry.set_password(provider);
    }

    // Store expiry (default: 1 hour from now)
    let expires_at = chrono::Utc::now() + chrono::Duration::hours(1);
    let expires_key = format!("{}:oauth_expires", server_id);
    if let Ok(entry) = keyring::Entry::new("conductor", &expires_key) {
        let _ = entry.set_password(&expires_at.to_rfc3339());
    }

    // Emit Tauri event
    let _ = app_handle.emit(
        "oauth-callback-received",
        serde_json::json!({
            "serverId": server_id,
            "provider": provider,
            "success": true
        }),
    );

    Ok(())
}

fn success_html() -> String {
    r#"<!DOCTYPE html>
<html>
<head><title>Conductor - Authorization Successful</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #0a0a0a; color: #fafafa;">
  <div style="text-align: center; max-width: 400px;">
    <h1 style="color: #22c55e;">Authorization Successful</h1>
    <p>You can close this window and return to Conductor.</p>
    <script>setTimeout(() => window.close(), 3000);</script>
  </div>
</body>
</html>"#.to_string()
}

fn error_html(error: &str) -> String {
    format!(
        r#"<!DOCTYPE html>
<html>
<head><title>Conductor - Authorization Failed</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #0a0a0a; color: #fafafa;">
  <div style="text-align: center; max-width: 400px;">
    <h1 style="color: #ef4444;">Authorization Failed</h1>
    <p>{}</p>
    <p>Please close this window and try again in Conductor.</p>
  </div>
</body>
</html>"#,
        error
    )
}
