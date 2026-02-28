pub mod clients;
pub mod commands;
pub mod config;
pub mod errors;
pub mod file_guard;
pub mod oauth;
pub mod watcher;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![
            // detection
            commands::detection::detect_clients,
            commands::detection::read_master_config,
            commands::detection::save_master_config,
            commands::detection::get_app_version,
            // servers
            commands::servers::add_server,
            commands::servers::update_server,
            commands::servers::delete_server,
            commands::servers::toggle_server,
            // import
            commands::import::import_from_client,
            // sync
            commands::sync::sync_to_client,
            commands::sync::sync_to_all_clients,
            // secrets
            commands::secrets::save_secret,
            commands::secrets::get_secret,
            commands::secrets::delete_secret,
            commands::secrets::list_secret_keys,
            // registry
            commands::registry::get_popular_servers,
            commands::registry::search_registry,
            commands::registry::install_from_registry,
            // logo
            commands::logo::resolve_server_logo,
            commands::logo::get_client_icon,
            // oauth
            commands::oauth::start_oauth_flow,
            commands::oauth::check_auth_status,
            commands::oauth::revoke_auth,
            // stacks
            commands::stacks::export_stack,
            commands::stacks::import_stack,
            commands::stacks::get_stack_from_url,
            commands::stacks::save_exported_stack,
            commands::stacks::get_saved_stacks,
            commands::stacks::delete_saved_stack,
            // activity
            commands::activity::get_activity,
            commands::activity::clear_activity,
            // settings
            commands::settings::get_settings,
            commands::settings::save_settings,
            commands::settings::reset_settings,
            // system
            commands::system::open_config_folder,
            commands::system::export_config,
        ])
        .setup(|app| {
            // Setup system tray
            let tray = app.tray_by_id("main");
            if let Some(tray) = tray {
                let show_item = tauri::menu::MenuItem::with_id(
                    app,
                    "show",
                    "Show Conductor",
                    true,
                    None::<&str>,
                )?;
                let quit_item = tauri::menu::MenuItem::with_id(
                    app,
                    "quit",
                    "Quit Conductor",
                    true,
                    None::<&str>,
                )?;
                let menu = tauri::menu::Menu::with_items(app, &[&show_item, &quit_item])?;
                tray.set_menu(Some(menu))?;

                let app_handle = app.handle().clone();
                tray.on_menu_event(move |_tray, event| match event.id().as_ref() {
                    "show" => {
                        if let Some(window) = app_handle.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "quit" => {
                        std::process::exit(0);
                    }
                    _ => {}
                });
            }

            // Start file watcher
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                if let Err(e) = watcher::start_watching(app_handle).await {
                    eprintln!("File watcher error: {}", e);
                }
            });

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                // Hide window instead of closing
                let _ = window.hide();
                api.prevent_close();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
