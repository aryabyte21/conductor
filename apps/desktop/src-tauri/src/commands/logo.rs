use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Mutex;

static CLIENT_ICON_CACHE: std::sync::LazyLock<Mutex<HashMap<String, Option<String>>>> =
    std::sync::LazyLock::new(|| Mutex::new(HashMap::new()));

/// Load a client app's icon from its macOS .app bundle.
/// Returns base64-encoded PNG data URI or None.
#[tauri::command]
pub async fn get_client_icon(client_id: String) -> Result<Option<String>, String> {
    // Check cache
    if let Ok(cache) = CLIENT_ICON_CACHE.lock() {
        if let Some(cached) = cache.get(&client_id) {
            return Ok(cached.clone());
        }
    }

    let result = load_client_icon_from_macos(&client_id);

    // Cache the result
    if let Ok(mut cache) = CLIENT_ICON_CACHE.lock() {
        cache.insert(client_id, result.clone());
    }

    Ok(result)
}

fn load_client_icon_from_macos(client_id: &str) -> Option<String> {
    let app_paths: Vec<&str> = match client_id {
        "claude-desktop" => vec!["/Applications/Claude.app"],
        "cursor" => vec!["/Applications/Cursor.app"],
        "vscode" => vec![
            "/Applications/Visual Studio Code.app",
            "/Applications/Visual Studio Code - Insiders.app",
        ],
        "windsurf" => vec!["/Applications/Windsurf.app"],
        "zed" => vec!["/Applications/Zed.app", "/Applications/Zed Preview.app"],
        "jetbrains" => vec![
            "/Applications/IntelliJ IDEA.app",
            "/Applications/IntelliJ IDEA CE.app",
            "/Applications/PyCharm.app",
            "/Applications/PyCharm CE.app",
            "/Applications/WebStorm.app",
            "/Applications/GoLand.app",
            "/Applications/RustRover.app",
            "/Applications/CLion.app",
            "/Applications/DataGrip.app",
            "/Applications/Rider.app",
        ],
        "codex" => vec!["/Applications/Codex.app"],
        "antigravity" => vec!["/Applications/Antigravity.app"],
        _ => return None,
    };

    for app_path in &app_paths {
        let bundle = PathBuf::from(app_path);
        if !bundle.exists() {
            continue;
        }

        let resources = bundle.join("Contents/Resources");
        if !resources.exists() {
            continue;
        }

        // Find the .icns file: PlistBuddy → hardcoded known names → skip
        let icns_path = find_app_icon(&bundle, &resources);

        let icns_path = match icns_path {
            Some(p) => p,
            None => continue,
        };

        // Use macOS built-in `sips` to convert .icns to PNG
        if let Some(data_uri) = convert_icns_to_base64(&icns_path, client_id) {
            return Some(data_uri);
        }
    }

    None
}

/// Find the app icon .icns file using multiple strategies
fn find_app_icon(bundle: &PathBuf, resources: &PathBuf) -> Option<PathBuf> {
    // Strategy 1: Read CFBundleIconFile from Info.plist
    if let Some(path) = read_icon_from_plist(bundle, resources) {
        return Some(path);
    }

    // Strategy 2: Try well-known icon file names derived from the app name
    let app_name = bundle.file_stem().and_then(|s| s.to_str()).unwrap_or("");
    if !app_name.is_empty() {
        let candidate = resources.join(format!("{}.icns", app_name));
        if candidate.exists() {
            return Some(candidate);
        }
    }

    // Strategy 3: Common generic names
    for name in &["AppIcon.icns", "app.icns", "icon.icns", "electron.icns"] {
        let candidate = resources.join(name);
        if candidate.exists() {
            return Some(candidate);
        }
    }

    None
}

/// Read CFBundleIconFile from Info.plist using PlistBuddy
fn read_icon_from_plist(bundle: &PathBuf, resources: &PathBuf) -> Option<PathBuf> {
    let plist_path = bundle.join("Contents/Info.plist");
    if !plist_path.exists() {
        return None;
    }

    let output = std::process::Command::new("/usr/libexec/PlistBuddy")
        .args(["-c", "Print :CFBundleIconFile", plist_path.to_str()?])
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    let icon_name = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if icon_name.is_empty() {
        return None;
    }

    // Try with .icns extension if not already present
    let with_ext = if icon_name.ends_with(".icns") {
        icon_name.clone()
    } else {
        format!("{}.icns", icon_name)
    };

    let path = resources.join(&with_ext);
    if path.exists() {
        return Some(path);
    }

    let path = resources.join(&icon_name);
    if path.exists() {
        return Some(path);
    }

    None
}

