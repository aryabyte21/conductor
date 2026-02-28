use crate::config;

/// Open the Conductor config folder in Finder.
#[tauri::command]
pub async fn open_config_folder() -> Result<(), String> {
    let path = config::master_config_path().map_err(|e| e.to_string())?;
    let folder = path
        .parent()
        .ok_or_else(|| "Cannot determine config folder".to_string())?;

    open::that(folder).map_err(|e| format!("Failed to open folder: {}", e))?;
    Ok(())
}

/// Export the entire master config as a JSON string.
#[tauri::command]
pub async fn export_config() -> Result<String, String> {
    let cfg = config::read_config().map_err(|e| e.to_string())?;
    serde_json::to_string_pretty(&cfg).map_err(|e| e.to_string())
}
