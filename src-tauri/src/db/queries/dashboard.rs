use rusqlite::{params, Connection, Result};
use serde::Serialize;
use std::path::Path;

// --------------------------------------------------------------------------
// Response types
// --------------------------------------------------------------------------

#[derive(Debug, Serialize)]
pub struct DashboardStats {
    #[serde(rename = "totalEvents")]
    pub total_events: i64,
    #[serde(rename = "activeEvents")]
    pub active_events: i64,
    #[serde(rename = "archivedEvents")]
    pub archived_events: i64,
    #[serde(rename = "totalStudents")]
    pub total_students: i64,
    #[serde(rename = "totalAttendances")]
    pub total_attendances: i64,
    #[serde(rename = "totalCheckIns")]
    pub total_check_ins: i64,
    #[serde(rename = "totalCheckOuts")]
    pub total_check_outs: i64,
    #[serde(rename = "attendanceRate")]
    pub attendance_rate: i64,
}

#[derive(Debug, Serialize)]
pub struct EventAttendanceEntry {
    #[serde(rename = "eventId")]
    pub event_id: String,
    pub title: String,
    #[serde(rename = "type")]
    pub event_type: String,
    #[serde(rename = "startTime")]
    pub start_time: String,
    #[serde(rename = "checkIns")]
    pub check_ins: i64,
    #[serde(rename = "checkOuts")]
    pub check_outs: i64,
    pub total: i64,
}

#[derive(Debug, Serialize)]
pub struct CourseDistribution {
    pub course: String,
    pub students: i64,
}

#[derive(Debug, Serialize)]
pub struct RecentActivity {
    #[serde(rename = "_id")]
    pub id: String,
    #[serde(rename = "studentID")]
    pub student_id_number: String,
    #[serde(rename = "timeIn")]
    pub time_in: Option<String>,
    #[serde(rename = "timeOut")]
    pub time_out: Option<String>,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
    pub student: Option<StudentSummary>,
    pub event: Option<EventSummary>,
}

#[derive(Debug, Serialize)]
pub struct StudentSummary {
    #[serde(rename = "_id")]
    pub id: String,
    #[serde(rename = "studentID")]
    pub student_id: String,
    pub firstname: String,
    pub lastname: String,
    pub course: String,
    pub year: i64,
}

#[derive(Debug, Serialize)]
pub struct EventSummary {
    #[serde(rename = "_id")]
    pub id: String,
    pub title: String,
    #[serde(rename = "type")]
    pub event_type: String,
}

#[derive(Debug, Serialize)]
pub struct AttendanceTrend {
    pub date: String,
    #[serde(rename = "checkIns")]
    pub check_ins: i64,
    #[serde(rename = "checkOuts")]
    pub check_outs: i64,
    pub total: i64,
}

// --------------------------------------------------------------------------
// stats — 7 counts + computed attendance rate
// --------------------------------------------------------------------------

pub fn stats(db_path: &Path) -> Result<DashboardStats, String> {
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    conn.query_row(
        "SELECT
            (SELECT COUNT(*) FROM events)                                 AS total_events,
            (SELECT COUNT(*) FROM events WHERE archived = 0)              AS active_events,
            (SELECT COUNT(*) FROM events WHERE archived = 1)              AS archived_events,
            (SELECT COUNT(*) FROM students WHERE is_placeholder = 0)      AS total_students,
            (SELECT COUNT(*) FROM attendance)                             AS total_attendances,
            (SELECT COUNT(*) FROM attendance WHERE time_in  IS NOT NULL)  AS check_ins,
            (SELECT COUNT(*) FROM attendance WHERE time_out IS NOT NULL)  AS check_outs",
        [],
        |r| {
            let check_ins: i64 = r.get(5)?;
            let check_outs: i64 = r.get(6)?;
            Ok(DashboardStats {
                total_events: r.get(0)?,
                active_events: r.get(1)?,
                archived_events: r.get(2)?,
                total_students: r.get(3)?,
                total_attendances: r.get(4)?,
                total_check_ins: check_ins,
                total_check_outs: check_outs,
                attendance_rate: if check_ins > 0 {
                    ((check_outs as f64 / check_ins as f64) * 100.0).round() as i64
                } else {
                    0
                },
            })
        },
    )
    .map_err(|e| e.to_string())
}

// --------------------------------------------------------------------------
// event-attendance — top 10 non-archived events with check-in/out counts
// --------------------------------------------------------------------------

