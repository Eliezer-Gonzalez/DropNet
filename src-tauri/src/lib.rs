mod firewall;
mod icon;
mod process;
mod storage;

use serde::Serialize;
use std::path::PathBuf;
use tauri::Manager;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ProcessRow {
    key: String,
    pid: u32,
    parent_pid: Option<u32>,
    name: String,
    path: Option<String>,
    icon_data: Option<String>,
    blocked: bool,
    file_exists: bool,
    tracked: bool,
    running: bool,
}

#[tauri::command]
fn is_admin() -> bool {
    #[cfg(windows)]
    unsafe {
        return windows_sys::Win32::UI::Shell::IsUserAnAdmin() != 0;
    }
    #[cfg(not(windows))]
    false
}

#[tauri::command]
fn list_processes(app: tauri::AppHandle, show_windows: bool) -> Result<Vec<ProcessRow>, String> {
    let entries = storage::load(&app)?;
    let blocked = entries
        .iter()
        .filter_map(|entry| {
            firewall::is_blocked(&entry.id)
                .ok()
                .filter(|value| *value)
                .map(|_| entry.path.to_lowercase())
        })
        .collect::<std::collections::HashSet<_>>();
    let windows_dir = std::env::var("WINDIR")
        .unwrap_or_else(|_| "C:\\Windows".to_string())
        .to_lowercase();
    let mut rows = process::list();
    rows.retain(|process| {
        show_windows
            || process
                .path
                .as_ref()
                .is_some_and(|path| !path.to_lowercase().starts_with(&windows_dir))
    });
    let mut icons = std::collections::HashMap::new();
    let mut result = rows
        .into_iter()
        .map(|process| {
            let path_lower = process.path.as_deref().unwrap_or_default().to_lowercase();
            let icon_data = process.path.as_deref().and_then(|path| {
                icons
                    .entry(path_lower.clone())
                    .or_insert_with(|| icon::executable_icon(path))
                    .clone()
            });
            let tracked = entries
                .iter()
                .any(|entry| entry.path.to_lowercase() == path_lower);
            ProcessRow {
                key: process.pid.to_string(),
                pid: process.pid,
                parent_pid: process.parent_pid,
                name: process.name,
                file_exists: process
                    .path
                    .as_ref()
                    .is_none_or(|path| PathBuf::from(path).exists()),
                blocked: blocked.contains(&path_lower),
                tracked,
                running: true,
                icon_data,
                path: process.path,
            }
        })
        .collect::<Vec<_>>();
    for entry in entries {
        if result.iter().any(|row| {
            row.path
                .as_ref()
                .is_some_and(|path| path.eq_ignore_ascii_case(&entry.path))
        }) {
            continue;
        }
        let path = PathBuf::from(&entry.path);
        let path_lower = entry.path.to_lowercase();
        let name = path
            .file_name()
            .map(|name| name.to_string_lossy().into_owned())
            .unwrap_or_else(|| entry.path.clone());
        result.push(ProcessRow {
            key: format!("entry-{}", entry.id),
            pid: 0,
            parent_pid: None,
            name,
            file_exists: path.exists(),
            blocked: blocked.contains(&path_lower),
            tracked: true,
            running: false,
            icon_data: icons
                .entry(path_lower.clone())
                .or_insert_with(|| icon::executable_icon(&entry.path))
                .clone(),
            path: Some(entry.path),
        });
    }
    Ok(result)
}

#[tauri::command]
fn set_blocked(app: tauri::AppHandle, path: String, blocked: bool) -> Result<bool, String> {
    let entry = storage::ensure(&app, path)?;
    if blocked {
        firewall::block(&entry.id, &entry.path)?;
    } else {
        firewall::unblock(&entry.id)?;
    }
    firewall::is_blocked(&entry.id)
}

#[tauri::command]
fn remove_entry(app: tauri::AppHandle, path: String) -> Result<(), String> {
    storage::remove(&app, &path, true)
}

#[tauri::command]
fn unblock_all(app: tauri::AppHandle) -> Result<(), String> {
    for entry in storage::load(&app)? {
        firewall::unblock(&entry.id)?;
    }
    Ok(())
}

#[tauri::command]
fn add_executable(app: tauri::AppHandle, path: String) -> Result<(), String> {
    let path_ref = PathBuf::from(&path);
    if !path_ref.exists()
        || path_ref
            .extension()
            .is_none_or(|extension| !extension.eq_ignore_ascii_case("exe"))
    {
        return Err("Selecciona un archivo .exe existente.".into());
    }
    let canonical = path_ref
        .canonicalize()
        .map_err(|error| error.to_string())?
        .to_string_lossy()
        .to_string();
    storage::add(&app, canonical)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            #[cfg(target_os = "windows")]
            if let Some(window) = app.get_webview_window("main") {
                let _ = window_vibrancy::apply_blur(&window, Some((170, 200, 232, 140)));
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            is_admin,
            list_processes,
            add_executable,
            remove_entry,
            set_blocked,
            unblock_all
        ])
        .run(tauri::generate_context!())
        .expect("error while running DropNet");
}
