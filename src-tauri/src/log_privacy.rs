// Logs retain operation/error context while omitting absolute Windows paths.
pub fn redact_paths(message: &str) -> String {
    let mut output = String::new();
    let mut chars = message.chars().peekable();
    while let Some(ch) = chars.next() {
        let rest: String = chars.clone().take(3).collect();
        let drive = ch.is_ascii_alphabetic() && (rest.starts_with(":\\") || rest.starts_with(":/"));
        let unc = ch == '\\' && rest.starts_with('\\');
        if drive || unc {
            if drive {
                chars.next();
            }
            output.push_str("[path redacted]");
            while let Some(&next) = chars.peek() {
                if matches!(next, '\n' | '\r' | '"' | '\'' | ';' | ':' | ')') {
                    break;
                }
                chars.next();
            }
        } else {
            output.push(ch);
        }
    }
    output
}

#[cfg(test)]
mod tests {
    #[test]
    fn paths_removed_but_error_context_preserved() {
        let result = super::redact_paths(
            r#"failed for "C:\Users\Alice Smith\Private\tool.exe": OS error 5"#,
        );
        assert!(!result.contains("Alice"));
        assert!(!result.contains("Private"));
        assert!(result.contains("OS error 5"));
        assert_eq!(
            super::redact_paths("permission denied: error 5"),
            "permission denied: error 5"
        );
        assert!(!super::redact_paths(r"failed: \\server\private\file.exe").contains("server"));
    }
}
