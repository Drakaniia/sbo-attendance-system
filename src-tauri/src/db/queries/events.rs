use rusqlite::{params, Connection, Result};
use serde::Serialize;
use std::path::Path;
use uuid::Uuid;

/// Event shape the frontend expects — camelCase to match the old API.
#[derive(Debug, Serialize)]
pub struct Event {
    #[serde(rename = "_id")]
    pub id: String,
    pub title: String,
    pub description: String,
    #[serde(rename = "type")]
    pub event_type: String,
    pub venue: String,
    #[serde(rename = "startTime")]
    pub start_time: String,
    #[serde(rename = "endTime")]
    pub end_time: String,
    #[serde(rename = "createdBy")]
    pub created_by: Option<String>,
    pub archived: bool,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

/// Payload for creating / updating an event.
#[derive(Debug, serde::Deserialize)]
pub struct EventPayload {
    pub title: Option<String>,
    pub description: Option<String>,
    #[serde(rename = "type")]
    pub event_type: Option<String>,
    pub venue: Option<String>,
    #[serde(rename = "startTime")]
    pub start_time: Option<String>,
    #[serde(rename = "endTime")]
    pub end_time: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct EventSummary {
    #[serde(rename = "totalCheckedIn")]
    pub total_checked_in: i64,
    #[serde(rename = "totalCheckedOut")]
    pub total_checked_out: i64,
    pub rate: f64,
}

// ---------------------------------------------------------------------------
// list — all non-archived events, newest first
// ---------------------------------------------------------------------------

pub fn list_events(db_path: &Path) -> Result<Vec<Event>, String> {
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, title, description, type, venue,
                    start_time, end_time, archived, created_at, updated_at
             FROM events
             WHERE archived = 0
             ORDER BY created_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], row_to_event)
        .map_err(|e| e.to_string())?;

    let mut events = Vec::new();
    for r in rows {
        events.push(r.map_err(|e| e.to_string())?);
    }
    Ok(events)
}

// ---------------------------------------------------------------------------
// get — single event by id
// ---------------------------------------------------------------------------

pub fn get_event(db_path: &Path, event_id: &str) -> Result<Option<Event>, String> {
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, title, description, type, venue,
                    start_time, end_time, archived, created_at, updated_at
             FROM events WHERE id = ?1",
        )
        .map_err(|e| e.to_string())?;

    stmt.query_row(params![event_id], row_to_event)
        .map(Some)
        .or_else(|e| match e {
            rusqlite::Error::QueryReturnedNoRows => Ok(None),
            other => Err(other.to_string()),
        })
}

// ---------------------------------------------------------------------------
// create — insert a new event
// ---------------------------------------------------------------------------

pub fn create_event(db_path: &Path, payload: &EventPayload) -> Result<Event, String> {
    validate_payload(payload, true)?;

    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now()
        .format("%Y-%m-%dT%H:%M:%S%.3fZ")
        .to_string();

    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO events (id, title, description, type, venue, start_time, end_time, archived, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 0, ?8, ?8)",
        params![
            id,
            payload.title.as_deref().unwrap_or(""),
            payload.description.as_deref().unwrap_or(""),
            payload.event_type.as_deref().unwrap_or(""),
            payload.venue.as_deref().unwrap_or(""),
            payload.start_time.as_deref().unwrap_or(""),
            payload.end_time.as_deref().unwrap_or(""),
            now,
        ],
    )
    .map_err(|e| e.to_string())?;

    get_event(db_path, &id)?.ok_or("Created event not found".into())
}

// ---------------------------------------------------------------------------
// update — patch an existing event, returns the updated doc
// ---------------------------------------------------------------------------

