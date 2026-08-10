use axum::extract::State;
use axum::http::StatusCode;
use axum::{extract::Query, routing::get, Json, Router};
use serde::{Deserialize, Serialize};

use crate::api::error::AppError;
use crate::api::ApiContext;
use crate::db::queries::dashboard;

#[derive(Deserialize)]
pub struct DashboardQuery {
    pub limit: Option<i64>,
    pub days: Option<i64>,
}

#[derive(Serialize)]
struct SuccessResponse<T: Serialize> {
    success: bool,
    data: T,
    message: String,
}

fn ok<T: Serialize>(data: T, message: impl Into<String>) -> Json<SuccessResponse<T>> {
    Json(SuccessResponse {
        success: true,
        data,
        message: message.into(),
    })
}

pub fn router() -> Router<ApiContext> {
    Router::new()
        .route("/stats", get(stats))
        .route("/event-attendance", get(event_attendance))
        .route("/course-distribution", get(course_distribution))
        .route("/recent-activity", get(recent_activity))
        .route("/attendance-trend", get(attendance_trend))
}

async fn stats(
    State(ctx): State<ApiContext>,
) -> Result<Json<SuccessResponse<dashboard::DashboardStats>>, AppError> {
    let s = dashboard::stats(&ctx.db_path)
        .map_err(|e| AppError::new(StatusCode::INTERNAL_SERVER_ERROR, e))?;
    Ok(ok(s, "Dashboard stats fetched successfully"))
}

async fn event_attendance(
    State(ctx): State<ApiContext>,
) -> Result<Json<SuccessResponse<Vec<dashboard::EventAttendanceEntry>>>, AppError> {
    let data = dashboard::event_attendance(&ctx.db_path)
        .map_err(|e| AppError::new(StatusCode::INTERNAL_SERVER_ERROR, e))?;
    Ok(ok(data, "Event attendance data fetched successfully"))
}

async fn course_distribution(
    State(ctx): State<ApiContext>,
) -> Result<Json<SuccessResponse<Vec<dashboard::CourseDistribution>>>, AppError> {
    let data = dashboard::course_distribution(&ctx.db_path)
        .map_err(|e| AppError::new(StatusCode::INTERNAL_SERVER_ERROR, e))?;
    Ok(ok(data, "Course distribution fetched successfully"))
}

async fn recent_activity(
    State(ctx): State<ApiContext>,
    Query(q): Query<DashboardQuery>,
) -> Result<Json<SuccessResponse<Vec<dashboard::RecentActivity>>>, AppError> {
    let limit = q.limit.unwrap_or(8).clamp(1, 50);
    let data = dashboard::recent_activity(&ctx.db_path, limit)
        .map_err(|e| AppError::new(StatusCode::INTERNAL_SERVER_ERROR, e))?;
    Ok(ok(data, "Recent activity fetched successfully"))
}

async fn attendance_trend(
    State(ctx): State<ApiContext>,
    Query(q): Query<DashboardQuery>,
) -> Result<Json<SuccessResponse<Vec<dashboard::AttendanceTrend>>>, AppError> {
    let days = q.days.unwrap_or(14).clamp(1, 365);
    let data = dashboard::attendance_trend(&ctx.db_path, days)
        .map_err(|e| AppError::new(StatusCode::INTERNAL_SERVER_ERROR, e))?;
    Ok(ok(data, "Attendance trend fetched successfully"))
}