/// Convert an .icns file to a base64-encoded PNG data URI
fn convert_icns_to_base64(icns_path: &PathBuf, client_id: &str) -> Option<String> {
    // Validate client_id to prevent path traversal (e.g. "../../etc/passwd")
    if !client_id.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_') {
        return None;
    }

    let tmp_dir = std::env::temp_dir();
    let tmp_png = tmp_dir.join(format!("conductor_icon_{}.png", client_id));

    let icns_str = icns_path.to_string_lossy();
    let tmp_str = tmp_png.to_string_lossy();

    let output = std::process::Command::new("sips")
        .args([
            "-s",
            "format",
            "png",
            "--resampleWidth",
            "128",
            &*icns_str,
            "--out",
            &*tmp_str,
        ])
        .output()
        .ok()?;

    if !output.status.success() {
        let _ = std::fs::remove_file(&tmp_png); // Clean up on failure
        return None;
    }

    let png_bytes = std::fs::read(&tmp_png);
    let _ = std::fs::remove_file(&tmp_png); // Always clean up
    let png_bytes = png_bytes.ok()?;
    let b64 = base64_encode(&png_bytes);
    Some(format!("data:image/png;base64,{}", b64))
}

fn base64_encode(data: &[u8]) -> String {
    const CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut result = String::with_capacity((data.len() + 2) / 3 * 4);
    for chunk in data.chunks(3) {
        let b0 = chunk[0] as u32;
        let b1 = if chunk.len() > 1 { chunk[1] as u32 } else { 0 };
        let b2 = if chunk.len() > 2 { chunk[2] as u32 } else { 0 };
        let triple = (b0 << 16) | (b1 << 8) | b2;
        result.push(CHARS[((triple >> 18) & 0x3F) as usize] as char);
        result.push(CHARS[((triple >> 12) & 0x3F) as usize] as char);
        if chunk.len() > 1 {
            result.push(CHARS[((triple >> 6) & 0x3F) as usize] as char);
        } else {
            result.push('=');
        }
        if chunk.len() > 2 {
            result.push(CHARS[(triple & 0x3F) as usize] as char);
        } else {
            result.push('=');
        }
    }
    result
}

/// Resolve a server logo URL using a fallback chain:
/// 1. Hardcoded icon map (reliable, no network)
/// 2. URL domain extraction (for SSE/HTTP servers)
/// 3. npm org -> GitHub avatar (for @scoped packages)
/// 4. Return None (frontend generates letter avatar)
#[tauri::command]
pub async fn resolve_server_logo(
    name: String,
    command: Option<String>,
    url: Option<String>,
) -> Result<Option<String>, String> {
    // Step 1: Hardcoded icons (most reliable, zero network latency)
    if let Some(icon) = get_hardcoded_icon(&name, command.as_deref(), url.as_deref()) {
        return Ok(Some(icon));
    }

    // Step 2: Extract domain from URL for SSE/HTTP servers
    if let Some(ref u) = url {
        if let Some(icon) = try_icon_from_url_domain(u) {
            return Ok(Some(icon));
        }
    }

    // Step 3: npm org -> GitHub avatar (for @scoped packages)
    if let Some(ref cmd) = command {
        if let Some(icon) = try_npm_github_avatar(cmd).await {
            return Ok(Some(icon));
        }
    }

    // Step 4: Try extracting package name from command for GitHub
    if let Some(ref cmd) = command {
        if let Some(icon) = try_package_github_avatar(cmd).await {
            return Ok(Some(icon));
        }
    }

    // Step 5: No icon found — frontend will show letter avatar
    Ok(None)
}

/// Try to extract a favicon/logo from the URL's domain
fn try_icon_from_url_domain(url: &str) -> Option<String> {
    // Parse URL to get domain
    let url_parsed = url::Url::parse(url).ok()?;
    let host = url_parsed.host_str()?;

    // Use Google's favicon service for the domain
    // This returns a real favicon for any public domain
    let base_domain = extract_base_domain(host);
    Some(format!(
        "https://www.google.com/s2/favicons?domain={}&sz=64",
        base_domain
    ))
}

