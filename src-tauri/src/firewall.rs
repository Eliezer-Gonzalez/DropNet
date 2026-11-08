use std::process::{Command, Output};

const PREFIX: &str = "DropNet-";

fn run(args: &[&str]) -> Result<Output, String> {
    let mut command = Command::new("netsh");
    command.args(args);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x08000000);
    }
    command
        .output()
        .map_err(|error| format!("No se pudo ejecutar Windows Firewall: {error}"))
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
        Err(format!(
            "Windows Firewall rechazó la regla para {path}. Ejecuta DropNet como administrador."
        ))
    }
}

pub fn block(id: &str, path: &str) -> Result<(), String> {
    let outbound = rule_name(id, "out");
    let inbound = rule_name(id, "in");
    add_rule(&outbound, path, "out")?;
    if let Err(error) = add_rule(&inbound, path, "in") {
        let _ = delete_rule(&outbound);
        return Err(error);
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
    out.and(inbound)
}

pub fn is_blocked(id: &str) -> Result<bool, String> {
    let mut found = false;
    for direction in ["out", "in"] {
        let name = rule_name(id, direction);
        let rule = format!("name={name}");
        found |= run(&["advfirewall", "firewall", "show", "rule", &rule])?
            .status
            .success();
    }
    Ok(found)
}
