use crate::clients::get_all_adapters;
use anyhow::Result;
use notify::{Config, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use std::collections::HashSet;
use std::path::PathBuf;
use std::sync::Arc;
use tauri::Emitter;
use tokio::sync::Mutex;
use tokio::time::{Duration, Instant};

/// Start watching all detected client config files for changes.
/// Emits "client-config-changed" Tauri events with 500ms debounce.
/// Only emits for actual MCP config files, not other files in the same directory.
pub async fn start_watching(app_handle: tauri::AppHandle) -> Result<()> {
    let adapters = get_all_adapters();

    // Collect actual config file paths and their parent directories
    let mut watch_dirs: HashSet<PathBuf> = HashSet::new();
    let mut config_files: HashSet<PathBuf> = HashSet::new();
    for adapter in &adapters {
        if let Some(config_path) = adapter.config_path() {
            if let Some(parent) = config_path.parent() {
                if parent.exists() {
                    watch_dirs.insert(parent.to_path_buf());
                    config_files.insert(config_path);
                }
            }
        }
    }

    if watch_dirs.is_empty() {
        return Ok(());
    }

    // Track last event time for debouncing
    let last_event: Arc<Mutex<Option<Instant>>> = Arc::new(Mutex::new(None));

    let app_handle_clone = app_handle.clone();
    let last_event_clone = last_event.clone();

    let (tx, mut rx) = tokio::sync::mpsc::channel::<notify::Event>(100);

    // Create the file watcher
    let mut watcher = RecommendedWatcher::new(
        move |result: Result<notify::Event, notify::Error>| {
            if let Ok(event) = result {
                let _ = tx.blocking_send(event);
            }
        },
        Config::default(),
    )?;

    // Watch all parent directories
    for dir in &watch_dirs {
        if let Err(e) = watcher.watch(dir, RecursiveMode::NonRecursive) {
            eprintln!("Warning: Failed to watch {}: {}", dir.display(), e);
        }
    }

    // Spawn a task to handle events with debouncing
    tokio::spawn(async move {
        // Keep the watcher alive by moving it into this task
        let _watcher = watcher;

        while let Some(event) = rx.recv().await {
            match event.kind {
                EventKind::Modify(_) | EventKind::Create(_) | EventKind::Remove(_) => {
                    // Filter to only actual MCP config files
                    let changed_paths: Vec<String> = event
                        .paths
                        .iter()
                        .filter(|p| config_files.contains(p.as_path()))
                        .filter(|p| !crate::file_guard::is_internal_write(p.as_path()))
                        .map(|p| p.to_string_lossy().to_string())
                        .collect();

                    if changed_paths.is_empty() {
                        continue;
                    }

                    let mut last = last_event_clone.lock().await;
                    let now = Instant::now();

                    // Debounce: only emit if 500ms have passed since last event
                    let should_emit = match *last {
                        Some(prev) => now.duration_since(prev) > Duration::from_millis(500),
                        None => true,
                    };

                    if should_emit {
                        *last = Some(now);
                        drop(last); // Release lock before emitting

                        let _ = app_handle_clone.emit("client-config-changed", &changed_paths);
                    }
                }
                _ => {}
            }
        }
    });

    Ok(())
}
