use anyhow::{Context, Result};
use std::path::Path;

/// Atomically writes content to a file with backup of the existing file.
///
/// 1. Writes content to a temporary file in the same directory.
/// 2. If the target file exists, creates a timestamped .bak backup.
/// 3. Renames the temporary file to the target path.
pub fn atomic_write(path: &Path, content: &str) -> Result<()> {
    // Safety check: if we're writing a JSON file, verify the content is valid
    // JSON before touching the disk. This prevents writing corrupt data that
    // could crash clients like Claude Desktop.
    if path.extension().and_then(|e| e.to_str()) == Some("json") {
        let _: serde_json::Value = serde_json::from_str(content)
            .with_context(|| format!("Refusing to write invalid JSON to {}", path.display()))?;
    }

    let _write_guard = crate::file_guard::acquire_internal_write(path)?;

    let parent = path.parent().ok_or_else(|| {
        anyhow::anyhow!("Cannot determine parent directory of {}", path.display())
    })?;

    // Ensure parent directory exists
    if !parent.exists() {
        std::fs::create_dir_all(parent)
            .with_context(|| format!("Failed to create directory {}", parent.display()))?;
    }

    // Write to a temporary file in the same directory (same filesystem for rename)
    let temp_path = parent.join(format!(
        ".conductor_tmp_{}",
        uuid::Uuid::new_v4().to_string()
    ));

    std::fs::write(&temp_path, content)
        .with_context(|| format!("Failed to write temp file {}", temp_path.display()))?;

    // Create a backup of the existing file if it exists
    if path.exists() {
        let timestamp = chrono::Local::now().format("%Y%m%d_%H%M%S");
        let file_stem = path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("config");
        let extension = path.extension().and_then(|s| s.to_str()).unwrap_or("json");
        let backup_name = format!("{}_{}.{}.bak", file_stem, timestamp, extension);
        let backup_path = parent.join(backup_name);

        if let Err(e) = std::fs::copy(path, &backup_path) {
            eprintln!(
                "Warning: Failed to create backup at {}: {}",
                backup_path.display(),
                e
            );
            // Non-fatal: we still proceed with the write
        } else if let Err(e) = std::fs::read(&backup_path) {
            eprintln!(
                "Warning: Backup verification failed at {}: {}",
                backup_path.display(),
                e
            );
        }

        // Clean up old backups (keep last 5)
        clean_old_backups(parent, file_stem);
    }

    // Rename temp file to target (atomic on same filesystem)
    std::fs::rename(&temp_path, path).with_context(|| {
        format!(
            "Failed to rename {} to {}",
            temp_path.display(),
            path.display()
        )
    })?;

    Ok(())
}

/// Removes old backup files, keeping only the most recent 5.
fn clean_old_backups(dir: &Path, stem: &str) {
    let pattern = format!("{}_*.bak", stem);
    let glob_pattern = dir.join(&pattern);

    if let Ok(entries) = glob::glob(glob_pattern.to_str().unwrap_or("")) {
        let mut backups: Vec<std::path::PathBuf> = entries.filter_map(|e| e.ok()).collect();
        backups.sort();

        if backups.len() > 5 {
            let to_remove = backups.len() - 5;
            for backup in backups.iter().take(to_remove) {
                let _ = std::fs::remove_file(backup);
            }
        }
    }
}
