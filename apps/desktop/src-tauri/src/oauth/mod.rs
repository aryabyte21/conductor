use anyhow::{Context, Result};
use axum::extract::Query;
use axum::response::Html;
use axum::routing::get;
use axum::Router;
use chrono::{DateTime, Duration as ChronoDuration, Utc};
use serde_json::Value;
use std::collections::HashMap;
use std::sync::Arc;
use tauri::Emitter;
use tokio::sync::oneshot;
use tokio::time::{timeout, Duration};
use url::Url;

#[derive(Debug, Clone)]
enum TokenRequestStyle {
    Form,
    JsonBasicAuth,
}

#[derive(Debug, Clone)]
struct ProviderSpec {
    auth_url: String,
    token_url: String,
    scope: Option<String>,
    auth_extra_params: Vec<(String, String)>,
    token_request_style: TokenRequestStyle,
}

#[derive(Debug, Clone)]
struct OAuthClientCredentials {
    client_id: String,
    client_secret: String,
}

#[derive(Debug, Clone)]
struct OAuthCallbackContext {
    server_id: String,
    provider: String,
    expected_state: String,
    redirect_uri: String,
    provider_spec: ProviderSpec,
    credentials: OAuthClientCredentials,
}

#[derive(Debug, Clone)]
struct OAuthTokenBundle {
    access_token: String,
    refresh_token: Option<String>,
    expires_at: Option<DateTime<Utc>>,
}

