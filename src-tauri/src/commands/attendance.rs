use std::sync::{Arc, Mutex};

use tauri::State;

use crate::commands::error::{map_attendance_err, IpcError};
use crate::db::queries::attendance;
use crate::state::AppState;

/// Formerly `GET /attendance` — latest N attendances (global feed).
#[tauri::command]
pub async fn list_recent_attendances(
    state: State<'_, Arc<Mutex<AppState>>>,
    limit: Option<i64>,
) -> Result<Vec<attendance::AttendancePopulated>, IpcError> {
    let db_path = state.lock().unwrap().db_path.clone();
    let limit = limit.unwrap_or(10).clamp(1, 100);
    attendance::list_recent(&db_path, limit).map_err(IpcError::new)
}

/// Formerly `GET /attendance/{id}` — single populated record.
#[tauri::command]
pub async fn get_attendance(
    state: State<'_, Arc<Mutex<AppState>>>,
    attendance_id: String,
) -> Result<attendance::AttendancePopulated, IpcError> {
    let db_path = state.lock().unwrap().db_path.clone();
    attendance::get_attendance_by_id(&db_path, &attendance_id).map_err(map_attendance_err)
}

/// Formerly `GET /attendance/event/{id}` — paginated list for an event.
#[tauri::command]
pub async fn list_event_attendances(
    state: State<'_, Arc<Mutex<AppState>>>,
    event_id: String,
    page: Option<i64>,
    page_size: Option<i64>,
) -> Result<attendance::PaginatedAttendances, IpcError> {
    let db_path = state.lock().unwrap().db_path.clone();
    let page = page.unwrap_or(1).max(1);
    let page_size = page_size.unwrap_or(10).clamp(1, 100);
    attendance::list_by_event(&db_path, &event_id, page, page_size).map_err(IpcError::new)
}

/// Formerly `POST /attendance/record/time-in/event/{id}`.
#[tauri::command]
pub async fn record_time_in(
    state: State<'_, Arc<Mutex<AppState>>>,
    event_id: String,
    student_id: String,
) -> Result<attendance::AttendancePopulated, IpcError> {
    let db_path = state.lock().unwrap().db_path.clone();
    attendance::record_time_in(&db_path, &event_id, &student_id).map_err(map_attendance_err)
}

/// Formerly `POST /attendance/record/time-out/event/{id}`.
#[tauri::command]
pub async fn record_time_out(
    state: State<'_, Arc<Mutex<AppState>>>,
    event_id: String,
    student_id: String,
) -> Result<attendance::AttendancePopulated, IpcError> {
    let db_path = state.lock().unwrap().db_path.clone();
    attendance::record_time_out(&db_path, &event_id, &student_id).map_err(map_attendance_err)
}

/// Formerly `PATCH /attendance/{id}` — reassign the student ID.
#[tauri::command]
pub async fn update_attendance(
    state: State<'_, Arc<Mutex<AppState>>>,
    attendance_id: String,
    student_id: String,
) -> Result<attendance::AttendancePopulated, IpcError> {
    let db_path = state.lock().unwrap().db_path.clone();
    attendance::update_attendance(&db_path, &attendance_id, &student_id).map_err(map_attendance_err)
}

/// Formerly `GET /attendance/event/{id}/download/csv` — builds a formatted
/// `.xlsx` workbook and opens a native save dialog.
#[tauri::command]
pub async fn export_event_excel(
    app_handle: tauri::AppHandle,
    state: State<'_, Arc<Mutex<AppState>>>,
    event_id: String,
) -> Result<(), IpcError> {
    use tauri_plugin_dialog::DialogExt;

    let db_path = state.lock().unwrap().db_path.clone();
    let bytes = attendance::export_xlsx(&db_path, &event_id).map_err(IpcError::new)?;

    // Default filename: <EventTitle>_YYYY-MM-DD.xlsx (editable in the dialog).
    let default_name = crate::db::queries::events::get_event(&db_path, &event_id)
        .ok()
        .flatten()
        .map(|e| crate::db::queries::export_workbook::sanitize_filename(&e.title, &e.start_time))
        .unwrap_or_else(|| format!("seats-export-{}.xlsx", &event_id[..event_id.len().min(20)]));

    let Some(file) = app_handle
        .dialog()
        .file()
        .add_filter("Excel Workbook", &["xlsx"])
        .set_file_name(default_name)
        .blocking_save_file()
    else {
        return Ok(()); // user cancelled the dialog
    };

    let path = file.into_path().map_err(|e| IpcError::new(e.to_string()))?;
    std::fs::write(&path, bytes)
        .map_err(|e| IpcError::new(format!("Failed to write Excel workbook: {e}")))?;
    Ok(())
}
