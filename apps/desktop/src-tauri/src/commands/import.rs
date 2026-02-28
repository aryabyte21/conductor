use crate::clients;
use crate::config::{self, ImportResult};

#[tauri::command]
pub async fn import_from_client(client_id: String) -> Result<ImportResult, String> {
    let adapter =
        clients::get_adapter(&client_id).ok_or_else(|| format!("Unknown client: {}", client_id))?;

    if !adapter.detect() {
        return Err(format!(
            "Client '{}' is not installed or not detected",
            client_id
        ));
    }

    let client_servers = adapter.read_servers().map_err(|e| e.to_string())?;

    let mut cfg = config::read_config().map_err(|e| e.to_string())?;

    let mut imported = Vec::new();
    let mut skipped_count = 0usize;

    for server in client_servers {
        let is_duplicate = cfg
            .servers
            .iter()
            .any(|existing| existing.name == server.name && existing.command == server.command);

        if is_duplicate {
            skipped_count += 1;
        } else {
            cfg.servers.push(server.clone());
            imported.push(server);
        }
    }

    config::write_config(&cfg).map_err(|e| e.to_string())?;

    let added = imported.len();

    if added > 0 {
        config::log_activity(
            "import",
            &format!("Imported {} servers from {}", added, client_id),
            None,
            Some(client_id),
            None,
        );
    }

    Ok(ImportResult {
        added,
        skipped: skipped_count,
        servers: imported,
    })
}