pub fn update_event(
    db_path: &Path,
    event_id: &str,
    payload: &EventPayload,
) -> Result<Event, String> {
    // At least one field must be present — the old schema requires all fields
    // for create but the update just passes what was parsed (body is full object
    // from the client side since the form sends all fields).
    validate_payload(payload, true)?;

    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    // Quick existence check
    let exists = conn
        .query_row(
            "SELECT 1 FROM events WHERE id = ?1",
            params![event_id],
            |_| Ok(()),
        )
        .is_ok();
    if !exists {
        return Err("Event not found".into());
    }

    conn.execute(
        "UPDATE events
         SET title       = ?1,
             description = ?2,
             type        = ?3,
             venue       = ?4,
             start_time  = ?5,
             end_time    = ?6,
             updated_at  = datetime('now')
         WHERE id = ?7",
        params![
            payload.title.as_deref().unwrap_or(""),
            payload.description.as_deref().unwrap_or(""),
            payload.event_type.as_deref().unwrap_or(""),
            payload.venue.as_deref().unwrap_or(""),
            payload.start_time.as_deref().unwrap_or(""),
            payload.end_time.as_deref().unwrap_or(""),
            event_id,
        ],
    )
    .map_err(|e| e.to_string())?;

    get_event(db_path, event_id)?.ok_or("Event not found after update".into())
}

// ---------------------------------------------------------------------------
// delete — only allowed if the event has no attendance records
// ---------------------------------------------------------------------------

pub fn delete_event(db_path: &Path, event_id: &str) -> Result<Event, String> {
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    // Guard: don't delete events that have attendances.
    let count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM attendance WHERE event_id = ?1",
            params![event_id],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;
    if count > 0 {
        return Err("Event has attendances".into());
    }

    let event = get_event(db_path, event_id)?.ok_or("Event not found".to_string())?;

    conn.execute("DELETE FROM events WHERE id = ?1", params![event_id])
        .map_err(|e| e.to_string())?;

    Ok(event)
}

// ---------------------------------------------------------------------------
// archive / unarchive
// ---------------------------------------------------------------------------

pub fn archive_event(db_path: &Path, event_id: &str, archived: bool) -> Result<Event, String> {
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    let rows = conn
        .execute(
            "UPDATE events SET archived = ?1, updated_at = datetime('now') WHERE id = ?2",
            params![archived as i64, event_id],
        )
        .map_err(|e| e.to_string())?;
    if rows == 0 {
        return Err("Event not found".into());
    }

    get_event(db_path, event_id)?.ok_or("Event not found".into())
}

// ---------------------------------------------------------------------------
// summary — check-in / check-out counts + rate
// ---------------------------------------------------------------------------

pub fn event_summary(db_path: &Path, event_id: &str) -> Result<EventSummary, String> {
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    // Verify event exists
    let exists = conn
        .query_row(
            "SELECT 1 FROM events WHERE id = ?1",
            params![event_id],
            |_| Ok(()),
        )
        .is_ok();
    if !exists {
        return Err("Event not found".into());
    }

    let total_checked_in: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM attendance WHERE event_id = ?1 AND time_in IS NOT NULL",
            params![event_id],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;

    let total_checked_out: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM attendance WHERE event_id = ?1 AND time_out IS NOT NULL",
            params![event_id],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;

    let rate = if total_checked_in > 0 {
        (total_checked_out as f64 / total_checked_in as f64) * 100.0
    } else {
        0.0
    };

    Ok(EventSummary {
        total_checked_in,
        total_checked_out,
        rate,
    })
}

// ── helpers ──────────────────────────────────────────────────────────────

fn row_to_event(row: &rusqlite::Row<'_>) -> rusqlite::Result<Event> {
    Ok(Event {
        id: row.get(0)?,
        title: row.get(1)?,
        description: row.get(2)?,
        event_type: row.get(3)?,
        venue: row.get(4)?,
        start_time: row.get(5)?,
        end_time: row.get(6)?,
        created_by: None, // auth skipped — always null
        archived: row.get::<_, i64>(7)? != 0,
        created_at: row.get(8)?,
        updated_at: row.get(9)?,
    })
}

fn validate_payload(payload: &EventPayload, require_all: bool) -> Result<(), String> {
    let required: [(&str, Option<&String>); 6] = [
        ("title", payload.title.as_ref()),
        ("description", payload.description.as_ref()),
        ("type", payload.event_type.as_ref()),
        ("venue", payload.venue.as_ref()),
        ("startTime", payload.start_time.as_ref()),
        ("endTime", payload.end_time.as_ref()),
    ];

    for (name, val) in &required {
        if require_all && val.map_or(true, |v| v.trim().is_empty()) {
            return Err(format!("{name} is required"));
        }
        if !require_all && val.is_none() {
            // optional — skip
            continue;
        }
        if let Some(v) = val {
            if v.trim().is_empty() && require_all {
                return Err(format!("{name} is required"));
            }
        }
    }

    Ok(())
}
