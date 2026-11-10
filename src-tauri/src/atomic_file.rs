use std::{
    fs::{self, File, OpenOptions},
    io::{self, Write},
    path::{Path, PathBuf},
};
use uuid::Uuid;

pub fn write_with_backup(file: &Path, backup: &Path, contents: &[u8]) -> io::Result<()> {
    let new_contents = write_temp(file, contents)?;
    if file.exists() {
        let old_contents = match copy_to_temp(file) {
            Ok(temp) => temp,
            Err(error) => {
                let _ = fs::remove_file(&new_contents);
                return Err(error);
            }
        };
        if backup.exists() {
            if let Err(error) = fs::remove_file(backup) {
                let _ = fs::remove_file(&old_contents);
                let _ = fs::remove_file(&new_contents);
                return Err(error);
            }
        }
        if let Err(error) = atomic_replace(&old_contents, backup) {
            let _ = fs::remove_file(&old_contents);
            let _ = fs::remove_file(&new_contents);
            return Err(error);
        }
    }

    if let Err(error) = atomic_replace(&new_contents, file) {
        let _ = fs::remove_file(&new_contents);
        return Err(error);
    }
    Ok(())
}

pub fn replace(file: &Path, contents: &[u8]) -> io::Result<()> {
    let temporary = write_temp(file, contents)?;
    if let Err(error) = atomic_replace(&temporary, file) {
        let _ = fs::remove_file(temporary);
        return Err(error);
    }
    Ok(())
}

fn write_temp(file: &Path, contents: &[u8]) -> io::Result<PathBuf> {
    let parent = file
        .parent()
        .ok_or_else(|| io::Error::new(io::ErrorKind::InvalidInput, "Missing parent directory"))?;
    let name = file
        .file_name()
        .ok_or_else(|| io::Error::new(io::ErrorKind::InvalidInput, "Missing file name"))?
        .to_string_lossy();
    let temporary = parent.join(format!(".{name}.{}.tmp", Uuid::new_v4()));
    let mut handle = OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&temporary)?;
    if let Err(error) = handle.write_all(contents).and_then(|()| handle.sync_all()) {
        let _ = fs::remove_file(&temporary);
        return Err(error);
    }
    Ok(temporary)
}

fn copy_to_temp(file: &Path) -> io::Result<PathBuf> {
    let parent = file
        .parent()
        .ok_or_else(|| io::Error::new(io::ErrorKind::InvalidInput, "Missing parent directory"))?;
    let temporary = parent.join(format!(".backup.{}.tmp", Uuid::new_v4()));
    let mut source = File::open(file)?;
    let mut destination = OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&temporary)?;
    if let Err(error) = io::copy(&mut source, &mut destination)
        .and_then(|_| destination.flush())
        .and_then(|()| destination.sync_all())
    {
        let _ = fs::remove_file(&temporary);
        return Err(error);
    }
    Ok(temporary)
}

#[cfg(windows)]
fn atomic_replace(source: &Path, destination: &Path) -> io::Result<()> {
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::Storage::FileSystem::{
        MoveFileExW, ReplaceFileW, MOVEFILE_WRITE_THROUGH, REPLACEFILE_WRITE_THROUGH,
    };

    let source = source
        .as_os_str()
        .encode_wide()
        .chain(Some(0))
        .collect::<Vec<_>>();
    let destination_exists = destination.exists();
    let destination = destination
        .as_os_str()
        .encode_wide()
        .chain(Some(0))
        .collect::<Vec<_>>();
    let replaced = unsafe {
        if destination_exists {
            ReplaceFileW(
                destination.as_ptr(),
                source.as_ptr(),
                std::ptr::null(),
                REPLACEFILE_WRITE_THROUGH,
                std::ptr::null(),
                std::ptr::null(),
            )
        } else {
            MoveFileExW(
                source.as_ptr(),
                destination.as_ptr(),
                MOVEFILE_WRITE_THROUGH,
            )
        }
    };
    if replaced == 0 {
        Err(io::Error::last_os_error())
    } else {
        Ok(())
    }
}

#[cfg(not(windows))]
fn atomic_replace(source: &Path, destination: &Path) -> io::Result<()> {
    fs::rename(source, destination)
}

#[cfg(test)]
mod tests {
    use super::write_with_backup;
    use std::{fs, path::PathBuf};
    use uuid::Uuid;

    #[test]
    fn atomic_write_preserves_previous_valid_snapshot() {
        let directory: PathBuf = std::env::current_dir()
            .unwrap()
            .join("target")
            .join(format!("dropnet-storage-test-{}", Uuid::new_v4()));
        fs::create_dir_all(&directory).unwrap();
        let file = directory.join("entries.json");
        let backup = directory.join("entries.json.bak");
        write_with_backup(&file, &backup, b"old snapshot").unwrap();
        write_with_backup(&file, &backup, b"new snapshot").unwrap();

        assert_eq!(fs::read(&file).unwrap(), b"new snapshot");
        assert_eq!(fs::read(&backup).unwrap(), b"old snapshot");
        fs::remove_dir_all(directory).unwrap();
    }
}
