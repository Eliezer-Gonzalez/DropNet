use serde::Serialize;
use std::{
    collections::{HashMap, HashSet},
    path::PathBuf,
};
use tauri::AppHandle;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessRow {
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

pub fn list(app: &AppHandle, show_windows: bool) -> Result<Vec<ProcessRow>, String> {
    let entries = crate::storage::load(app)?;
    let mut blocked = HashSet::new();
    for entry in &entries {
        if crate::firewall::is_blocked(&entry.id)? {
            blocked.insert(entry.path.to_lowercase());
        }
    }

    let windows_dir = std::env::var("WINDIR")
        .unwrap_or_else(|_| "C:\\Windows".to_string())
        .trim_end_matches(['\\', '/'])
        .to_lowercase();
    let mut processes = crate::process::list();
    processes.retain(|process| {
        show_windows
            || process.path.as_ref().is_some_and(|path| {
                let path = path.to_lowercase();
                !(path.starts_with(&windows_dir)
                    && path
                        .as_bytes()
                        .get(windows_dir.len())
                        .is_some_and(|byte| *byte == b'\\' || *byte == b'/'))
            })
    });

    let tracked_paths = entries
        .iter()
        .map(|entry| entry.path.to_lowercase())
        .collect::<HashSet<_>>();
    let mut icons = HashMap::new();
    let mut result = processes
        .into_iter()
        .map(|process| {
            let path_lower = process.path.as_deref().unwrap_or_default().to_lowercase();
            let icon_data = process.path.as_deref().and_then(|path| {
                icons
                    .entry(path_lower.clone())
                    .or_insert_with(|| crate::icon::executable_icon(path))
                    .clone()
            });
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
                tracked: tracked_paths.contains(&path_lower),
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
        let icon_data = icons
            .entry(path_lower.clone())
            .or_insert_with(|| crate::icon::executable_icon(&entry.path))
            .clone();
        result.push(ProcessRow {
            key: format!("entry-{}", entry.id),
            pid: 0,
            parent_pid: None,
            name,
            file_exists: path.exists(),
            blocked: blocked.contains(&path_lower),
            tracked: true,
            running: false,
            icon_data,
            path: Some(entry.path),
        });
    }
    Ok(result)
}
