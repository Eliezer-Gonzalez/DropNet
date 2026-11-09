use serde::{Deserialize, Serialize};
use std::{fs, path::PathBuf};
use tauri::Manager;
use uuid::Uuid;

#[derive(Clone, Serialize, Deserialize)]
pub struct Entry {
    pub id: String,
    pub path: String,
}

fn data_file(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let directory = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;
    fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
    Ok(directory.join("entries.json"))
}

pub fn load(app: &tauri::AppHandle) -> Result<Vec<Entry>, String> {
    let file = data_file(app)?;
    if !file.exists() {
        return Ok(Vec::new());
    }
    let contents = fs::read_to_string(file).map_err(|error| error.to_string())?;
    serde_json::from_str(&contents)
        .map_err(|error| format!("Could not read saved programs: {error}"))
}

fn save(app: &tauri::AppHandle, entries: &[Entry]) -> Result<(), String> {
    let file = data_file(app)?;
    let contents = serde_json::to_string_pretty(entries).map_err(|error| error.to_string())?;
    fs::write(file, contents).map_err(|error| format!("Could not save programs: {error}"))
}

pub fn add(app: &tauri::AppHandle, path: String) -> Result<(), String> {
    let mut entries = load(app)?;
    if entries
        .iter()
        .any(|entry| entry.path.eq_ignore_ascii_case(&path))
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
        .find(|entry| entry.path.eq_ignore_ascii_case(&path))
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
        .find(|entry| entry.path.eq_ignore_ascii_case(path)))
}

pub fn remove_by_id(app: &tauri::AppHandle, id: &str) -> Result<(), String> {
    let mut entries = load(app)?;
    entries.retain(|entry| entry.id != id);
    save(app, &entries)
}
