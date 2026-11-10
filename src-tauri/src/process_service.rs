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
            blocked.insert(crate::path_policy::path_key(&entry.path));
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
        .map(|entry| crate::path_policy::path_key(&entry.path))
        .collect::<HashSet<_>>();
    let mut icons = HashMap::new();
    let mut result = processes
        .into_iter()
        .map(|process| {
            let path_lower = process
                .path
                .as_deref()
                .map(crate::path_policy::path_key)
                .unwrap_or_default();
            let icon_data = process
                .path
                .as_deref()
                .filter(|path| crate::path_policy::is_safe_local_path(path))
                .and_then(|path| {
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
                file_exists: process.path.as_ref().is_none_or(|path| {
                    crate::path_policy::is_safe_local_path(path) && PathBuf::from(path).exists()
                }),
                blocked: blocked.contains(&path_lower),
                tracked: tracked_paths.contains(&path_lower),
                running: true,
                icon_data,
                path: process.path,
            }
        })
        .collect::<Vec<_>>();

    for entry in entries {
        if has_row_for_path(&result, &entry.path) {
            continue;
        }
        let path = PathBuf::from(&entry.path);
        let path_lower = crate::path_policy::path_key(&entry.path);
        let name = path
            .file_name()
            .map(|name| name.to_string_lossy().into_owned())
            .unwrap_or_else(|| entry.path.clone());
        let icon_data = if crate::path_policy::is_safe_local_path(&entry.path) {
            icons
                .entry(path_lower.clone())
                .or_insert_with(|| crate::icon::executable_icon(&entry.path))
                .clone()
        } else {
            None
        };
        result.push(ProcessRow {
            key: format!("entry-{}", entry.id),
            pid: 0,
            parent_pid: None,
            name,
            file_exists: crate::path_policy::is_safe_local_path(&entry.path) && path.exists(),
            blocked: blocked.contains(&path_lower),
            tracked: true,
            running: false,
            icon_data,
            path: Some(entry.path),
        });
    }
    Ok(result)
}

fn has_row_for_path(rows: &[ProcessRow], path: &str) -> bool {
    let expected = crate::path_policy::path_key(path);
    rows.iter().any(|row| {
        row.path
            .as_deref()
            .is_some_and(|row_path| crate::path_policy::path_key(row_path) == expected)
    })
}

#[cfg(test)]
mod tests {
    use super::{has_row_for_path, ProcessRow};
    use std::collections::HashSet;

    #[test]
    fn extended_and_regular_paths_match_for_tracking_and_deduplication() {
        let saved_path = r"\\?\C:\Users\Alice\app.exe";
        let live_path = r"C:\Users\Alice\app.exe";
        let tracked_paths = HashSet::from([crate::path_policy::path_key(saved_path)]);
        assert!(tracked_paths.contains(&crate::path_policy::path_key(live_path)));

        let rows = vec![ProcessRow {
            key: "123".into(),
            pid: 123,
            parent_pid: None,
            name: "app.exe".into(),
            path: Some(live_path.into()),
            icon_data: None,
            blocked: false,
            file_exists: true,
            tracked: true,
            running: true,
        }];
        assert!(has_row_for_path(&rows, saved_path));
    }
}
