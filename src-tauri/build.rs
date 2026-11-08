fn main() {
    #[cfg(target_os = "windows")]
    if std::env::var("PROFILE").as_deref() == Ok("release") {
        let _ = embed_resource::compile("windows/app.rc", embed_resource::NONE);
    }
    tauri_build::build();
}
