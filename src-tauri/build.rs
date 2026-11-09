fn main() {
    #[cfg(target_os = "windows")]
    if std::env::var("PROFILE").as_deref() == Ok("release") {
        embed_resource::compile("windows/app.rc", embed_resource::NONE)
            .manifest_required()
            .expect("failed to embed the administrator manifest");
    }
    tauri_build::build();
}
