use axum::{extract::State, http::StatusCode, routing::delete, Json, Router};
use serde::Serialize;

use crate::api::error::AppError;
use crate::api::ApiContext;
use crate::db::queries::settings;

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
    Router::new().route("/data", delete(reset_all_data))
}

// ── DELETE /settings/data ───────────────────────────────────────────────

/// Wipe all students, events, and attendance records.
async fn reset_all_data(
    State(ctx): State<ApiContext>,
) -> Result<Json<SuccessResponse<settings::ResetSummary>>, AppError> {
    let data = settings::reset_all_data(&ctx.db_path)
        .map_err(|e| AppError::new(StatusCode::INTERNAL_SERVER_ERROR, e))?;
    Ok(ok(data, "All data cleared successfully"))
}