/// Start a temporary OAuth callback server on a random port.
/// Returns the authorization URL that the caller should open in a browser.
pub async fn start_oauth_server(
    app_handle: tauri::AppHandle,
    server_id: &str,
    provider: &str,
) -> Result<String> {
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
        .await
        .context("Failed to bind to random port")?;
    let port = listener
        .local_addr()
        .context("Failed to get local address")?
        .port();

    let redirect_uri = format!("http://localhost:{}/callback", port);
    let provider_spec = provider_spec(provider)?;
    let credentials = resolve_client_credentials(server_id, provider)?;
    let state = uuid::Uuid::new_v4().to_string();
    let auth_url = build_auth_url(&provider_spec, &credentials, &redirect_uri, &state)?;

    let callback_ctx = OAuthCallbackContext {
        server_id: server_id.to_string(),
        provider: provider.to_string(),
        expected_state: state,
        redirect_uri,
        provider_spec,
        credentials,
    };

    let (shutdown_tx, shutdown_rx) = oneshot::channel::<()>();
    let shutdown_tx = Arc::new(tokio::sync::Mutex::new(Some(shutdown_tx)));

    let app_handle_for_handler = app_handle.clone();
    let callback_ctx_for_handler = callback_ctx.clone();
    let shutdown_for_handler = shutdown_tx.clone();

    let app = Router::new().route(
        "/callback",
        get(move |query: Query<HashMap<String, String>>| {
            let app_handle = app_handle_for_handler.clone();
            let callback_ctx = callback_ctx_for_handler.clone();
            let shutdown = shutdown_for_handler.clone();

            async move {
                let result = handle_callback(&callback_ctx, &query, &app_handle).await;

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

    tokio::spawn(async move {
        let server = axum::serve(listener, app);
        let graceful = server.with_graceful_shutdown(async {
            let _ = shutdown_rx.await;
        });
        let _ = timeout(Duration::from_secs(300), graceful).await;
    });

    Ok(auth_url)
}

pub async fn get_valid_oauth_token(server_id: &str) -> Result<Option<String>> {
    let current_token = get_keyring_value(server_id, "oauth_token");
    let Some(token) = current_token else {
        return Ok(None);
    };

    let expires_at = get_keyring_value(server_id, "oauth_expires")
        .as_deref()
        .and_then(parse_rfc3339_utc);

    // Keep a small leeway to avoid pushing a nearly-expired token to clients.
    let refresh_needed = expires_at
        .map(|ts| ts <= Utc::now() + ChronoDuration::seconds(60))
        .unwrap_or(false);

    if !refresh_needed {
        return Ok(Some(token));
    }

    let refreshed = refresh_access_token(server_id).await?;
    Ok(Some(refreshed.access_token))
}

fn provider_spec(provider: &str) -> Result<ProviderSpec> {
    let normalized = provider.trim().to_lowercase();
    let spec = match normalized.as_str() {
        "github" => ProviderSpec {
            auth_url: "https://github.com/login/oauth/authorize".to_string(),
            token_url: "https://github.com/login/oauth/access_token".to_string(),
            scope: Some("repo".to_string()),
            auth_extra_params: vec![],
            token_request_style: TokenRequestStyle::Form,
        },
        "google" => ProviderSpec {
            auth_url: "https://accounts.google.com/o/oauth2/v2/auth".to_string(),
            token_url: "https://oauth2.googleapis.com/token".to_string(),
            scope: Some("openid email profile".to_string()),
            auth_extra_params: vec![
                ("access_type".to_string(), "offline".to_string()),
                ("prompt".to_string(), "consent".to_string()),
            ],
            token_request_style: TokenRequestStyle::Form,
        },
        "notion" => ProviderSpec {
            auth_url: "https://api.notion.com/v1/oauth/authorize".to_string(),
            token_url: "https://api.notion.com/v1/oauth/token".to_string(),
            scope: None,
            auth_extra_params: vec![],
            token_request_style: TokenRequestStyle::JsonBasicAuth,
        },
        "slack" => ProviderSpec {
            auth_url: "https://slack.com/oauth/v2/authorize".to_string(),
            token_url: "https://slack.com/api/oauth.v2.access".to_string(),
            scope: Some("chat:write".to_string()),
            auth_extra_params: vec![],
            token_request_style: TokenRequestStyle::Form,
        },
        "linear" => ProviderSpec {
            auth_url: "https://linear.app/oauth/authorize".to_string(),
            token_url: "https://api.linear.app/oauth/token".to_string(),
            scope: Some("read".to_string()),
            auth_extra_params: vec![],
            token_request_style: TokenRequestStyle::Form,
        },
        _ => {
            let base = if normalized.starts_with("http://") || normalized.starts_with("https://") {
                normalized
            } else {
                format!("https://{}", normalized)
            };
            let mut auth_url = Url::parse(&base)
                .with_context(|| format!("Invalid provider URL '{}'", provider))?;
            auth_url.set_path("/oauth/authorize");
            let mut token_url = Url::parse(&base)
                .with_context(|| format!("Invalid provider URL '{}'", provider))?;
            token_url.set_path("/oauth/token");

            ProviderSpec {
                auth_url: auth_url.to_string(),
                token_url: token_url.to_string(),
                scope: None,
                auth_extra_params: vec![],
                token_request_style: TokenRequestStyle::Form,
            }
        }
    };

    Ok(spec)
}

fn build_auth_url(
    provider_spec: &ProviderSpec,
    credentials: &OAuthClientCredentials,
    redirect_uri: &str,
    state: &str,
) -> Result<String> {
    let mut url = Url::parse(&provider_spec.auth_url)
        .with_context(|| format!("Invalid OAuth auth URL '{}'", provider_spec.auth_url))?;

    {
        let mut pairs = url.query_pairs_mut();
        pairs.append_pair("client_id", &credentials.client_id);
        pairs.append_pair("redirect_uri", redirect_uri);
        pairs.append_pair("response_type", "code");
        pairs.append_pair("state", state);

        if let Some(scope) = &provider_spec.scope {
            pairs.append_pair("scope", scope);
        }
        for (k, v) in &provider_spec.auth_extra_params {
            pairs.append_pair(k, v);
        }
    }

    Ok(url.to_string())
}

async fn handle_callback(
    ctx: &OAuthCallbackContext,
    query: &HashMap<String, String>,
    app_handle: &tauri::AppHandle,
) -> Result<()> {
    if let Some(error) = query.get("error") {
        let description = query
            .get("error_description")
            .cloned()
            .unwrap_or_else(|| error.clone());
        anyhow::bail!("OAuth error: {}", description);
    }

    let returned_state = query
        .get("state")
        .ok_or_else(|| anyhow::anyhow!("Missing OAuth state in callback"))?;
    if returned_state != &ctx.expected_state {
        anyhow::bail!("OAuth state mismatch");
    }

    let code = query
        .get("code")
        .ok_or_else(|| anyhow::anyhow!("No authorization code in callback"))?;

    let bundle = exchange_code_for_tokens(
        &ctx.provider_spec,
        &ctx.credentials,
        code,
        &ctx.redirect_uri,
        Some(&ctx.expected_state),
    )
    .await?;

    store_oauth_bundle(&ctx.server_id, &ctx.provider, bundle)?;

    let _ = app_handle.emit(
        "oauth-callback-received",
        serde_json::json!({
            "serverId": ctx.server_id,
            "provider": ctx.provider,
            "success": true
        }),
    );

    Ok(())
}

async fn refresh_access_token(server_id: &str) -> Result<OAuthTokenBundle> {
    let provider = get_keyring_value(server_id, "oauth_provider")
        .ok_or_else(|| anyhow::anyhow!("Missing OAuth provider"))?;
    let refresh_token = get_keyring_value(server_id, "oauth_refresh")
        .ok_or_else(|| anyhow::anyhow!("OAuth token expired and no refresh token is available"))?;

    let spec = provider_spec(&provider)?;
    let credentials = resolve_client_credentials(server_id, &provider)?;
    let bundle = refresh_with_provider(&spec, &credentials, &refresh_token).await?;
    store_oauth_bundle(server_id, &provider, bundle.clone())?;
    Ok(bundle)
}

async fn exchange_code_for_tokens(
    spec: &ProviderSpec,
    credentials: &OAuthClientCredentials,
    code: &str,
    redirect_uri: &str,
    state: Option<&str>,
) -> Result<OAuthTokenBundle> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(20))
        .build()
        .context("Failed to build OAuth HTTP client")?;

    let response = match spec.token_request_style {
        TokenRequestStyle::Form => {
            let mut form = vec![
                ("grant_type", "authorization_code".to_string()),
                ("client_id", credentials.client_id.clone()),
                ("client_secret", credentials.client_secret.clone()),
                ("code", code.to_string()),
                ("redirect_uri", redirect_uri.to_string()),
            ];
            if let Some(state) = state {
                form.push(("state", state.to_string()));
            }

            client
                .post(&spec.token_url)
                .header("Accept", "application/json")
                .form(&form)
                .send()
                .await
                .context("OAuth token exchange request failed")?
        }
        TokenRequestStyle::JsonBasicAuth => {
            let mut payload = serde_json::json!({
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": redirect_uri,
            });
            if let Some(state) = state {
                payload["state"] = Value::String(state.to_string());
            }

            client
                .post(&spec.token_url)
                .basic_auth(&credentials.client_id, Some(&credentials.client_secret))
                .header("Accept", "application/json")
                .json(&payload)
                .send()
                .await
                .context("OAuth token exchange request failed")?
        }
    };

    parse_oauth_token_response(response).await
}

async fn refresh_with_provider(
    spec: &ProviderSpec,
    credentials: &OAuthClientCredentials,
    refresh_token: &str,
) -> Result<OAuthTokenBundle> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(20))
        .build()
        .context("Failed to build OAuth HTTP client")?;

    let response = match spec.token_request_style {
        TokenRequestStyle::Form => {
            let form = vec![
                ("grant_type", "refresh_token".to_string()),
                ("client_id", credentials.client_id.clone()),
                ("client_secret", credentials.client_secret.clone()),
                ("refresh_token", refresh_token.to_string()),
            ];
            client
                .post(&spec.token_url)
                .header("Accept", "application/json")
                .form(&form)
                .send()
                .await
                .context("OAuth refresh request failed")?
        }
        TokenRequestStyle::JsonBasicAuth => {
            let payload = serde_json::json!({
                "grant_type": "refresh_token",
                "refresh_token": refresh_token,
            });
            client
                .post(&spec.token_url)
                .basic_auth(&credentials.client_id, Some(&credentials.client_secret))
                .header("Accept", "application/json")
                .json(&payload)
                .send()
                .await
                .context("OAuth refresh request failed")?
        }
    };

    let mut bundle = parse_oauth_token_response(response).await?;
    if bundle.refresh_token.is_none() {
        bundle.refresh_token = Some(refresh_token.to_string());
    }
    Ok(bundle)
}

