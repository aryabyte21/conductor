use anyhow::Result;
use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};
use std::sync::{Condvar, LazyLock, Mutex};
use std::time::{Duration, Instant};

const SUPPRESSION_WINDOW: Duration = Duration::from_secs(2);

struct GuardState {
    active_writes: HashSet<PathBuf>,
    suppressed_until: HashMap<PathBuf, Instant>,
}

impl GuardState {
    fn new() -> Self {
        Self {
            active_writes: HashSet::new(),
            suppressed_until: HashMap::new(),
        }
    }

    fn cleanup_expired(&mut self) {
        let now = Instant::now();
        self.suppressed_until.retain(|_, until| *until > now);
    }
}

static WRITE_STATE: LazyLock<(Mutex<GuardState>, Condvar)> =
    LazyLock::new(|| (Mutex::new(GuardState::new()), Condvar::new()));

pub struct InternalWriteGuard {
    path: PathBuf,
}

impl Drop for InternalWriteGuard {
    fn drop(&mut self) {
        let (lock, cvar) = &*WRITE_STATE;
        if let Ok(mut state) = lock.lock() {
            state.active_writes.remove(&self.path);
            state
                .suppressed_until
                .insert(self.path.clone(), Instant::now() + SUPPRESSION_WINDOW);
            cvar.notify_all();
        }
    }
}

/// Acquire an exclusive write lock for a config path.
/// This serializes Conductor-owned writes to the same file and lets the watcher
/// suppress self-generated file events.
pub fn acquire_internal_write(path: &Path) -> Result<InternalWriteGuard> {
    let canonical = path.to_path_buf();
    let (lock, cvar) = &*WRITE_STATE;

    let mut state = lock
        .lock()
        .map_err(|_| anyhow::anyhow!("Failed to lock internal write state"))?;

    loop {
        state.cleanup_expired();
        if !state.active_writes.contains(&canonical) {
            state.active_writes.insert(canonical.clone());
            return Ok(InternalWriteGuard { path: canonical });
        }
        state = cvar
            .wait(state)
            .map_err(|_| anyhow::anyhow!("Failed waiting for internal write lock"))?;
    }
}

/// Returns true if the path is currently being written by Conductor or
/// has just been written and should be ignored by the watcher.
pub fn is_internal_write(path: &Path) -> bool {
    let (lock, _) = &*WRITE_STATE;
    let Ok(mut state) = lock.lock() else {
        return false;
    };
    state.cleanup_expired();
    let key = path.to_path_buf();
    state.active_writes.contains(&key) || state.suppressed_until.contains_key(&key)
}
