use crate::config::{self, AppSettings};

#[tauri::command]
pub async fn get_settings() -> Result<AppSettings, String> {
    let cfg = config::read_config().map_err(|e| e.to_string())?;
    Ok(cfg.settings)
}

#[tauri::command]
pub async fn save_settings(settings: AppSettings) -> Result<(), String> {
    let mut cfg = config::read_config().map_err(|e| e.to_string())?;
    cfg.settings = settings;
    config::write_config(&cfg).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn reset_settings() -> Result<AppSettings, String> {
    let mut cfg = config::read_config().map_err(|e| e.to_string())?;
    cfg.settings = AppSettings::default();
    config::write_config(&cfg).map_err(|e| e.to_string())?;
    Ok(cfg.settings)
}
