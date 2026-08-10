use axum::http::StatusCode;
use axum::{
    extract::{Multipart, Query, State},
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};

use crate::api::error::AppError;
use crate::api::ApiContext;
use crate::db::queries::students;

// --- Response envelopes (match old API shapes) ---------------------------

#[derive(Serialize)]
struct SuccessResponse<T: Serialize> {
    success: bool,
    data: T,
    message: String,
}

/// Flattened paginated response — matches old `CustomPaginatedResponse` shape
/// where `data` is the array and pagination fields are at the top level.
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
pub struct StudentListQuery {
    pub page: Option<i64>,
    #[serde(rename = "pageSize")]
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub course: Option<String>,
    pub year: Option<i64>,
    pub gender: Option<String>,
    #[serde(rename = "sortBy")]
    pub sort_by: Option<String>,
    #[serde(rename = "includePlaceholders")]
    pub include_placeholders: Option<String>,
}

// --- Routes --------------------------------------------------------------

pub fn router() -> Router<ApiContext> {
    Router::new()
        .route("/", get(list_students))
        .route("/courses", get(available_courses))
        .route("/file/import", post(import_students))
}

// ── GET /student — paginated list ───────────────────────────────────────

async fn list_students(
    State(ctx): State<ApiContext>,
    Query(q): Query<StudentListQuery>,
) -> Result<Json<PaginatedResponse<Vec<students::Student>>>, AppError> {
    let page = q.page.unwrap_or(1).max(1);
    let page_size = q.page_size.unwrap_or(100).clamp(1, 1000);
    let include_placeholders = q.include_placeholders.as_deref() == Some("true");

    let result = students::list_students(
        &ctx.db_path,
        &students::ListStudentsOpts {
            page,
            page_size,
            search: q.search.as_deref(),
            course: q.course.as_deref(),
            year: q.year,
            gender: q.gender.as_deref(),
            sort_by: q.sort_by.as_deref(),
            include_placeholders,
        },
    )
    .map_err(|e| AppError::new(StatusCode::INTERNAL_SERVER_ERROR, e))?;

    Ok(Json(PaginatedResponse {
        success: true,
        data: result.data,
        message: "All students".into(),
        next: result.next,
        prev: result.prev,
        total_pages: result.total_pages,
        total: result.total,
    }))
}

// ── GET /student/courses — distinct courses ─────────────────────────────

async fn available_courses(
    State(ctx): State<ApiContext>,
) -> Result<Json<SuccessResponse<Vec<String>>>, AppError> {
    let courses = students::available_courses(&ctx.db_path)
        .map_err(|e| AppError::new(StatusCode::INTERNAL_SERVER_ERROR, e))?;

    Ok(ok(courses, "Students courses"))
}

// ── POST /student/file/import — CSV / XLSX upload ───────────────────────

async fn import_students(
    State(ctx): State<ApiContext>,
    mut multipart: Multipart,
) -> Result<Json<SuccessResponse<serde_json::Value>>, AppError> {
    const CSV_MIME: &str = "text/csv";
    const XLSX_MIME: &str = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    if let Ok(Some(field)) = multipart.next_field().await {
        // Old multer field name is 'students_file_csv' (used for both).
        let content_type = field.content_type().unwrap_or("").to_lowercase();
        let data = field
            .bytes()
            .await
            .map_err(|e| AppError::new(StatusCode::BAD_REQUEST, e.to_string()))?;

        if data.is_empty() {
            return Err(AppError::new(
                StatusCode::BAD_REQUEST,
                "Server did not receive any file",
            ));
        }

        let count = if content_type.contains(XLSX_MIME) {
            students::import_from_xlsx(&ctx.db_path, &data)
        } else if content_type.contains(CSV_MIME) || content_type.is_empty() {
            students::import_from_csv(&ctx.db_path, &data)
        } else {
            return Err(AppError::new(
                StatusCode::BAD_REQUEST,
                "File must be in CSV (.csv) or Excel (.xlsx) format",
            ));
        }
        .map_err(|e| AppError::new(StatusCode::BAD_REQUEST, e))?;

        return Ok(ok(
            serde_json::Value::Null,
            format!("File imported successfully ({count} records)"),
        ));
    }

    Err(AppError::new(
        StatusCode::BAD_REQUEST,
        "Server did not receive any file",
    ))
}
