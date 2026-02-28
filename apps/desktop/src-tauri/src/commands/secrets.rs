/// Save a secret to the system keychain.
/// Key format: service="conductor", username="{server_id}:{key}"
#[tauri::command]
pub async fn save_secret(server_id: String, key: String, value: String) -> Result<(), String> {
    let username = format!("{}:{}", server_id, key);
    let entry = keyring::Entry::new("conductor", &username).map_err(|e| e.to_string())?;
    entry.set_password(&value).map_err(|e| e.to_string())?;
    Ok(())
}

/// Get a secret from the system keychain.
#[tauri::command]
pub async fn get_secret(server_id: String, key: String) -> Result<Option<String>, String> {
    let username = format!("{}:{}", server_id, key);
    let entry = keyring::Entry::new("conductor", &username).map_err(|e| e.to_string())?;
    match entry.get_password() {
        Ok(password) => Ok(Some(password)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

/// Delete a secret from the system keychain.
#[tauri::command]
pub async fn delete_secret(server_id: String, key: String) -> Result<(), String> {
    let username = format!("{}:{}", server_id, key);
    let entry = keyring::Entry::new("conductor", &username).map_err(|e| e.to_string())?;
    match entry.delete_credential() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()), // Already deleted
        Err(e) => Err(e.to_string()),
    }
}

/// List all secret keys stored for a given server.
/// Since keyring doesn't support enumeration, we read from the master config
/// to know which keys exist, then check if they have stored values.
#[tauri::command]
pub async fn list_secret_keys(server_id: String) -> Result<Vec<String>, String> {
    let cfg = crate::config::read_config().map_err(|e| e.to_string())?;

    let server = cfg
        .servers
        .iter()
        .find(|s| s.id == server_id)
        .ok_or_else(|| format!("Server '{}' not found", server_id))?;

    let mut stored_keys = Vec::new();
    for key in &server.secret_env_keys {
        let username = format!("{}:{}", server_id, key);
        if let Ok(entry) = keyring::Entry::new("conductor", &username) {
            if entry.get_password().is_ok() {
                stored_keys.push(key.clone());
            }
        }
    }

    Ok(stored_keys)
}