/// Extract the registrable domain from a hostname
/// e.g., "mcp.linear.app" -> "linear.app", "api.github.com" -> "github.com"
fn extract_base_domain(host: &str) -> &str {
    let parts: Vec<&str> = host.split('.').collect();
    if parts.len() <= 2 {
        return host;
    }
    // Return last 2 parts (e.g., "linear.app" from "mcp.linear.app")
    let start = parts.len() - 2;
    let byte_offset = host.len()
        - parts[start..].iter().map(|p| p.len()).sum::<usize>()
        - (parts.len() - start - 1); // dots between remaining parts
    &host[byte_offset..]
}

async fn try_npm_github_avatar(command: &str) -> Option<String> {
    let parts: Vec<&str> = command.split_whitespace().collect();

    for part in &parts {
        if part.starts_with('@') {
            // Scoped package: @org/package -> org
            if let Some(org) = part.split('/').next() {
                let org_name = org.trim_start_matches('@');
                if org_name.is_empty() {
                    continue;
                }
                let avatar_url = format!("https://github.com/{}.png?size=64", org_name);
                let client = reqwest::Client::builder()
                    .timeout(std::time::Duration::from_secs(3))
                    .build()
                    .ok()?;
                if let Ok(resp) = client.head(&avatar_url).send().await {
                    if resp.status().is_success() || resp.status().is_redirection() {
                        return Some(avatar_url);
                    }
                }
            }
        }
    }

    None
}

/// Try to find a GitHub avatar for a non-scoped npm package name
/// e.g., "npx shadcn@latest mcp" -> try github.com/shadcn-ui.png or github.com/shadcn.png
async fn try_package_github_avatar(command: &str) -> Option<String> {
    let parts: Vec<&str> = command.split_whitespace().collect();

    for part in &parts {
        // Skip flags, npx, -y, etc.
        if part.starts_with('-') || *part == "npx" || *part == "node" || *part == "mcp" {
            continue;
        }
        // Strip version suffix: "shadcn@latest" -> "shadcn"
        let pkg_name = part.split('@').next().unwrap_or(part);
        if pkg_name.is_empty() || pkg_name.contains('/') {
            continue;
        }
        // Skip if it looks like a file path
        if pkg_name.contains('.') || pkg_name.starts_with('/') {
            continue;
        }

        let avatar_url = format!("https://github.com/{}.png?size=64", pkg_name);
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(3))
            .build()
            .ok()?;
        if let Ok(resp) = client.head(&avatar_url).send().await {
            if resp.status().is_success() || resp.status().is_redirection() {
                return Some(avatar_url);
            }
        }
    }

    None
}