async fn parse_oauth_token_response(response: reqwest::Response) -> Result<OAuthTokenBundle> {
    let status = response.status();
    let body_text = response
        .text()
        .await
        .context("Failed reading OAuth token response")?;

    let body: Value = serde_json::from_str(&body_text)
        .with_context(|| format!("Invalid OAuth token response: {}", body_text))?;

    if !status.is_success() {
        let error = body
            .get("error_description")
            .and_then(|v| v.as_str())
            .or_else(|| body.get("error").and_then(|v| v.as_str()))
            .unwrap_or("unknown OAuth error");
        anyhow::bail!("OAuth token request failed: {}", error);
    }

    if body.get("ok").and_then(|v| v.as_bool()) == Some(false) {
        let error = body
            .get("error")
            .and_then(|v| v.as_str())
            .unwrap_or("unknown OAuth error");
        anyhow::bail!("OAuth token request failed: {}", error);
    }

    let access_token = body
        .get("access_token")
        .and_then(|v| v.as_str())
        .or_else(|| {
            body.get("authed_user")
                .and_then(|u| u.get("access_token"))
                .and_then(|v| v.as_str())
        })
        .ok_or_else(|| anyhow::anyhow!("OAuth token response missing access_token"))?
        .to_string();

    let refresh_token = body
        .get("refresh_token")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let expires_at = if let Some(ts) = body.get("expires_at").and_then(|v| v.as_str()) {
        parse_rfc3339_utc(ts)
    } else if let Some(epoch_secs) = body.get("expires_at").and_then(|v| v.as_i64()) {
        DateTime::from_timestamp(epoch_secs, 0)
    } else if let Some(expires_in) = body.get("expires_in").and_then(|v| v.as_i64()) {
        Some(Utc::now() + ChronoDuration::seconds(expires_in.max(0)))
    } else if let Some(expires_in) = body
        .get("authed_user")
        .and_then(|u| u.get("expires_in"))
        .and_then(|v| v.as_i64())
    {
        Some(Utc::now() + ChronoDuration::seconds(expires_in.max(0)))
    } else {
        None
    };

    Ok(OAuthTokenBundle {
        access_token,
        refresh_token,
        expires_at,
    })
}

