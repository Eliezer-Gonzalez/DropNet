use std::{path::PathBuf, sync::Mutex};

static OPERATIONS: Mutex<()> = Mutex::new(());

async fn run_blocking<T, F>(task: F) -> Result<T, String>
where
    T: Send + 'static,
    F: FnOnce() -> Result<T, String> + Send + 'static,
{
    match tauri::async_runtime::spawn_blocking(move || {
        let _guard = OPERATIONS
            .lock()
            .map_err(|_| "Firewall operation lock unavailable.".to_string())?;
        task()
    })
    .await
    {
        Ok(result) => result,
        Err(error) => Err(format!("Background task failed: {error}")),
    }
}

fn clean_log_value(value: &str, limit: usize) -> String {
    value
        .chars()
        .filter(|character| !character.is_control() || *character == ' ')
        .take(limit)
        .collect()
}

#[tauri::command]
pub fn log_frontend_error(operation: String, detail: String) {
    let operation = clean_log_value(&operation, 100);
    let detail = clean_log_value(&detail, 4_000);
    crate::logging::error("frontend", &format!("{operation}: {detail}"));
}

#[tauri::command]
pub async fn read_logs() -> Result<crate::logging::LogSnapshot, String> {
    tauri::async_runtime::spawn_blocking(crate::logging::read_logs)
        .await
        .map_err(|error| format!("Could not read DropNet logs: {error}"))?
}

#[tauri::command]
pub fn is_admin() -> bool {
    #[cfg(windows)]
    unsafe {
        return windows_sys::Win32::UI::Shell::IsUserAnAdmin() != 0;
    }
    #[cfg(not(windows))]
    false
}

#[tauri::command]
pub async fn list_processes(
    app: tauri::AppHandle,
    show_windows: bool,
) -> Result<Vec<crate::process_service::ProcessRow>, String> {
    run_blocking(move || crate::process_service::list(&app, show_windows)).await
}

#[tauri::command]
pub async fn set_blocked(
    app: tauri::AppHandle,
    path: String,
    blocked: bool,
) -> Result<bool, String> {
    run_blocking(move || {
        let entry = crate::storage::ensure(&app, path)?;
        if blocked {
            crate::firewall::block(&entry.id, &entry.path)?;
        } else {
            crate::firewall::unblock(&entry.id)?;
        }
        let actual = crate::firewall::is_blocked(&entry.id)?;
        if actual != blocked {
            return Err("Windows Firewall did not confirm the requested state.".into());
        }
        crate::logging::info(
            "firewall",
            &format!("Network access set to blocked={blocked} for {}", entry.id),
        );
        Ok(actual)
    })
    .await
}

#[tauri::command]
pub async fn initialize_session(
    app: tauri::AppHandle,
) -> Result<crate::recovery::StartupRecoveryReport, String> {
    run_blocking(move || {
        let entries = crate::storage::load(&app)?;
        let report = crate::recovery::recover_entries(
            &entries,
            crate::firewall::is_blocked,
            crate::firewall::unblock,
        );
        crate::logging::info(
            "recovery",
            &format!(
                "Restored access for {} saved executable(s); {} failure(s)",
                report.restored_paths.len(),
                report.failures.len()
            ),
        );
        Ok(report)
    })
    .await
}

#[tauri::command]
pub async fn remove_entry(app: tauri::AppHandle, path: String) -> Result<(), String> {
    run_blocking(move || {
        if let Some(entry) = crate::storage::find_by_path(&app, &path)? {
            crate::firewall::unblock(&entry.id)?;
            crate::storage::remove_by_id(&app, &entry.id)?;
            crate::logging::info(
                "storage",
                &format!("Removed executable entry id={}", entry.id),
            );
        }
        Ok(())
    })
    .await
}

#[tauri::command]
pub async fn unblock_all(app: tauri::AppHandle) -> Result<(), String> {
    run_blocking(move || {
        let entries = crate::storage::load(&app)?;
        let entry_count = entries.len();
        let mut failures = Vec::new();
        for entry in entries {
            if let Err(error) = crate::firewall::unblock(&entry.id) {
                failures.push(format!("{}: {error}", entry.path));
            }
        }
        if failures.is_empty() {
            crate::logging::info(
                "firewall",
                &format!("Unblocked all {entry_count} saved executable(s)"),
            );
            Ok(())
        } else {
            Err(format!(
                "Could not unblock all programs: {}",
                failures.join("; ")
            ))
        }
    })
    .await
}

#[tauri::command]
pub async fn add_executable(app: tauri::AppHandle, path: String) -> Result<(), String> {
    run_blocking(move || {
        let path_ref = PathBuf::from(&path);
        if !path_ref.is_file()
            || path_ref
                .extension()
                .is_none_or(|extension| !extension.eq_ignore_ascii_case("exe"))
        {
            return Err("Select an existing .exe file.".into());
        }
        let canonical = path_ref
            .canonicalize()
            .map_err(|error| format!("Could not resolve executable path: {error}"))?
            .to_string_lossy()
            .to_string();
        crate::storage::add(&app, canonical.clone())?;
        crate::logging::info("storage", "Added executable entry");
        Ok(())
    })
    .await
}

#[tauri::command]
pub async fn list_blocked_paths(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    run_blocking(move || {
        let mut paths = Vec::new();
        for entry in crate::storage::load(&app)? {
            if crate::firewall::is_blocked(&entry.id)? {
                paths.push(entry.path);
            }
        }
        Ok(paths)
    })
    .await
}