fn get_hardcoded_icon(name: &str, command: Option<&str>, url: Option<&str>) -> Option<String> {
    // (keyword, icon_url) pairs — checked against name, command, and URL
    let icons: &[(&str, &str)] = &[
        // Dev tools & services
        ("github", "https://github.githubassets.com/favicons/favicon-dark.svg"),
        ("gitlab", "https://gitlab.com/assets/favicon-72a2cad5025aa931d6ea56c3201d1f18e68a8571148c3f26c4918e3285a37571.png"),
        ("bitbucket", "https://bitbucket.org/favicon.ico"),
        ("linear", "https://linear.app/favicon.ico"),
        ("jira", "https://wac-cdn-bfldr.atlassian.com/K3MHR9G8/at/p768xfcsrkw9fxqcqpbq/jira-mark-gradient-blue.svg"),
        ("notion", "https://www.notion.so/images/favicon.ico"),
        ("slack", "https://a.slack-edge.com/80588/marketing/img/meta/favicon-32.png"),
        ("discord", "https://discord.com/assets/favicon.ico"),
        ("figma", "https://static.figma.com/app/icon/1/favicon.png"),

        // Cloud & infra
        ("docker", "https://www.docker.com/wp-content/uploads/2022/03/Moby-logo.png"),
        ("kubernetes", "https://kubernetes.io/images/favicon.png"),
        ("aws", "https://a0.awsstatic.com/libra-css/images/site/fav/favicon.ico"),
        ("cloudflare", "https://www.cloudflare.com/favicon.ico"),
        ("vercel", "https://vercel.com/favicon.ico"),
        ("netlify", "https://www.netlify.com/favicon/icon.svg"),
        ("supabase", "https://supabase.com/favicon/favicon-32x32.png"),
        ("firebase", "https://firebase.google.com/favicon.ico"),
        ("heroku", "https://www.herokucdn.com/favicon.ico"),

        // Databases
        ("postgres", "https://www.postgresql.org/media/img/about/press/elephant.png"),
        ("postgresql", "https://www.postgresql.org/media/img/about/press/elephant.png"),
        ("mysql", "https://labs.mysql.com/common/themes/flavor-2021/img/favicon.ico"),
        ("sqlite", "https://www.sqlite.org/favicon.ico"),
        ("mongodb", "https://www.mongodb.com/assets/images/global/favicon.ico"),
        ("redis", "https://redis.io/favicon.ico"),

        // Monitoring & observability
        ("grafana", "https://grafana.com/static/assets/img/fav32.png"),
        ("sentry", "https://sentry.io/_assets/favicon.ico"),
        ("datadog", "https://www.datadoghq.com/favicon.ico"),
        ("prometheus", "https://prometheus.io/assets/favicons/favicon.ico"),

        // Code quality & tools
        ("eslint", "https://eslint.org/favicon.ico"),
        ("prettier", "https://prettier.io/icon.png"),
        ("graphite", "https://graphite.dev/favicon.ico"),
        ("chromatic", "https://www.chromatic.com/favicon.ico"),

        // AI & ML
        ("openai", "https://openai.com/favicon.ico"),
        ("anthropic", "https://www.anthropic.com/favicon.ico"),
        ("huggingface", "https://huggingface.co/favicon.ico"),

        // Frontend
        ("shadcn", "https://ui.shadcn.com/favicon.ico"),
        ("next", "https://nextjs.org/favicon.ico"),
        ("nextjs", "https://nextjs.org/favicon.ico"),
        ("next-devtools", "https://nextjs.org/favicon.ico"),
        ("react", "https://react.dev/favicon.ico"),
        ("vue", "https://vuejs.org/logo.svg"),
        ("angular", "https://angular.dev/assets/icons/favicon.ico"),
        ("svelte", "https://svelte.dev/favicon.png"),
        ("tailwind", "https://tailwindcss.com/favicons/favicon-32x32.png"),
        ("storybook", "https://storybook.js.org/favicon.ico"),

        // Payment & finance
        ("stripe", "https://images.ctfassets.net/fzn2n1nzq965/HTTOloNPhisV9P4hlMPNA/cacf1bb88b9fc492dfad34378d844571/Stripe_icon_-_square.svg"),
        ("kite", "https://kite.zerodha.com/static/images/kite-logo.svg"),
        ("zerodha", "https://kite.zerodha.com/static/images/kite-logo.svg"),

        // Search & web
        ("brave", "https://brave.com/static-assets/images/brave-logo-sans-text.svg"),
        ("google-drive", "https://ssl.gstatic.com/images/branding/product/2x/drive_2020q4_48dp.png"),
        ("google-maps", "https://maps.google.com/favicon.ico"),
        ("puppeteer", "https://www.gstatic.com/devrel-devsite/prod/v870e399c64f7c43c99a3043db4b3a74327bb93d0914e84a0c3dba90bbfd67625/chrome-for-developers/images/favicon.png"),
        ("playwright", "https://playwright.dev/img/playwright-logo.svg"),

        // Productivity
        ("todoist", "https://todoist.com/favicon.ico"),
        ("raycast", "https://www.raycast.com/favicon-production.png"),
        ("asana", "https://asana.com/favicon.ico"),
        ("trello", "https://trello.com/favicon.ico"),

        // Social & communication
        ("twitter", "https://abs.twimg.com/favicons/twitter.3.ico"),
        ("spotify", "https://open.spotifycdn.com/cdn/images/favicon32.b64ecc03.png"),
        ("youtube", "https://www.youtube.com/favicon.ico"),
    ];

    let name_lower = name.to_lowercase();

    // Combine all searchable text
    let cmd_lower = command.unwrap_or("").to_lowercase();
    let url_lower = url.unwrap_or("").to_lowercase();

    // Check name, command, and URL for keyword matches
    for (keyword, icon_url) in icons {
        if name_lower == *keyword
            || name_lower.contains(keyword)
            || cmd_lower.contains(keyword)
            || url_lower.contains(keyword)
        {
            return Some(icon_url.to_string());
        }
    }

    None
}
