use std::sync::{Arc, Mutex};

use tauri::State;

use crate::commands::error::IpcError;
use crate::db::queries::dashboard;
use crate::state::AppState;

/// Formerly `GET /dashboard/stats`.
#[tauri::command]
pub async fn dashboard_stats(
    state: State<'_, Arc<Mutex<AppState>>>,
) -> Result<dashboard::DashboardStats, IpcError> {
    let db_path = state.lock().unwrap().db_path.clone();
    dashboard::stats(&db_path).map_err(IpcError::new)
}

/// Formerly `GET /dashboard/event-attendance` — top 10 non-archived events.
#[tauri::command]
pub async fn dashboard_event_attendance(
    state: State<'_, Arc<Mutex<AppState>>>,
) -> Result<Vec<dashboard::EventAttendanceEntry>, IpcError> {
    let db_path = state.lock().unwrap().db_path.clone();
    dashboard::event_attendance(&db_path).map_err(IpcError::new)
}

/// Formerly `GET /dashboard/course-distribution` — top 8 courses.
#[tauri::command]
pub async fn dashboard_course_distribution(
    state: State<'_, Arc<Mutex<AppState>>>,
) -> Result<Vec<dashboard::CourseDistribution>, IpcError> {
    let db_path = state.lock().unwrap().db_path.clone();
    dashboard::course_distribution(&db_path).map_err(IpcError::new)
}

/// Formerly `GET /dashboard/recent-activity`.
#[tauri::command]
pub async fn dashboard_recent_activity(
    state: State<'_, Arc<Mutex<AppState>>>,
    limit: Option<i64>,
) -> Result<Vec<dashboard::RecentActivity>, IpcError> {
    let db_path = state.lock().unwrap().db_path.clone();
    let limit = limit.unwrap_or(8).clamp(1, 50);
    dashboard::recent_activity(&db_path, limit).map_err(IpcError::new)
}

/// Formerly `GET /dashboard/attendance-trend` — daily counts for N days.
#[tauri::command]
pub async fn dashboard_attendance_trend(
    state: State<'_, Arc<Mutex<AppState>>>,
    days: Option<i64>,
) -> Result<Vec<dashboard::AttendanceTrend>, IpcError> {
    let db_path = state.lock().unwrap().db_path.clone();
    let days = days.unwrap_or(14).clamp(1, 365);
    dashboard::attendance_trend(&db_path, days).map_err(IpcError::new)
}
