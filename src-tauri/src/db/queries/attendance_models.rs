use rusqlite;
use serde::Serialize;

// --------------------------------------------------------------------------
// JSON shapes (match the old Mongoose-populated API)
// --------------------------------------------------------------------------

#[derive(Debug, Serialize)]
pub struct EventInfo {
    #[serde(rename = "_id")]
    pub id: String,
    pub title: String,
    #[serde(rename = "type")]
    pub event_type: String,
    #[serde(rename = "startTime")]
    pub start_time: String,
    #[serde(rename = "endTime")]
    pub end_time: String,
}

#[derive(Debug, Serialize)]
pub struct StudentInfo {
    #[serde(rename = "_id")]
    pub id: String,
    #[serde(rename = "studentID")]
    pub student_id: String,
    pub firstname: String,
    pub lastname: String,
    pub middlename: String,
    pub course: String,
    pub year: i64,
    #[serde(rename = "isPlaceholder")]
    pub is_placeholder: bool,
}

#[derive(Debug, Serialize)]
pub struct AttendancePopulated {
    #[serde(rename = "_id")]
    pub id: String,
    pub event: Option<EventInfo>,
    #[serde(rename = "recordedBy")]
    pub recorded_by: Option<serde_json::Value>, // always null (auth skipped)
    pub student: Option<StudentInfo>,
    #[serde(rename = "studentID")]
    pub student_id_number: String,
    #[serde(rename = "timeIn")]
    pub time_in: Option<String>,
    #[serde(rename = "timeOut")]
    pub time_out: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

#[derive(Debug, Serialize)]
pub struct PaginatedAttendances {
    pub data: Vec<AttendancePopulated>,
    pub total: i64,
    #[serde(rename = "totalPages")]
    pub total_pages: i64,
    pub next: i64,
    pub prev: i64,
}

// ── builders ────────────────────────────────────────────────────────────

/// Shared SELECT for populated attendance rows (student + event JOINs).
pub fn populate_select() -> &'static str {
    "SELECT a.id, a.student_id_number, a.time_in, a.time_out,
            a.created_at, a.updated_at,
            e.id, e.title, e.type, e.start_time, e.end_time,
            s.id, s.student_id, s.firstname, s.lastname, s.middlename,
            s.course, s.year, s.is_placeholder
     FROM attendance a
     LEFT JOIN events e  ON a.event_id = e.id
     LEFT JOIN students s ON a.student_id = s.id"
}

pub fn populate_sql(where_clause: &str) -> String {
    format!("{} {}", populate_select(), where_clause)
}

pub fn row_to_attendance(row: &rusqlite::Row<'_>) -> rusqlite::Result<AttendancePopulated> {
    let event_id: Option<String> = row.get(6).ok();
    Ok(AttendancePopulated {
        id: row.get(0)?,
        student_id_number: row.get(1)?,
        time_in: row.get(2)?,
        time_out: row.get(3)?,
        created_at: row.get(4)?,
        updated_at: row.get(5)?,
        event: event_id.map(|_| EventInfo {
            id: row.get(6).unwrap_or_default(),
            title: row.get(7).unwrap_or_default(),
            event_type: row.get(8).unwrap_or_default(),
            start_time: row.get(9).unwrap_or_default(),
            end_time: row.get(10).unwrap_or_default(),
        }),
        recorded_by: None,
        student: {
            let sid: Option<String> = row.get(11).ok();
            sid.map(|_| StudentInfo {
                id: row.get(11).unwrap_or_default(),
                student_id: row.get(12).unwrap_or_default(),
                firstname: row.get(13).unwrap_or_default(),
                lastname: row.get(14).unwrap_or_default(),
                middlename: row.get(15).unwrap_or_default(),
                course: row.get(16).unwrap_or_default(),
                year: row.get(17).unwrap_or(-1),
                is_placeholder: {
                    let ph: Option<i64> = row.get(18).ok();
                    ph.unwrap_or(0) != 0
                },
            })
        },
    })
}
