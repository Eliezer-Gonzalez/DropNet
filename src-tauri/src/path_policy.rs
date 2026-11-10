use std::path::PathBuf;

fn drive_root(path: &str) -> Option<(char, String)> {
    let normalized = path.replace('/', "\\");
    let path = normalized.strip_prefix("\\\\?\\").unwrap_or(&normalized);
    let bytes = path.as_bytes();
    if bytes.len() < 3 || !bytes[0].is_ascii_alphabetic() || bytes[1] != b':' || bytes[2] != b'\\' {
        return None;
    }
    let drive = bytes[0] as char;
    Some((drive, format!("{drive}:\\")))
}

#[cfg(windows)]
fn is_local_drive(root: &str) -> bool {
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::Storage::FileSystem::GetDriveTypeW;

    let wide = std::ffi::OsStr::new(root)
        .encode_wide()
        .chain(Some(0))
        .collect::<Vec<_>>();
    matches!(unsafe { GetDriveTypeW(wide.as_ptr()) }, 2 | 3 | 5 | 6)
}

#[cfg(not(windows))]
fn is_local_drive(_root: &str) -> bool {
    false
}

#[cfg(windows)]
fn has_no_reparse_components(path: &str) -> bool {
    use std::os::windows::fs::MetadataExt;
    use windows_sys::Win32::Storage::FileSystem::FILE_ATTRIBUTE_REPARSE_POINT;

    let normalized = path.replace('/', "\\");
    let path = normalized.strip_prefix("\\\\?\\").unwrap_or(&normalized);
    let Some((_, root)) = drive_root(path) else {
        return false;
    };
    let mut current = PathBuf::from(root);
    for component in path[3..].split('\\').filter(|part| !part.is_empty()) {
        current.push(component);
        let Ok(metadata) = std::fs::symlink_metadata(&current) else {
            return false;
        };
        if metadata.file_attributes() & FILE_ATTRIBUTE_REPARSE_POINT != 0 {
            return false;
        }
    }
    true
}

#[cfg(not(windows))]
fn has_no_reparse_components(_path: &str) -> bool {
    false
}

/// Returns true only for an existing path on a local drive with no reparse-point component.
/// This check deliberately happens before file or Shell APIs can follow a network redirection.
pub fn is_safe_local_path(path: &str) -> bool {
    let Some((_, root)) = drive_root(path) else {
        return false;
    };
    is_local_drive(&root) && has_no_reparse_components(path)
}

#[cfg(windows)]
fn windows_directory() -> Option<String> {
    use std::os::windows::ffi::OsStringExt;
    use windows_sys::Win32::System::SystemInformation::GetWindowsDirectoryW;

    let mut buffer = vec![0u16; 32_768];
    let length = unsafe { GetWindowsDirectoryW(buffer.as_mut_ptr(), buffer.len() as u32) } as usize;
    if length == 0 || length >= buffer.len() {
        return None;
    }
    Some(
        std::ffi::OsString::from_wide(&buffer[..length])
            .to_string_lossy()
            .into_owned(),
    )
}

#[cfg(not(windows))]
fn windows_directory() -> Option<String> {
    None
}

pub fn path_key(path: &str) -> String {
    let normalized = path.replace('/', "\\");
    normalized
        .strip_prefix("\\\\?\\")
        .unwrap_or(&normalized)
        .trim_end_matches('\\')
        .to_lowercase()
}

pub fn paths_equal(first: &str, second: &str) -> bool {
    path_key(first) == path_key(second)
}

fn is_within_directory(path: &str, directory: &str) -> bool {
    let path = path_key(path);
    let directory = path_key(directory);
    path == directory
        || path
            .strip_prefix(&directory)
            .is_some_and(|suffix| suffix.starts_with('\\'))
}

/// Resolves an existing local executable before it is persisted or used in Firewall rules.
pub fn canonical_local_executable(
    path: &str,
    reject_windows_directory: bool,
) -> Result<String, String> {
    if !is_safe_local_path(path) {
        return Err("Network, device, or redirected executable paths are not supported.".into());
    }

    let path_ref = PathBuf::from(path);
    if path_ref
        .extension()
        .is_none_or(|extension| !extension.eq_ignore_ascii_case("exe"))
    {
        return Err("Select an existing .exe file.".into());
    }
    if !path_ref.is_file() {
        return Err("Select an existing .exe file.".into());
    }

    let canonical = path_ref
        .canonicalize()
        .map_err(|error| format!("Could not resolve executable path: {error}"))?;
    let canonical_text = canonical.to_string_lossy().into_owned();
    if !is_safe_local_path(&canonical_text) {
        return Err("Network, device, or redirected executable paths are not supported.".into());
    }
    if reject_windows_directory {
        let directory = windows_directory().ok_or_else(|| {
            "Could not verify the Windows directory; blocking was denied.".to_string()
        })?;
        if is_within_directory(&canonical_text, &directory) {
            return Err("Executables inside the Windows directory cannot be blocked.".into());
        }
    }
    Ok(canonical_text)
}

#[cfg(test)]
mod tests {
    use super::{canonical_local_executable, drive_root, is_safe_local_path, is_within_directory};

    #[test]
    fn accepts_only_drive_rooted_local_path_syntax() {
        assert_eq!(drive_root(r"C:\Program Files\app.exe").unwrap().0, 'C');
        assert_eq!(drive_root(r"\\?\C:\Program Files\app.exe").unwrap().0, 'C');
        assert!(drive_root(r"\\server\share\app.exe").is_none());
        assert!(drive_root(r"\\?\UNC\server\share\app.exe").is_none());
        assert!(drive_root(r"C:app.exe").is_none());
        assert!(drive_root(r"\Device\HarddiskVolume1\app.exe").is_none());
    }

    #[test]
    fn windows_directory_match_requires_a_path_boundary() {
        assert!(is_within_directory(
            r"\\?\C:\Windows\System32\svchost.exe",
            r"C:\Windows"
        ));
        assert!(is_within_directory(
            r"C:/Windows/System32/a.exe",
            r"C:\Windows"
        ));
        assert!(!is_within_directory(
            r"C:\WindowsApps\app.exe",
            r"C:\Windows"
        ));
        assert!(!is_within_directory(r"D:\Windows\app.exe", r"C:\Windows"));
    }

    #[cfg(windows)]
    #[test]
    fn accepts_the_current_executable_as_a_local_program() {
        let path = std::env::current_exe()
            .unwrap()
            .to_string_lossy()
            .into_owned();
        let (_, root) = drive_root(&path).unwrap();
        assert!(
            super::is_local_drive(&root),
            "unexpected drive root: {root}"
        );
        assert!(
            super::has_no_reparse_components(&path),
            "unexpected reparse path: {path}"
        );
        assert!(is_safe_local_path(&path));
        assert!(canonical_local_executable(&path, true).is_ok());
    }

    #[test]
    fn rejects_unc_before_any_filesystem_query() {
        assert!(!is_safe_local_path(r"\\server\share\app.exe"));
        assert!(canonical_local_executable(r"\\server\share\app.exe", false).is_err());
    }
}
