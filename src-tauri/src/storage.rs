use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::{Path, PathBuf},
};
use tauri::Manager;
use uuid::Uuid;

#[derive(Clone, Serialize, Deserialize)]
pub struct Entry {
    pub id: String,
    pub path: String,
}

pub struct LoadedEntries {
    pub entries: Vec<Entry>,
    pub recovered_from_backup: bool,
}

fn data_file(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let directory = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;
    fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
    Ok(directory.join("entries.json"))
}

fn backup_file(file: &Path) -> PathBuf {
    file.with_file_name("entries.json.bak")
}

fn parse_entries(file: &Path) -> Result<Vec<Entry>, String> {
    let contents = fs::read_to_string(file).map_err(|error| error.to_string())?;
    serde_json::from_str(&contents).map_err(|error| error.to_string())
}

fn restore_backup(file: &Path, primary_error: Option<String>) -> Result<Vec<Entry>, String> {
    let backup = backup_file(file);
    let entries = parse_entries(&backup).map_err(|backup_error| {
        match primary_error {
            Some(primary_error) => format!(
                "Could not read saved programs ({primary_error}); backup recovery also failed ({backup_error})."
            ),
            None => format!("Could not restore saved programs from backup: {backup_error}."),
        }
    })?;

    if file.exists() {
        let quarantined = file.with_file_name(format!("entries.json.corrupt-{}", Uuid::new_v4()));
        fs::rename(file, quarantined)
            .map_err(|error| format!("Could not preserve the damaged program list: {error}"))?;
    }

    let contents = serde_json::to_vec_pretty(&entries).map_err(|error| error.to_string())?;
    crate::atomic_file::replace(file, &contents)
        .map_err(|error| format!("Could not restore the saved program list: {error}"))?;
    crate::logging::warn(
        "storage",
        "Recovered the saved program list from its previous backup. Recent changes may be missing.",
    );
    Ok(entries)
}

pub fn load_with_status(app: &tauri::AppHandle) -> Result<LoadedEntries, String> {
    let file = data_file(app)?;
    if file.exists() {
        return match parse_entries(&file) {
            Ok(entries) => Ok(LoadedEntries {
                entries,
                recovered_from_backup: false,
            }),
            Err(error) => Ok(LoadedEntries {
                entries: restore_backup(&file, Some(error))?,
                recovered_from_backup: true,
            }),
        };
    }

    let backup = backup_file(&file);
    if backup.exists() {
        return Ok(LoadedEntries {
            entries: restore_backup(&file, None)?,
            recovered_from_backup: true,
        });
    }

    Ok(LoadedEntries {
        entries: Vec::new(),
        recovered_from_backup: false,
    })
}

pub fn load(app: &tauri::AppHandle) -> Result<Vec<Entry>, String> {
    load_primary(&data_file(app)?)
}

fn load_primary(file: &Path) -> Result<Vec<Entry>, String> {
    if file.exists() {
        return parse_entries(file).map_err(|error| {
            format!(
                "Could not read the saved program list ({error}). Restart DropNet to attempt backup recovery before managing Firewall rules."
            )
        });
    }

    if backup_file(file).exists() {
        return Err(
            "The saved program list is missing while a backup exists. Restart DropNet to attempt backup recovery before managing Firewall rules."
                .into(),
        );
    }
    Ok(Vec::new())
}

fn save(app: &tauri::AppHandle, entries: &[Entry]) -> Result<(), String> {
    let file = data_file(app)?;
    let contents = serde_json::to_vec_pretty(entries).map_err(|error| error.to_string())?;
    crate::atomic_file::write_with_backup(&file, &backup_file(&file), &contents)
        .map_err(|error| format!("Could not save programs: {error}"))
}

pub fn add(app: &tauri::AppHandle, path: String) -> Result<(), String> {
    let mut entries = load(app)?;
    if entries
        .iter()
        .any(|entry| crate::path_policy::paths_equal(&entry.path, &path))
    {
        return Err("This executable is already in the list.".into());
    }
    entries.push(Entry {
        id: Uuid::new_v4().to_string(),
        path,
    });
    save(app, &entries)
}

pub fn ensure(app: &tauri::AppHandle, path: String) -> Result<Entry, String> {
    let mut entries = load(app)?;
    if let Some(entry) = entries
        .iter()
        .find(|entry| crate::path_policy::paths_equal(&entry.path, &path))
    {
        return Ok(entry.clone());
    }
    let entry = Entry {
        id: Uuid::new_v4().to_string(),
        path,
    };
    entries.push(entry.clone());
    save(app, &entries)?;
    Ok(entry)
}

pub fn find_by_path(app: &tauri::AppHandle, path: &str) -> Result<Option<Entry>, String> {
    Ok(load(app)?
        .into_iter()
        .find(|entry| crate::path_policy::paths_equal(&entry.path, path)))
}

pub fn remove_by_id(app: &tauri::AppHandle, id: &str) -> Result<(), String> {
    let mut entries = load(app)?;
    entries.retain(|entry| entry.id != id);
    save(app, &entries)
}

#[cfg(test)]
mod tests {
    use super::{backup_file, load_primary, parse_entries, restore_backup, Entry};
    use std::{fs, path::PathBuf};
    use uuid::Uuid;

    fn test_directory() -> PathBuf {
        std::env::current_dir()
            .unwrap()
            .join("target")
            .join(format!("dropnet-storage-test-{}", Uuid::new_v4()))
    }

    #[test]
    fn corrupt_primary_is_quarantined_and_recovered_from_backup() {
        let directory = test_directory();
        fs::create_dir_all(&directory).unwrap();
        let file = directory.join("entries.json");
        let backup = backup_file(&file);
        let entry = Entry {
            id: Uuid::new_v4().to_string(),
            path: "C:\\apps\\sample.exe".into(),
        };
        fs::write(&file, b"invalid json").unwrap();
        fs::write(&backup, serde_json::to_vec(&[entry.clone()]).unwrap()).unwrap();

        let recovered = restore_backup(&file, Some("invalid json".into())).unwrap();
        assert_eq!(recovered[0].id, entry.id);
        assert_eq!(parse_entries(&file).unwrap()[0].id, entry.id);
        assert!(fs::read_dir(&directory)
            .unwrap()
            .filter_map(Result::ok)
            .any(|item| item
                .file_name()
                .to_string_lossy()
                .starts_with("entries.json.corrupt-")));
        fs::remove_dir_all(directory).unwrap();
    }

    #[test]
    fn runtime_load_does_not_silently_restore_a_stale_backup() {
        let directory = test_directory();
        fs::create_dir_all(&directory).unwrap();
        let file = directory.join("entries.json");
        let backup = backup_file(&file);
        fs::write(&file, b"invalid json").unwrap();
        fs::write(&backup, b"[]").unwrap();

        let error = match load_primary(&file) {
            Ok(_) => panic!("runtime loading must not recover from a backup"),
            Err(error) => error,
        };
        assert!(error.contains("Restart DropNet"));
        assert_eq!(fs::read(&file).unwrap(), b"invalid json");
        assert_eq!(fs::read(&backup).unwrap(), b"[]");
        fs::remove_dir_all(directory).unwrap();
    }
}
