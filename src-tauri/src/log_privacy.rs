// Logs retain operation/error context while omitting absolute Windows paths.
pub fn redact_paths(message: &str) -> String {
    let mut output = String::new();
    let mut chars = message.chars().peekable();
    let mut active_quote = None;
    while let Some(ch) = chars.next() {
        let rest: String = chars.clone().take(3).collect();
        let drive = ch.is_ascii_alphabetic() && (rest.starts_with(":\\") || rest.starts_with(":/"));
        let unc = ch == '\\' && rest.starts_with('\\');
        if drive || unc {
            if drive {
                chars.next();
            }
            output.push_str("[path redacted]");
            let path_quote = active_quote;
            while let Some(&next) = chars.peek() {
                if let Some(quote) = path_quote {
                    if quote == '"' && next == quote {
                        break;
                    }
                    if quote == '\'' && next == ':' {
                        break;
                    }
                } else {
                    if matches!(next, '\n' | '\r' | '"' | ':') {
                        break;
                    }
                }
                chars.next();
            }
            if path_quote == Some('\'') {
                active_quote = None;
            }
        } else {
            if matches!(ch, '"' | '\'') {
                if active_quote == Some(ch) {
                    active_quote = None;
                } else if active_quote.is_none() {
                    active_quote = Some(ch);
                }
            }
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

    #[test]
    fn paths_with_parentheses_are_redacted_without_leaking_the_suffix() {
        let result = super::redact_paths(
            r#"failed for "C:\Program Files (x86)\Private\tool.exe": OS error 5"#,
        );
        assert!(!result.contains("x86"));
        assert!(!result.contains("Private"));
        assert!(result.contains("OS error 5"));
    }

    #[test]
    fn unquoted_paths_keep_error_text_after_a_colon() {
        let result = super::redact_paths(r"error en C:\Users\Pepe\app.exe: acceso denegado");
        assert!(!result.contains("Pepe"));
        assert!(result.contains("acceso denegado"));
    }

    #[test]
    fn unquoted_paths_with_valid_punctuation_are_fully_redacted() {
        for path in [
            r"C:\Users\O'Brien\Private\app.exe",
            r"C:\apps\project;private\app.exe",
        ] {
            let result = super::redact_paths(&format!("error en {path}: acceso denegado"));
            assert!(!result.contains("O'Brien"));
            assert!(!result.contains("project;private"));
            assert!(result.contains("acceso denegado"));
        }
    }

    #[test]
    fn quoted_paths_with_apostrophes_and_closing_parentheses_are_redacted() {
        let result = super::redact_paths(
            "error en 'C:\\Users\\O'Brien\\Private)\\app.exe': acceso denegado",
        );
        assert!(!result.contains("O'Brien"));
        assert!(!result.contains("Private)"));
        assert!(result.contains("acceso denegado"));
    }
}
