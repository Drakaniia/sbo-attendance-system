use std::sync::{Arc, Mutex};

use tauri::State;

use crate::commands::error::IpcError;
use crate::db::queries::events::{self, EventPayload};
use crate::state::AppState;

fn event_not_found() -> IpcError {
    IpcError::new("Event not found")
}

/// Formerly `GET /event` — all non-archived events, newest first.
#[tauri::command]
pub async fn list_events(
    state: State<'_, Arc<Mutex<AppState>>>,
) -> Result<Vec<events::Event>, IpcError> {
    let db_path = state.lock().unwrap().db_path.clone();
    events::list_events(&db_path).map_err(IpcError::new)
}

/// Formerly `GET /event/{id}`.
#[tauri::command]
pub async fn get_event(
    state: State<'_, Arc<Mutex<AppState>>>,
    event_id: String,
) -> Result<events::Event, IpcError> {
    let db_path = state.lock().unwrap().db_path.clone();
    events::get_event(&db_path, &event_id)
        .map_err(IpcError::new)?
        .ok_or_else(event_not_found)
}

/// Formerly `POST /event`.
#[tauri::command]
pub async fn create_event(
    state: State<'_, Arc<Mutex<AppState>>>,
    payload: EventPayload,
) -> Result<events::Event, IpcError> {
    let db_path = state.lock().unwrap().db_path.clone();
    events::create_event(&db_path, &payload).map_err(IpcError::new)
}

/// Formerly `PUT /event/{id}`.
#[tauri::command]
pub async fn update_event(
    state: State<'_, Arc<Mutex<AppState>>>,
    event_id: String,
    payload: EventPayload,
) -> Result<events::Event, IpcError> {
    let db_path = state.lock().unwrap().db_path.clone();
    events::update_event(&db_path, &event_id, &payload).map_err(IpcError::new)
}

/// Formerly `DELETE /event/{id}` — guarded against events with attendances.
#[tauri::command]
pub async fn delete_event(
    state: State<'_, Arc<Mutex<AppState>>>,
    event_id: String,
) -> Result<events::Event, IpcError> {
    let db_path = state.lock().unwrap().db_path.clone();
    events::delete_event(&db_path, &event_id).map_err(IpcError::new)
}

/// Formerly `PATCH /event/{id}/archive`.
#[tauri::command]
pub async fn archive_event(
    state: State<'_, Arc<Mutex<AppState>>>,
    event_id: String,
) -> Result<events::Event, IpcError> {
    let db_path = state.lock().unwrap().db_path.clone();
    events::archive_event(&db_path, &event_id, true).map_err(IpcError::new)
}

/// Formerly `PATCH /event/{id}/unarchive`.
#[tauri::command]
pub async fn unarchive_event(
    state: State<'_, Arc<Mutex<AppState>>>,
    event_id: String,
) -> Result<events::Event, IpcError> {
    let db_path = state.lock().unwrap().db_path.clone();
    events::archive_event(&db_path, &event_id, false).map_err(IpcError::new)
}

/// Formerly `GET /event/{id}/summary` — check-in/out counts + rate.
#[tauri::command]
pub async fn event_attendance_summary(
    state: State<'_, Arc<Mutex<AppState>>>,
    event_id: String,
) -> Result<events::EventSummary, IpcError> {
    let db_path = state.lock().unwrap().db_path.clone();
    events::event_summary(&db_path, &event_id).map_err(IpcError::new)
}
