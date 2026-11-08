use sysinfo::{Pid, ProcessRefreshKind, ProcessesToUpdate, RefreshKind, System};

pub struct ProcessInfo {
    pub pid: u32,
    pub parent_pid: Option<u32>,
    pub name: String,
    pub path: Option<String>,
}

pub fn list() -> Vec<ProcessInfo> {
    let mut system = System::new_with_specifics(
        RefreshKind::nothing().with_processes(ProcessRefreshKind::everything()),
    );
    system.refresh_processes(ProcessesToUpdate::All, true);
    system
        .processes()
        .iter()
        .map(|(pid, process)| ProcessInfo {
            pid: pid.as_u32(),
            parent_pid: process.parent().map(Pid::as_u32),
            name: process.name().to_string_lossy().into_owned(),
            path: process
                .exe()
                .map(|path| path.to_string_lossy().into_owned()),
        })
        .collect()
}
