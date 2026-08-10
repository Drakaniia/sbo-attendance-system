use axum::body::Body;
use axum::{
    extract::{Path, Query, State},
    http::{header, StatusCode},
    response::Response,
    routing::{get, patch, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};

use crate::api::error::{AppError, ErrorCode};
use crate::api::ApiContext;
use crate::db::queries::attendance;

// --- Request body for time-in/out + update -------------------------------

#[derive(Deserialize)]
struct ScanBody {
    #[serde(rename = "studentID")]
    student_id: String,
}

// --- Response envelope ---------------------------------------------------

#[derive(Serialize)]
struct SuccessResponse<T: Serialize> {
    success: bool,
    data: T,
    message: String,
}

/// Flattened paginated response (like old `CustomPaginatedResponse`).
#[derive(Serialize)]
struct PaginatedResponse<T: Serialize> {
    success: bool,
    data: T,
    message: String,
    next: i64,
    prev: i64,
    #[serde(rename = "totalPages")]
    total_pages: i64,
    total: i64,
}

fn ok<T: Serialize>(data: T, message: impl Into<String>) -> Json<SuccessResponse<T>> {
    Json(SuccessResponse {
        success: true,
        data,
        message: message.into(),
    })
}

// --- Query params --------------------------------------------------------

#[derive(Deserialize)]
pub struct AttendanceListQuery {
    pub limit: Option<i64>,
    pub page: Option<i64>,
    #[serde(rename = "pageSize")]
    pub page_size: Option<i64>,
}

// --- Error helpers -------------------------------------------------------

fn already_checked_in() -> AppError {
    AppError::with_code(
        StatusCode::BAD_REQUEST,
        "Student has already checked in",
        ErrorCode::AlreadyCheckedIn,
    )
}
fn already_checked_out() -> AppError {
    AppError::with_code(
        StatusCode::BAD_REQUEST,
        "Student has already checked out",
        ErrorCode::AlreadyCheckedOut,
    )
}

fn map_attendance_err(msg: String) -> AppError {
    if msg.contains("already checked in") {
        already_checked_in()
    } else if msg.contains("already checked out") {
        already_checked_out()
    } else if msg.contains("not found") {
        AppError::new(StatusCode::NOT_FOUND, msg)
    } else {
        AppError::new(StatusCode::BAD_REQUEST, msg)
    }
}

// --- Routes --------------------------------------------------------------

pub fn router() -> Router<ApiContext> {
    Router::new()
        .route("/", get(list_attendances))
        .route("/{attendance_id}", get(get_single))
        .route("/{attendance_id}", patch(update_attendance))
        .route("/event/{event_id}", get(event_attendances))
        .route("/record/time-in/event/{event_id}", post(record_time_in))
        .route("/record/time-out/event/{event_id}", post(record_time_out))
        .route("/event/{event_id}/download/csv", get(download_csv))
}

// ── GET /attendance — recent list ───────────────────────────────────────

async fn list_attendances(
    State(ctx): State<ApiContext>,
    Query(q): Query<AttendanceListQuery>,
) -> Result<Json<SuccessResponse<Vec<attendance::AttendancePopulated>>>, AppError> {
    let limit = q.limit.unwrap_or(10).clamp(1, 100);
    let list = attendance::list_recent(&ctx.db_path, limit)
        .map_err(|e| AppError::new(StatusCode::INTERNAL_SERVER_ERROR, e))?;
    Ok(ok(list, "Attendances fetched successfully"))
}

// ── GET /attendance/:attendanceID — single record ───────────────────────

async fn get_single(
    State(ctx): State<ApiContext>,
    Path(attendance_id): Path<String>,
) -> Result<Json<SuccessResponse<attendance::AttendancePopulated>>, AppError> {
    let record = attendance::get_attendance_by_id(&ctx.db_path, &attendance_id)
        .map_err(map_attendance_err)?;
    Ok(ok(record, "Attendance fetched successfully"))
}

// ── GET /attendance/event/:eventID — paginated ───────────────────────────

async fn event_attendances(
    State(ctx): State<ApiContext>,
    Path(event_id): Path<String>,
    Query(q): Query<AttendanceListQuery>,
) -> Result<Json<PaginatedResponse<Vec<attendance::AttendancePopulated>>>, AppError> {
    let page = q.page.unwrap_or(1).max(1);
    let page_size = q.page_size.unwrap_or(10).clamp(1, 100);

    let result = attendance::list_by_event(&ctx.db_path, &event_id, page, page_size)
        .map_err(|e| AppError::new(StatusCode::INTERNAL_SERVER_ERROR, e))?;

    Ok(Json(PaginatedResponse {
        success: true,
        data: result.data,
        message: "Attendances fetched successfully".into(),
        next: result.next,
        prev: result.prev,
        total_pages: result.total_pages,
        total: result.total,
    }))
}

// ── POST /record/time-in/event/:eventID ─────────────────────────────────

async fn record_time_in(
    State(ctx): State<ApiContext>,
    Path(event_id): Path<String>,
    Json(body): Json<ScanBody>,
) -> Result<Json<SuccessResponse<attendance::AttendancePopulated>>, AppError> {
    let record = attendance::record_time_in(&ctx.db_path, &event_id, &body.student_id)
        .map_err(map_attendance_err)?;
    Ok(ok(record, "Attendance recorded successfully"))
}

// ── POST /record/time-out/event/:eventID ────────────────────────────────

async fn record_time_out(
    State(ctx): State<ApiContext>,
    Path(event_id): Path<String>,
    Json(body): Json<ScanBody>,
) -> Result<Json<SuccessResponse<attendance::AttendancePopulated>>, AppError> {
    let record = attendance::record_time_out(&ctx.db_path, &event_id, &body.student_id)
        .map_err(map_attendance_err)?;
    Ok(ok(record, "Attendance recorded successfully"))
}

// ── GET /event/:eventID/download/csv — CSV export ────────────────────────

async fn download_csv(
    State(ctx): State<ApiContext>,
    Path(event_id): Path<String>,
) -> Result<Response, AppError> {
    let csv = attendance::export_csv(&ctx.db_path, &event_id)
        .map_err(|e| AppError::new(StatusCode::INTERNAL_SERVER_ERROR, e))?;

    // Try to get the event title for the filename.
    let filename = format!("{}-attendances.csv", &event_id[..event_id.len().min(20)]);

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

// ── PATCH /attendance/:attendanceID — reassign studentID ────────────────

async fn update_attendance(
    State(ctx): State<ApiContext>,
    Path(attendance_id): Path<String>,
    Json(body): Json<ScanBody>,
) -> Result<Json<SuccessResponse<attendance::AttendancePopulated>>, AppError> {
    let record = attendance::update_attendance(&ctx.db_path, &attendance_id, &body.student_id)
        .map_err(|e| {
            if e.contains("not found") {
                AppError::new(StatusCode::NOT_FOUND, e)
            } else {
                AppError::new(StatusCode::BAD_REQUEST, e)
            }
        })?;
    Ok(ok(record, "Attendance updated successfully"))
}
