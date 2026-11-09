#[cfg(not(windows))]
use std::time::{SystemTime, UNIX_EPOCH};
use std::{
    fs::{self, File, OpenOptions},
    io::Write,
    path::{Path, PathBuf},
    sync::{Mutex, OnceLock},
};
use tauri::Manager;

const MAX_FILE_SIZE: u64 = 1024 * 1024;
const MAX_ARCHIVES: u8 = 5;

struct FileLogger {
    active_path: PathBuf,
    file: Option<File>,
}

static LOGGER: OnceLock<Mutex<FileLogger>> = OnceLock::new();

pub fn initialize(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    if LOGGER.get().is_some() {
        return LOGGER
            .get()
            .expect("logger was checked above")
            .lock()
            .map(|logger| logger.active_path.clone())
            .map_err(|_| "The log file lock is unavailable.".to_string());
    }

    let preferred_directory = app.path().app_log_dir().ok();
    let fallback_directory = std::env::temp_dir().join("DropNet").join("logs");
    let candidates = preferred_directory
        .into_iter()
        .chain(std::iter::once(fallback_directory));
    let mut failures = Vec::new();

    for directory in candidates {
        if let Err(error) = fs::create_dir_all(&directory) {
            failures.push(format!("{}: {error}", directory.display()));
            continue;
        }
        let active_path = directory.join("dropnet.log");
        match open_log_file(&active_path) {
            Ok(file) => {
                LOGGER
                    .set(Mutex::new(FileLogger {
                        active_path: active_path.clone(),
                        file: Some(file),
                    }))
                    .map_err(|_| "The log file was initialized more than once.".to_string())?;
                return Ok(active_path);
            }
            Err(error) => failures.push(format!("{}: {error}", active_path.display())),
        }
    }

    Err(format!(
        "Could not create a log file: {}",
        failures.join("; ")
    ))
}

pub fn info(category: &str, message: &str) {
    write_record("INFO", category, message);
}

pub fn warn(category: &str, message: &str) {
    write_record("WARN", category, message);
}

pub fn error(category: &str, message: &str) {
    write_record("ERROR", category, message);
}

fn write_record(level: &str, category: &str, message: &str) {
    let Some(logger) = LOGGER.get() else {
        eprintln!("[{}] [{}] {}", level, category, clean(message, 8_000));
        return;
    };
    let Ok(mut logger) = logger.lock() else {
        return;
    };

    let line = format!(
        "{} [{}] [{}] {}\r\n",
        timestamp(),
        clean(level, 8),
        clean(category, 64),
        clean(message, 8_000)
    );
    let active_length = logger
        .file
        .as_ref()
        .and_then(|file| file.metadata().ok())
        .map_or(0, |metadata| metadata.len());
    if active_length + line.len() as u64 > MAX_FILE_SIZE {
        logger.rotate();
    }
    if logger.file.is_none() {
        logger.file = open_log_file(&logger.active_path).ok();
    }
    if let Some(file) = logger.file.as_mut() {
        let _ = file.write_all(line.as_bytes());
        let _ = file.flush();
    }
}

impl FileLogger {
    fn rotate(&mut self) {
        if let Some(mut file) = self.file.take() {
            let _ = file.flush();
        }

        for archive_index in (1..=MAX_ARCHIVES).rev() {
            let source = if archive_index == 1 {
                self.active_path.clone()
            } else {
                archive_path(&self.active_path, archive_index - 1)
            };
            let destination = archive_path(&self.active_path, archive_index);
            if !source.exists() {
                continue;
            }
            let _ = fs::remove_file(&destination);
            let _ = fs::rename(source, destination);
        }

        self.file = open_log_file(&self.active_path).ok();
    }
}

fn open_log_file(path: &Path) -> std::io::Result<File> {
    OpenOptions::new().create(true).append(true).open(path)
}

fn archive_path(active_path: &Path, index: u8) -> PathBuf {
    active_path.with_file_name(format!("dropnet.{index}.log"))
}

fn clean(value: &str, max_chars: usize) -> String {
    crate::log_privacy::redact_paths(value)
        .chars()
        .map(|character| {
            if character.is_control() {
                ' '
            } else {
                character
            }
        })
        .take(max_chars)
        .collect()
}

#[cfg(windows)]
fn timestamp() -> String {
    use windows_sys::Win32::{Foundation::SYSTEMTIME, System::SystemInformation::GetLocalTime};

    let mut local_time = unsafe { std::mem::zeroed::<SYSTEMTIME>() };
    unsafe { GetLocalTime(&mut local_time) };
    format!(
        "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}.{:03}",
        local_time.wYear,
        local_time.wMonth,
        local_time.wDay,
        local_time.wHour,
        local_time.wMinute,
        local_time.wSecond,
        local_time.wMilliseconds
    )
}

#[cfg(not(windows))]
fn timestamp() -> String {
    let seconds = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    format!("unix:{seconds}Z")
}
