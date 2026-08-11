use std::sync::{Arc, Mutex};

use tauri::State;

use crate::commands::error::IpcError;
use crate::db::queries::reports;
use crate::state::AppState;

/// Query args shared by all report commands — mirrors the old axum
/// `ReportsQuery` extractor (camelCase keys). Unused fields per command
/// are simply ignored, exactly like the old `Query` extractor.
#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReportsQuery {
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub event_id: Option<String>,
    pub limit: Option<i64>,
    pub sort_by: Option<String>,
    pub mode: Option<String>, // "hourly" | "daily" — heatmap only
}

/// Formerly `GET /reports/stats`.
#[tauri::command]
pub async fn reports_stats(
    state: State<'_, Arc<Mutex<AppState>>>,
    query: ReportsQuery,
) -> Result<reports::ReportsStats, IpcError> {
    let db_path = state.lock().unwrap().db_path.clone();
    reports::stats(
        &db_path,
        query.start_date.as_deref(),
        query.end_date.as_deref(),
        query.event_id.as_deref(),
    )
    .map_err(IpcError::new)
}

/// Formerly `GET /reports/attendance-trend`.
#[tauri::command]
pub async fn reports_attendance_trend(
    state: State<'_, Arc<Mutex<AppState>>>,
    query: ReportsQuery,
) -> Result<Vec<reports::AttendanceTrendEntry>, IpcError> {
    let db_path = state.lock().unwrap().db_path.clone();
    reports::attendance_trend(
        &db_path,
        query.start_date.as_deref(),
        query.end_date.as_deref(),
        query.event_id.as_deref(),
    )
    .map_err(IpcError::new)
}

/// Formerly `GET /reports/event-breakdown` — note: eventId is ignored
/// by the underlying query (matches the old handler).
#[tauri::command]
pub async fn reports_event_breakdown(
    state: State<'_, Arc<Mutex<AppState>>>,
    query: ReportsQuery,
) -> Result<Vec<reports::EventBreakdownEntry>, IpcError> {
    let db_path = state.lock().unwrap().db_path.clone();
    reports::event_breakdown(
        &db_path,
        query.start_date.as_deref(),
        query.end_date.as_deref(),
    )
    .map_err(IpcError::new)
}

/// Formerly `GET /reports/course-distribution`.
#[tauri::command]
pub async fn reports_course_distribution(
    state: State<'_, Arc<Mutex<AppState>>>,
    query: ReportsQuery,
) -> Result<Vec<reports::CourseDistributionEntry>, IpcError> {
    let db_path = state.lock().unwrap().db_path.clone();
    reports::course_distribution(
        &db_path,
        query.start_date.as_deref(),
        query.end_date.as_deref(),
        query.event_id.as_deref(),
    )
    .map_err(IpcError::new)
}

/// Formerly `GET /reports/year-distribution`.
#[tauri::command]
pub async fn reports_year_distribution(
    state: State<'_, Arc<Mutex<AppState>>>,
    query: ReportsQuery,
) -> Result<Vec<reports::YearDistributionEntry>, IpcError> {
    let db_path = state.lock().unwrap().db_path.clone();
    reports::year_distribution(
        &db_path,
        query.start_date.as_deref(),
        query.end_date.as_deref(),
        query.event_id.as_deref(),
    )
    .map_err(IpcError::new)
}

/// Formerly `GET /reports/leaderboard`.
#[tauri::command]
pub async fn reports_leaderboard(
    state: State<'_, Arc<Mutex<AppState>>>,
    query: ReportsQuery,
) -> Result<Vec<reports::LeaderboardEntry>, IpcError> {
    let db_path = state.lock().unwrap().db_path.clone();
    let limit = query.limit.unwrap_or(50).clamp(1, 200);
    reports::leaderboard(
        &db_path,
        query.start_date.as_deref(),
        query.end_date.as_deref(),
        query.event_id.as_deref(),
        limit,
        query.sort_by.as_deref(),
    )
    .map_err(IpcError::new)
}

/// Formerly `GET /reports/heatmap` — hourly or daily×hourly counts.
#[tauri::command]
pub async fn reports_heatmap(
    state: State<'_, Arc<Mutex<AppState>>>,
    query: ReportsQuery,
) -> Result<serde_json::Value, IpcError> {
    let db_path = state.lock().unwrap().db_path.clone();
    let start = query.start_date.as_deref();
    let end = query.end_date.as_deref();
    let event_id = query.event_id.as_deref();
    let json = match query.mode.as_deref().unwrap_or("hourly") {
        "daily" => {
            let data =
                reports::heatmap_daily(&db_path, start, end, event_id).map_err(IpcError::new)?;
            serde_json::to_value(data).map_err(|e| IpcError::new(e.to_string()))?
        }
        _ => {
            let data =
                reports::heatmap_hourly(&db_path, start, end, event_id).map_err(IpcError::new)?;
            serde_json::to_value(data).map_err(|e| IpcError::new(e.to_string()))?
        }
    };

    Ok(json)
}

/// Formerly `GET /reports/export-csv` — builds a formatted `.xlsx` workbook
/// for the filtered range, then opens a native save dialog.
#[tauri::command]
pub async fn export_reports_excel(
    app_handle: tauri::AppHandle,
    state: State<'_, Arc<Mutex<AppState>>>,
    query: ReportsQuery,
) -> Result<(), IpcError> {
    use tauri_plugin_dialog::DialogExt;

    let db_path = state.lock().unwrap().db_path.clone();
    let bytes = reports::export_xlsx(
        &db_path,
        query.start_date.as_deref(),
        query.end_date.as_deref(),
        query.event_id.as_deref(),
    )
    .map_err(IpcError::new)?;

    // Default filename encodes the range start (or today when unfiltered).
    let day = query
        .start_date
        .as_deref()
        .filter(|d| !d.is_empty())
        .map(str::to_string)
        .unwrap_or_else(|| chrono::Local::now().format("%Y-%m-%d").to_string());

    let Some(file) = app_handle
        .dialog()
        .file()
        .add_filter("Excel Workbook", &["xlsx"])
        .set_file_name(format!("SEATS-Report_{day}.xlsx"))
        .blocking_save_file()
    else {
        return Ok(()); // user cancelled the dialog
    };

    let path = file.into_path().map_err(|e| IpcError::new(e.to_string()))?;
    std::fs::write(&path, bytes)
        .map_err(|e| IpcError::new(format!("Failed to write Excel workbook: {e}")))?;
    Ok(())
}
