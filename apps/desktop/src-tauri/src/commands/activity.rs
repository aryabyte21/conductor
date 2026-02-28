use crate::config::{self, ActivityEntry};

#[tauri::command]
pub async fn get_activity() -> Result<Vec<ActivityEntry>, String> {
    let mut cfg = config::read_config().map_err(|e| e.to_string())?;
    let pruned = config::prune_activity_entries(&mut cfg.activity);
    if pruned > 0 {
        config::write_config(&cfg).map_err(|e| e.to_string())?;
    }

    let mut entries = cfg.activity;
    entries.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
    Ok(entries)
}

#[tauri::command]
pub async fn clear_activity() -> Result<(), String> {
    let mut cfg = config::read_config().map_err(|e| e.to_string())?;
    cfg.activity.clear();
    config::write_config(&cfg).map_err(|e| e.to_string())?;
    Ok(())
}