fn resolve_client_credentials(server_id: &str, provider: &str) -> Result<OAuthClientCredentials> {
    let provider_key = sanitize_provider_key(provider);
    let server = read_server(server_id);

    let client_id = resolve_credential_value(
        server_id,
        server.as_ref(),
        &[
            format!("OAUTH_{}_CLIENT_ID", provider_key),
            "OAUTH_CLIENT_ID".to_string(),
            "CLIENT_ID".to_string(),
        ],
    )
    .ok_or_else(|| {
        anyhow::anyhow!(
            "Missing OAuth client ID for provider '{}'. Set OAUTH_{}_CLIENT_ID or OAUTH_CLIENT_ID.",
            provider,
            provider_key
        )
    })?;

    let client_secret = resolve_credential_value(
        server_id,
        server.as_ref(),
        &[
            format!("OAUTH_{}_CLIENT_SECRET", provider_key),
            "OAUTH_CLIENT_SECRET".to_string(),
            "CLIENT_SECRET".to_string(),
        ],
    )
    .ok_or_else(|| {
        anyhow::anyhow!(
            "Missing OAuth client secret for provider '{}'. Set OAUTH_{}_CLIENT_SECRET or OAUTH_CLIENT_SECRET.",
            provider,
            provider_key
        )
    })?;

    Ok(OAuthClientCredentials {
        client_id,
        client_secret,
    })
}

fn read_server(server_id: &str) -> Option<crate::config::McpServerConfig> {
    crate::config::read_config()
        .ok()
        .and_then(|cfg| cfg.servers.into_iter().find(|s| s.id == server_id))
}

fn resolve_credential_value(
    server_id: &str,
    server: Option<&crate::config::McpServerConfig>,
    candidate_keys: &[String],
) -> Option<String> {
    for key in candidate_keys {
        let keychain_username = format!("{}:{}", server_id, key);
        if let Ok(entry) = keyring::Entry::new("conductor", &keychain_username) {
            if let Ok(value) = entry.get_password() {
                if !value.trim().is_empty() {
                    return Some(value);
                }
            }
        }
    }

    if let Some(server) = server {
        for key in candidate_keys {
            if let Some(value) = server.env.get(key) {
                if !value.trim().is_empty() {
                    return Some(value.clone());
                }
            }
        }
    }

    for key in candidate_keys {
        if let Ok(value) = std::env::var(key) {
            if !value.trim().is_empty() {
                return Some(value);
            }
        }
    }

    None
}

fn sanitize_provider_key(provider: &str) -> String {
    provider
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() {
                c.to_ascii_uppercase()
            } else {
                '_'
            }
        })
        .collect()
}

fn parse_rfc3339_utc(value: &str) -> Option<DateTime<Utc>> {
    chrono::DateTime::parse_from_rfc3339(value)
        .ok()
        .map(|dt| dt.with_timezone(&Utc))
}

fn get_keyring_value(server_id: &str, suffix: &str) -> Option<String> {
    let username = format!("{}:{}", server_id, suffix);
    keyring::Entry::new("conductor", &username)
        .ok()
        .and_then(|entry| entry.get_password().ok())
}

fn set_keyring_value(server_id: &str, suffix: &str, value: &str) -> Result<()> {
    let username = format!("{}:{}", server_id, suffix);
    let entry =
        keyring::Entry::new("conductor", &username).context("Failed to create keyring entry")?;
    entry
        .set_password(value)
        .context("Failed to store value in keychain")
}

fn delete_keyring_value(server_id: &str, suffix: &str) {
    let username = format!("{}:{}", server_id, suffix);
    if let Ok(entry) = keyring::Entry::new("conductor", &username) {
        let _ = entry.delete_credential();
    }
}

fn store_oauth_bundle(server_id: &str, provider: &str, bundle: OAuthTokenBundle) -> Result<()> {
    set_keyring_value(server_id, "oauth_token", &bundle.access_token)?;
    set_keyring_value(server_id, "oauth_provider", provider)?;

    if let Some(refresh) = bundle.refresh_token {
        set_keyring_value(server_id, "oauth_refresh", &refresh)?;
    } else {
        delete_keyring_value(server_id, "oauth_refresh");
    }

    if let Some(expires_at) = bundle.expires_at {
        set_keyring_value(server_id, "oauth_expires", &expires_at.to_rfc3339())?;
    } else {
        delete_keyring_value(server_id, "oauth_expires");
    }

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
