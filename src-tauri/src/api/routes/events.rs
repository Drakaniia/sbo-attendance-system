use axum::http::StatusCode;
use axum::{
    extract::{Path, State},
    routing::{delete, get, patch, post, put},
    Json, Router,
};
use serde::Serialize;

use crate::api::error::AppError;
use crate::api::ApiContext;
use crate::db::queries::events::{self, EventPayload};

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

fn event_not_found() -> AppError {
    AppError::new(StatusCode::NOT_FOUND, "Event not found")
}

// --- Routes --------------------------------------------------------------

pub fn router() -> Router<ApiContext> {
    Router::new()
        .route("/", get(list_events))
        .route("/", post(create_event))
        .route("/{event_id}", get(get_event))
        .route("/{event_id}", put(update_event))
        .route("/{event_id}", delete(delete_event))
        .route("/{event_id}/archive", patch(archive_event))
        .route("/{event_id}/unarchive", patch(unarchive_event))
        .route("/{event_id}/summary", get(event_summary))
}

// ── GET /event — all non-archived ───────────────────────────────────────

async fn list_events(
    State(ctx): State<ApiContext>,
) -> Result<Json<SuccessResponse<Vec<events::Event>>>, AppError> {
    let evts = events::list_events(&ctx.db_path)
        .map_err(|e| AppError::new(StatusCode::INTERNAL_SERVER_ERROR, e))?;
    Ok(ok(evts, "Events fetched successfully"))
}

// ── GET /event/:eventID ─────────────────────────────────────────────────

async fn get_event(
    State(ctx): State<ApiContext>,
    Path(event_id): Path<String>,
) -> Result<Json<SuccessResponse<events::Event>>, AppError> {
    match events::get_event(&ctx.db_path, &event_id) {
        Ok(Some(evt)) => Ok(ok(evt, "Event found")),
        Ok(None) => Err(event_not_found()),
        Err(e) => Err(AppError::new(StatusCode::INTERNAL_SERVER_ERROR, e)),
    }
}

// ── POST /event — create ────────────────────────────────────────────────

async fn create_event(
    State(ctx): State<ApiContext>,
    Json(payload): Json<EventPayload>,
) -> Result<Json<SuccessResponse<events::Event>>, AppError> {
    let evt = events::create_event(&ctx.db_path, &payload)
        .map_err(|e| AppError::new(StatusCode::BAD_REQUEST, e))?;
    Ok(ok(evt, "Event created successfully"))
}

// ── PUT /event/:eventID — update ────────────────────────────────────────

async fn update_event(
    State(ctx): State<ApiContext>,
    Path(event_id): Path<String>,
    Json(payload): Json<EventPayload>,
) -> Result<Json<SuccessResponse<events::Event>>, AppError> {
    let evt = events::update_event(&ctx.db_path, &event_id, &payload).map_err(|e| {
        if e.contains("not found") {
            event_not_found()
        } else {
            AppError::new(StatusCode::BAD_REQUEST, e)
        }
    })?;
    Ok(ok(evt, "Event updated successfully"))
}

// ── DELETE /event/:eventID ──────────────────────────────────────────────

async fn delete_event(
    State(ctx): State<ApiContext>,
    Path(event_id): Path<String>,
) -> Result<Json<SuccessResponse<events::Event>>, AppError> {
    let evt = events::delete_event(&ctx.db_path, &event_id).map_err(|e| {
        if e.contains("attendances") {
            AppError::new(StatusCode::BAD_REQUEST, e)
        } else if e.contains("not found") {
            AppError::new(StatusCode::NO_CONTENT, e)
        } else {
            AppError::new(StatusCode::INTERNAL_SERVER_ERROR, e)
        }
    })?;
    Ok(ok(evt, "Event deleted successfully"))
}

// ── PATCH /event/:eventID/archive ───────────────────────────────────────

async fn archive_event(
    State(ctx): State<ApiContext>,
    Path(event_id): Path<String>,
) -> Result<Json<SuccessResponse<events::Event>>, AppError> {
    let evt = events::archive_event(&ctx.db_path, &event_id, true).map_err(map_event_err)?;
    Ok(ok(evt, "Event archived successfully"))
}

// ── PATCH /event/:eventID/unarchive ─────────────────────────────────────

async fn unarchive_event(
    State(ctx): State<ApiContext>,
    Path(event_id): Path<String>,
) -> Result<Json<SuccessResponse<events::Event>>, AppError> {
    let evt = events::archive_event(&ctx.db_path, &event_id, false).map_err(map_event_err)?;
    Ok(ok(evt, "Event unarchived successfully"))
}

// ── GET /event/:eventID/summary — check-in/out counts + rate ─────────────

async fn event_summary(
    State(ctx): State<ApiContext>,
    Path(event_id): Path<String>,
) -> Result<Json<SuccessResponse<events::EventSummary>>, AppError> {
    let summary = events::event_summary(&ctx.db_path, &event_id).map_err(map_event_err)?;
    Ok(ok(summary, "Event summary fetched successfully"))
}

// ── helpers ─────────────────────────────────────────────────────────────

fn map_event_err(msg: String) -> AppError {
    if msg.contains("not found") {
        AppError::new(StatusCode::NOT_FOUND, msg)
    } else {
        AppError::new(StatusCode::INTERNAL_SERVER_ERROR, msg)
    }
}
