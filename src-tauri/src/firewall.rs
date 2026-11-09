use std::process::{Command, Output};

const PREFIX: &str = "DropNet-";

#[cfg(windows)]
fn system_netsh() -> Result<std::path::PathBuf, String> {
    use std::os::windows::ffi::OsStringExt;
    use windows_sys::Win32::System::SystemInformation::GetSystemDirectoryW;
    let mut buffer = vec![0u16; 32768];
    let length = unsafe { GetSystemDirectoryW(buffer.as_mut_ptr(), buffer.len() as u32) } as usize;
    if length == 0 || length >= buffer.len() {
        return Err("Could not resolve the protected Windows system directory.".into());
    }
    // Windows resolves the architecture-appropriate protected directory, including WOW64.
    Ok(
        std::path::PathBuf::from(std::ffi::OsString::from_wide(&buffer[..length]))
            .join("netsh.exe"),
    )
}

#[cfg(not(windows))]
fn system_netsh() -> Result<std::path::PathBuf, String> {
    Err("Windows Firewall is only supported on Windows.".into())
}

fn run(args: &[&str]) -> Result<Output, String> {
    let mut command = Command::new(system_netsh()?);
    command.args(args);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x08000000);
    }
    command
        .output()
        .map_err(|error| format!("Could not start Windows Firewall: {error}"))
}

fn rule_name(id: &str, direction: &str) -> String {
    format!("{PREFIX}{id}-{direction}")
}

fn add_rule(name: &str, path: &str, direction: &str) -> Result<(), String> {
    let program = format!("program={path}");
    let rule = format!("name={name}");
    let output = run(&[
        "advfirewall",
        "firewall",
        "add",
        "rule",
        &rule,
        &format!("dir={direction}"),
        "action=block",
        &program,
        "enable=yes",
    ])?;
    if output.status.success() {
        Ok(())
    } else {
        Err(format!("Windows Firewall rejected the rule for {path}."))
    }
}

pub fn block(id: &str, path: &str) -> Result<(), String> {
    let outbound = rule_name(id, "out");
    let inbound = rule_name(id, "in");
    add_rule(&outbound, path, "out")?;
    if let Err(error) = add_rule(&inbound, path, "in") {
        let cleanup = [delete_rule(&outbound), delete_rule(&inbound)];
        let cleanup_errors = cleanup
            .into_iter()
            .filter_map(Result::err)
            .collect::<Vec<_>>();
        return if cleanup_errors.is_empty() {
            Err(error)
        } else {
            Err(format!(
                "{error} Could not clean up the partial rule either: {}",
                cleanup_errors.join("; ")
            ))
        };
    }
    Ok(())
}

fn delete_rule(name: &str) -> Result<(), String> {
    let rule = format!("name={name}");
    let _ = run(&["advfirewall", "firewall", "delete", "rule", &rule])?;
    Ok(())
}

pub fn unblock(id: &str) -> Result<(), String> {
    let out = delete_rule(&rule_name(id, "out"));
    let inbound = delete_rule(&rule_name(id, "in"));
    out.and(inbound)?;
    if is_blocked(id)? {
        return Err("Windows Firewall still reports active rules for this program.".into());
    }
    Ok(())
}

pub fn is_blocked(id: &str) -> Result<bool, String> {
    query_rules(id, |rule| {
        Ok(run(&["advfirewall", "firewall", "show", "rule", rule])?
            .status
            .success())
    })
}

fn query_rules(
    id: &str,
    mut query: impl FnMut(&str) -> Result<bool, String>,
) -> Result<bool, String> {
    let mut found = [false; 2];
    for (index, direction) in ["out", "in"].iter().enumerate() {
        found[index] = query(&format!("name={}", rule_name(id, direction)))?;
    }
    Ok(any_rule_exists(found))
}

fn any_rule_exists(found: [bool; 2]) -> bool {
    found.into_iter().any(|exists| exists)
}

#[cfg(all(test, windows))]
mod tests {
    #[test]
    fn query_failure_cannot_be_treated_as_clean() {
        let mut calls = 0;
        let result = super::query_rules("test-id", |rule| {
            assert!(rule.starts_with("name=DropNet-test-id-"));
            calls += 1;
            if calls == 1 {
                Ok(false)
            } else {
                Err("query failed".into())
            }
        });
        assert!(result.is_err());
        assert_eq!(calls, 2);
    }
    #[test]
    fn partial_rules_are_still_blocked() {
        for (rules, expected) in [
            ([false, false], false),
            ([true, false], true),
            ([false, true], true),
            ([true, true], true),
        ] {
            assert_eq!(super::any_rule_exists(rules), expected);
        }
    }
    #[test]
    fn netsh_is_absolute_and_outside_application_directory() {
        let path = super::system_netsh().unwrap();
        assert!(path.is_absolute());
        assert_eq!(path.file_name().unwrap(), "netsh.exe");
        assert_ne!(path.parent(), std::env::current_exe().unwrap().parent());
        assert!(path.is_file());
    }
}
