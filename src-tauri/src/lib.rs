mod commands;
mod firewall;
mod icon;
mod log_privacy;
mod logging;
mod process;
mod process_service;
mod recovery;
mod storage;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default();

    #[cfg(windows)]
    let builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
        if let Some(window) = app.get_webview_window("main") {
            if let Err(error) = window.unminimize() {
                logging::warn(
                    "single_instance",
                    &format!("Could not restore the main window: {error}"),
                );
            }
            if let Err(error) = window.show() {
                logging::warn(
                    "single_instance",
                    &format!("Could not show the main window: {error}"),
                );
            }
            if let Err(error) = window.set_focus() {
                logging::warn(
                    "single_instance",
                    &format!("Could not focus the main window: {error}"),
                );
            }
        }
    }));

    builder
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            match logging::initialize(app.handle()) {
                Ok(path) => logging::info("app", &format!("Log file: {}", path.display())),
                Err(error) => eprintln!("Could not initialize DropNet file logging: {error}"),
            }
            logging::info("app", "DropNet started");
            let previous_hook = std::panic::take_hook();
            std::panic::set_hook(Box::new(move |panic| {
                logging::error("panic", &panic.to_string());
                previous_hook(panic);
            }));
            #[cfg(target_os = "windows")]
            if let Some(window) = app.get_webview_window("main") {
                if let Err(error) = window_vibrancy::apply_mica(&window, Some(false)) {
                    logging::warn("window", &format!("Could not apply Mica: {error}"));
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::is_admin,
            commands::initialize_session,
            commands::list_processes,
            commands::list_blocked_paths,
            commands::add_executable,
            commands::remove_entry,
            commands::set_blocked,
            commands::unblock_all,
            commands::log_frontend_error,
            commands::read_logs
        ])
        .run(tauri::generate_context!())
        .expect("error while running DropNet");
}
