use serde::Serialize;

pub fn recover_entries(
    entries: &[crate::storage::Entry],
    mut is_blocked: impl FnMut(&str) -> Result<bool, String>,
    mut unblock: impl FnMut(&str) -> Result<(), String>,
) -> StartupRecoveryReport {
    let mut report = StartupRecoveryReport::default();
    for entry in entries {
        let is_stale = match is_blocked(&entry.id) {
            Ok(is_blocked) => is_blocked,
            Err(error) => {
                let cleanup_result = unblock(&entry.id);
                let detail = match cleanup_result {
                    Ok(()) => format!(
                        "Could not confirm whether DropNet rules existed ({error}); scoped cleanup was attempted successfully, but prior rules could not be confirmed."
                    ),
                    Err(cleanup_error) => format!(
                        "Could not confirm whether DropNet rules existed ({error}); scoped cleanup also failed: {cleanup_error}"
                    ),
                };
                report.failures.push(RecoveryFailure {
                    path: entry.path.clone(),
                    detail,
                });
                continue;
            }
        };
        if !is_stale {
            continue;
        }
        report.stale_paths.push(entry.path.clone());
        match unblock(&entry.id) {
            Ok(()) => report.restored_paths.push(entry.path.clone()),
            Err(error) => report.failures.push(RecoveryFailure {
                path: entry.path.clone(),
                detail: error,
            }),
        }
    }
    report
}

#[derive(Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StartupRecoveryReport {
    pub configuration_recovered: bool,
    pub stale_paths: Vec<String>,
    pub restored_paths: Vec<String>,
    pub failures: Vec<RecoveryFailure>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecoveryFailure {
    pub path: String,
    pub detail: String,
}

#[cfg(test)]
mod tests {
    use super::recover_entries;
    use crate::storage::Entry;

    #[test]
    fn startup_recovery_only_unblocks_saved_entries_with_existing_rules() {
        let entries = vec![
            Entry {
                id: "parent".into(),
                path: "C:\\apps\\parent.exe".into(),
            },
            Entry {
                id: "child".into(),
                path: "C:\\apps\\child.exe".into(),
            },
            Entry {
                id: "allowed".into(),
                path: "C:\\apps\\allowed.exe".into(),
            },
        ];
        let mut unblocked_ids = Vec::new();
        let report = recover_entries(
            &entries,
            |id| Ok(id != "allowed"),
            |id| {
                unblocked_ids.push(id.to_string());
                Ok(())
            },
        );

        assert_eq!(unblocked_ids, ["parent", "child"]);
        assert_eq!(
            report.stale_paths,
            ["C:\\apps\\parent.exe", "C:\\apps\\child.exe"]
        );
        assert_eq!(report.restored_paths, report.stale_paths);
        assert!(report.failures.is_empty());
    }

    #[test]
    fn startup_recovery_attempts_cleanup_after_query_error_and_continues() {
        let entries = vec![
            Entry {
                id: "query-failure".into(),
                path: "C:\\apps\\unknown.exe".into(),
            },
            Entry {
                id: "blocked".into(),
                path: "C:\\apps\\blocked.exe".into(),
            },
            Entry {
                id: "allowed".into(),
                path: "C:\\apps\\allowed.exe".into(),
            },
        ];
        let mut attempted_cleanup_ids = Vec::new();
        let report = recover_entries(
            &entries,
            |id| {
                if id == "query-failure" {
                    Err("query failed".into())
                } else {
                    Ok(id == "blocked")
                }
            },
            |id| {
                attempted_cleanup_ids.push(id.to_string());
                Ok(())
            },
        );

        assert_eq!(attempted_cleanup_ids, ["query-failure", "blocked"]);
        assert_eq!(report.stale_paths, ["C:\\apps\\blocked.exe"]);
        assert_eq!(report.restored_paths, ["C:\\apps\\blocked.exe"]);
        assert_eq!(report.failures.len(), 1);
        assert_eq!(report.failures[0].path, "C:\\apps\\unknown.exe");
        assert!(report.failures[0].detail.contains("query failed"));
        assert!(report.failures[0].detail.contains("attempted successfully"));
    }
}
