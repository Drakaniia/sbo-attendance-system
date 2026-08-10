use axum::body::Body;
use axum::{
    extract::{Query, State},
    http::{header, StatusCode},
    response::Response,
    routing::get,
    Json, Router,
};
use serde::{Deserialize, Serialize};

use crate::api::error::AppError;
use crate::api::ApiContext;
use crate::db::queries::reports;

// --- Query params --------------------------------------------------------

#[derive(Deserialize)]
pub struct ReportsQuery {
    #[serde(rename = "startDate")]
    pub start_date: Option<String>,
    #[serde(rename = "endDate")]
    pub end_date: Option<String>,
    #[serde(rename = "eventId")]
    pub event_id: Option<String>,
    pub limit: Option<i64>,
    #[serde(rename = "sortBy")]
    pub sort_by: Option<String>,
    pub mode: Option<String>, // "hourly" | "daily"
}

// --- Response envelope ---------------------------------------------------

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

// --- Routes --------------------------------------------------------------

pub fn router() -> Router<ApiContext> {
    Router::new()
        .route("/stats", get(stats))
        .route("/attendance-trend", get(attendance_trend))
        .route("/event-breakdown", get(event_breakdown))
        .route("/course-distribution", get(course_distribution))
        .route("/year-distribution", get(year_distribution))
        .route("/leaderboard", get(leaderboard))
        .route("/heatmap", get(heatmap))
        .route("/export-csv", get(export_csv))
}

// ── GET /reports/stats ──────────────────────────────────────────────────

async fn stats(
    State(ctx): State<ApiContext>,
    Query(q): Query<ReportsQuery>,
) -> Result<Json<SuccessResponse<reports::ReportsStats>>, AppError> {
    let data = reports::stats(
        &ctx.db_path,
        q.start_date.as_deref(),
        q.end_date.as_deref(),
        q.event_id.as_deref(),
    )
    .map_err(|e| AppError::new(StatusCode::INTERNAL_SERVER_ERROR, e))?;
    Ok(ok(data, "Report stats fetched successfully"))
}

// ── GET /reports/attendance-trend ───────────────────────────────────────

async fn attendance_trend(
    State(ctx): State<ApiContext>,
    Query(q): Query<ReportsQuery>,
) -> Result<Json<SuccessResponse<Vec<reports::AttendanceTrendEntry>>>, AppError> {
    let data = reports::attendance_trend(
        &ctx.db_path,
        q.start_date.as_deref(),
        q.end_date.as_deref(),
        q.event_id.as_deref(),
    )
    .map_err(|e| AppError::new(StatusCode::INTERNAL_SERVER_ERROR, e))?;
    Ok(ok(data, "Attendance trend fetched successfully"))
}

// ── GET /reports/event-breakdown ────────────────────────────────────────

async fn event_breakdown(
    State(ctx): State<ApiContext>,
    Query(q): Query<ReportsQuery>,
) -> Result<Json<SuccessResponse<Vec<reports::EventBreakdownEntry>>>, AppError> {
    let data =
        reports::event_breakdown(&ctx.db_path, q.start_date.as_deref(), q.end_date.as_deref())
            .map_err(|e| AppError::new(StatusCode::INTERNAL_SERVER_ERROR, e))?;
    Ok(ok(data, "Event breakdown fetched successfully"))
}

// ── GET /reports/course-distribution ────────────────────────────────────

async fn course_distribution(
    State(ctx): State<ApiContext>,
    Query(q): Query<ReportsQuery>,
) -> Result<Json<SuccessResponse<Vec<reports::CourseDistributionEntry>>>, AppError> {
    let data = reports::course_distribution(
        &ctx.db_path,
        q.start_date.as_deref(),
        q.end_date.as_deref(),
        q.event_id.as_deref(),
    )
    .map_err(|e| AppError::new(StatusCode::INTERNAL_SERVER_ERROR, e))?;
    Ok(ok(data, "Course distribution fetched successfully"))
}

// ── GET /reports/year-distribution ──────────────────────────────────────

async fn year_distribution(
    State(ctx): State<ApiContext>,
    Query(q): Query<ReportsQuery>,
) -> Result<Json<SuccessResponse<Vec<reports::YearDistributionEntry>>>, AppError> {
    let data = reports::year_distribution(
        &ctx.db_path,
        q.start_date.as_deref(),
        q.end_date.as_deref(),
        q.event_id.as_deref(),
    )
    .map_err(|e| AppError::new(StatusCode::INTERNAL_SERVER_ERROR, e))?;
    Ok(ok(data, "Year distribution fetched successfully"))
}

// ── GET /reports/leaderboard ────────────────────────────────────────────

async fn leaderboard(
    State(ctx): State<ApiContext>,
    Query(q): Query<ReportsQuery>,
) -> Result<Json<SuccessResponse<Vec<reports::LeaderboardEntry>>>, AppError> {
    let limit = q.limit.unwrap_or(50).clamp(1, 200);
    let data = reports::leaderboard(
        &ctx.db_path,
        q.start_date.as_deref(),
        q.end_date.as_deref(),
        q.event_id.as_deref(),
        limit,
        q.sort_by.as_deref(),
    )
    .map_err(|e| AppError::new(StatusCode::INTERNAL_SERVER_ERROR, e))?;
    Ok(ok(data, "Leaderboard fetched successfully"))
}

// ── GET /reports/heatmap ────────────────────────────────────────────────

async fn heatmap(
    State(ctx): State<ApiContext>,
    Query(q): Query<ReportsQuery>,
) -> Result<Json<SuccessResponse<serde_json::Value>>, AppError> {
    let mode = q.mode.as_deref().unwrap_or("hourly");

    match mode {
        "daily" => {
            let data = reports::heatmap_daily(
                &ctx.db_path,
                q.start_date.as_deref(),
                q.end_date.as_deref(),
                q.event_id.as_deref(),
            )
            .map_err(|e| AppError::new(StatusCode::INTERNAL_SERVER_ERROR, e))?;
            let json = serde_json::to_value(data)
                .map_err(|e| AppError::new(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            Ok(ok(json, "Daily heatmap fetched successfully"))
        }
        _ => {
            let data = reports::heatmap_hourly(
                &ctx.db_path,
                q.start_date.as_deref(),
                q.end_date.as_deref(),
                q.event_id.as_deref(),
            )
            .map_err(|e| AppError::new(StatusCode::INTERNAL_SERVER_ERROR, e))?;
            let json = serde_json::to_value(data)
                .map_err(|e| AppError::new(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            Ok(ok(json, "Hourly heatmap fetched successfully"))
        }
    }
}

// ── GET /reports/export-csv ─────────────────────────────────────────────

async fn export_csv(
    State(ctx): State<ApiContext>,
    Query(q): Query<ReportsQuery>,
) -> Result<Response, AppError> {
    let csv = reports::export_csv(
        &ctx.db_path,
        q.start_date.as_deref(),
        q.end_date.as_deref(),
        q.event_id.as_deref(),
    )
    .map_err(|e| AppError::new(StatusCode::INTERNAL_SERVER_ERROR, e))?;

    let filename = "seats-report-export.csv";

    Ok(Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, "text/csv")
        .header(
            header::CONTENT_DISPOSITION,
            format!("attachment; filename=\"{}\"", filename),
        )
        .body(Body::from(csv))
        .unwrap())
}
