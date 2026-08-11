use std::sync::{Arc, Mutex};

use tauri::State;
use tauri_plugin_autostart::ManagerExt;

use crate::app_config;
use crate::commands::error::IpcError;
use crate::db::queries::settings::{self, ResetSummary};
use crate::state::AppState;

/// Formerly `DELETE /settings/data` — wipe all students, events, attendance.
#[tauri::command]
pub async fn reset_all_data(
    state: State<'_, Arc<Mutex<AppState>>>,
) -> Result<ResetSummary, IpcError> {
    let db_path = state.lock().unwrap().db_path.clone();
    settings::reset_all_data(&db_path).map_err(IpcError::new)
}

/// Read the persisted app preferences (kiosk, auto-start).
#[tauri::command]
pub async fn get_app_settings(
    state: State<'_, Arc<Mutex<AppState>>>,
) -> Result<app_config::AppSettings, IpcError> {
    let data_dir = state.lock().unwrap().data_dir.clone();
    Ok(app_config::load(&data_dir))
}

/// Turn auto-start on/off (Windows HKCU Run key — no admin rights) and
/// persist the preference.
#[tauri::command]
pub async fn set_auto_start(
    app_handle: tauri::AppHandle,
    state: State<'_, Arc<Mutex<AppState>>>,
    enabled: bool,
) -> Result<(), IpcError> {
    if enabled {
        app_handle
            .autolaunch()
            .enable()
            .map_err(|e| IpcError::new(e.to_string()))?;
    } else {
        app_handle
            .autolaunch()
            .disable()
            .map_err(|e| IpcError::new(e.to_string()))?;
    }

    let data_dir = state.lock().unwrap().data_dir.clone();
    let mut settings = app_config::load(&data_dir);
    settings.auto_start = enabled;
    app_config::save(&data_dir, &settings)?;
    Ok(())
}