pub fn event_attendance(db_path: &Path) -> Result<Vec<EventAttendanceEntry>, String> {
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT e.id, e.title, e.type, e.start_time,
                    COUNT(CASE WHEN a.time_in  IS NOT NULL THEN 1 END) AS check_ins,
                    COUNT(CASE WHEN a.time_out IS NOT NULL THEN 1 END) AS check_outs
             FROM events e
             LEFT JOIN attendance a ON a.event_id = e.id
             WHERE e.archived = 0
             GROUP BY e.id
             ORDER BY e.start_time DESC
             LIMIT 10",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |r| {
            let c_in: i64 = r.get(4)?;
            let c_out: i64 = r.get(5)?;
            Ok(EventAttendanceEntry {
                event_id: r.get(0)?,
                title: r.get(1)?,
                event_type: r.get(2)?,
                start_time: r.get(3)?,
                check_ins: c_in,
                check_outs: c_out,
                total: c_in + c_out,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut list = Vec::new();
    for r in rows {
        list.push(r.map_err(|e| e.to_string())?);
    }
    Ok(list)
}

// --------------------------------------------------------------------------
// course-distribution — top 8 courses by student count
// --------------------------------------------------------------------------

pub fn course_distribution(db_path: &Path) -> Result<Vec<CourseDistribution>, String> {
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT course, COUNT(*) AS cnt
             FROM students
             WHERE is_placeholder = 0 AND course != ''
             GROUP BY course
             ORDER BY cnt DESC
             LIMIT 8",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |r| {
            Ok(CourseDistribution {
                course: r.get(0)?,
                students: r.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut list = Vec::new();
    for r in rows {
        list.push(r.map_err(|e| e.to_string())?);
    }
    Ok(list)
}

// --------------------------------------------------------------------------
// recent-activity — latest N attendances with student + event summary
// --------------------------------------------------------------------------

pub fn recent_activity(db_path: &Path, limit: i64) -> Result<Vec<RecentActivity>, String> {
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT a.id, a.student_id_number, a.time_in, a.time_out, a.updated_at,
                    s.id, s.student_id, s.firstname, s.lastname, s.course, s.year,
                    e.id, e.title, e.type
             FROM attendance a
             LEFT JOIN students s ON a.student_id = s.id
             LEFT JOIN events  e ON a.event_id    = e.id
             ORDER BY a.updated_at DESC
             LIMIT ?1",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![limit], |r| {
            let sid: Option<String> = r.get(5)?;
            let eid: Option<String> = r.get(11)?;
            Ok(RecentActivity {
                id: r.get(0)?,
                student_id_number: r.get(1)?,
                time_in: r.get(2)?,
                time_out: r.get(3)?,
                updated_at: r.get(4)?,
                student: sid.map(|_| StudentSummary {
                    id: r.get(5).unwrap_or_default(),
                    student_id: r.get(6).unwrap_or_default(),
                    firstname: r.get(7).unwrap_or_default(),
                    lastname: r.get(8).unwrap_or_default(),
                    course: r.get(9).unwrap_or_default(),
                    year: r.get(10).unwrap_or(-1),
                }),
                event: eid.map(|_| EventSummary {
                    id: r.get(11).unwrap_or_default(),
                    title: r.get(12).unwrap_or_default(),
                    event_type: r.get(13).unwrap_or_default(),
                }),
            })
        })
        .map_err(|e| e.to_string())?;

    let mut list = Vec::new();
    for r in rows {
        list.push(r.map_err(|e| e.to_string())?);
    }
    Ok(list)
}

// --------------------------------------------------------------------------
// attendance-trend — daily check-in/out counts for the last N days
// --------------------------------------------------------------------------

pub fn attendance_trend(db_path: &Path, days: i64) -> Result<Vec<AttendanceTrend>, String> {
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT date(created_at)                                        AS day,
                    COUNT(CASE WHEN time_in  IS NOT NULL THEN 1 END)        AS check_ins,
                    COUNT(CASE WHEN time_out IS NOT NULL THEN 1 END)        AS check_outs,
                    COUNT(*)                                                AS total
             FROM attendance
             WHERE created_at >= date('now', ?1)
             GROUP BY day
             ORDER BY day ASC",
        )
        .map_err(|e| e.to_string())?;

    let offset = format!("-{} days", days);
    let rows = stmt
        .query_map(params![offset], |r| {
            let c_in: i64 = r.get(1)?;
            let c_out: i64 = r.get(2)?;
            Ok(AttendanceTrend {
                date: r.get(0)?,
                check_ins: c_in,
                check_outs: c_out,
                total: c_in + c_out,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut list = Vec::new();
    for r in rows {
        list.push(r.map_err(|e| e.to_string())?);
    }
    Ok(list)
}
