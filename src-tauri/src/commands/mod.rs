//! Tauri command layer — replaces the old axum HTTP API.
//!
//! Every frontend data access goes through these commands (in-process IPC),
//! so the app never opens a port. The `db::queries` layer is reused unchanged.

pub mod attendance;
pub mod dashboard;
pub mod error;
pub mod events;
pub mod reports;
pub mod settings;
pub mod students;

use std::fs;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use tauri::{Emitter, Manager};
use tauri_plugin_dialog::DialogExt;

use crate::app_config;
use crate::commands::error::IpcError;
use crate::state::AppState;

/// Backup: checkpoint WAL → copy the database file to a user-chosen path.
#[tauri::command]
pub async fn backup_db(
    app_handle: tauri::AppHandle,
    state: tauri::State<'_, Arc<Mutex<AppState>>>,
    destination: String,
) -> Result<(), String> {
    let app_state = state.lock().unwrap();

    // Safety-net: checkpoint WAL so the copy is complete.
    checkpoint_wal(&app_state.db_path)?;

    let dest = PathBuf::from(&destination);
    fs::copy(&app_state.db_path, &dest).map_err(|e| format!("Backup failed: {}", e))?;

    // Also copy the WAL/shm if they exist (harmless if not).
    for suffix in ["-wal", "-shm"] {
        let wal = app_state.db_path.with_extension(format!("db{}", suffix));
        if wal.exists() {
            let _ = fs::copy(&wal, dest.with_extension(format!("db{}", suffix)));
        }
    }

    drop(app_state);
    app_handle.emit("backup-complete", destination).ok();
    Ok(())
}

/// Restore: replace the current database with the one chosen by the user.
#[tauri::command]
pub async fn restore_db(
    app_handle: tauri::AppHandle,
    state: tauri::State<'_, Arc<Mutex<AppState>>>,
    source: String,
) -> Result<(), String> {
    let app_state = state.lock().unwrap();
    let src = PathBuf::from(&source);

    if !src.exists() {
        return Err("Restore source file not found".into());
    }

    // Atomic-ish: copy to a temp path, then rename.
    let tmp = app_state.data_dir.join("seats.db.restore_tmp");
    fs::copy(&src, &tmp).map_err(|e| format!("Restore failed: {}", e))?;

    // Close existing WAL to prepare for the replacement (pragmatic: let the OS cache go)
    // Rename the restore file over the live database.
    fs::rename(&tmp, &app_state.db_path).map_err(|e| format!("Restore failed: {}", e))?;

    // Re-run migrations to ensure schema consistency.
    let conn = rusqlite::Connection::open(&app_state.db_path).map_err(|e| e.to_string())?;
    crate::db::migrations::run_migrations(&conn).map_err(|e| e.to_string())?;
    // PRAGMAs are re-applied by connection::open_database implicitly on next open.

    drop(app_state);
    app_handle.emit("restore-complete", ()).ok();
    Ok(())
}

/// Get the path to the database file (for display in Settings).
#[tauri::command]
pub async fn get_db_path(state: tauri::State<'_, Arc<Mutex<AppState>>>) -> Result<String, String> {
    let app_state = state.lock().unwrap();
    Ok(app_state.db_path.to_string_lossy().to_string())
}

/// Toggle fullscreen / kiosk mode on the main window and persist the
/// preference so the next launch starts fullscreen too.
#[tauri::command]
pub async fn set_kiosk(
    app_handle: tauri::AppHandle,
    state: tauri::State<'_, Arc<Mutex<AppState>>>,
    enabled: bool,
) -> Result<(), IpcError> {
    if let Some(window) = app_handle.get_webview_window("main") {
        window
            .set_fullscreen(enabled)
            .map_err(|e| IpcError::new(e.to_string()))?;
    }

    let data_dir = state.lock().unwrap().data_dir.clone();
    let mut settings = app_config::load(&data_dir);
    settings.kiosk = enabled;
    app_config::save(&data_dir, &settings)?;
    Ok(())
}

/// Opens a native file picker for CSV/XLSX, then imports the chosen file.
/// Returns the number of records imported.
#[tauri::command]
pub async fn import_students_file(
    app_handle: tauri::AppHandle,
    state: tauri::State<'_, Arc<Mutex<AppState>>>,
) -> Result<i64, String> {
    let file = app_handle
        .dialog()
        .file()
        .add_filter("Spreadsheets", &["csv", "xlsx"])
        .add_filter("CSV", &["csv"])
        .add_filter("Excel", &["xlsx"])
        .blocking_pick_file();

    let path = match file {
        Some(f) => f.into_path().map_err(|e| e.to_string())?,
        None => return Err("No file selected".into()),
    };

    let data = fs::read(&path).map_err(|e| format!("Failed to read file: {e}"))?;

    let db_path = state.lock().unwrap().db_path.clone();

    let count = match path.extension().and_then(|e| e.to_str()) {
        Some("xlsx" | "xls") => crate::db::queries::students::import_from_xlsx(&db_path, &data),
        _ => crate::db::queries::students::import_from_csv(&db_path, &data),
    }
    .map_err(|e| format!("Import failed: {e}"))?;

    // Emit event so the frontend knows to refresh the student list.
    app_handle.emit("students-imported", count).ok();
    Ok(count)
}

// ── helpers ────────────────────────────────────────────────────────────

fn checkpoint_wal(db_path: &PathBuf) -> Result<(), String> {
    let conn = rusqlite::Connection::open(db_path).map_err(|e| e.to_string())?;
    conn.execute_batch("PRAGMA wal_checkpoint(TRUNCATE)")
        .map_err(|e| format!("WAL checkpoint failed: {e}"))
}
