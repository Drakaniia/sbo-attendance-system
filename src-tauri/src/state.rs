use std::path::PathBuf;

/// Shared application state that Tauri commands and axum handlers can access.
pub struct AppState {
    pub db_path: PathBuf,
    pub data_dir: PathBuf,
}
