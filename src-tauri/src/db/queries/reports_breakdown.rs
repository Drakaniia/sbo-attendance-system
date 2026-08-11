use rusqlite::{params_from_iter, Connection};
use serde::Serialize;
use std::path::Path;

use super::reports_stats::attendance_filter;

// --------------------------------------------------------------------------
// Response types
// --------------------------------------------------------------------------

#[derive(Debug, Serialize)]
pub struct EventBreakdownEntry {
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
pub struct CourseDistributionEntry {
    pub course: String,
    pub students: i64,
}

#[derive(Debug, Serialize)]
pub struct YearDistributionEntry {
    pub year: i64,
    pub students: i64,
}

// --------------------------------------------------------------------------
// 3. event-breakdown — per-event check-in/out counts
// --------------------------------------------------------------------------

pub fn event_breakdown(
    db_path: &Path,
    start_date: Option<&str>,
    end_date: Option<&str>,
) -> Result<Vec<EventBreakdownEntry>, String> {
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    let (where_clause, values) = attendance_filter(start_date, end_date, None);

    let sql = format!(
        "SELECT e.id, e.title, e.type, e.start_time,
                COUNT(CASE WHEN a.time_in  IS NOT NULL THEN 1 END) AS check_ins,
                COUNT(CASE WHEN a.time_out IS NOT NULL THEN 1 END) AS check_outs
         FROM events e
         LEFT JOIN attendance a ON a.event_id = e.id {and_clause}
         WHERE e.archived = 0
         GROUP BY e.id
         ORDER BY e.start_time DESC
         LIMIT 20",
        and_clause = if where_clause.is_empty() {
            String::new()
        } else {
            // The attendance_filter does "WHERE ...", we need "AND ..."
            // Replace "WHERE " with "AND " for the JOIN context.
            format!(" AND {}", &where_clause[6..])
        }
    );

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params_from_iter(values.iter().map(|p| p.as_ref())), |r| {
            let c_in: i64 = r.get(4)?;
            let c_out: i64 = r.get(5)?;
            Ok(EventBreakdownEntry {
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
// 4. course-distribution — distinct students per course in range
// --------------------------------------------------------------------------

pub fn course_distribution(
    db_path: &Path,
    start_date: Option<&str>,
    end_date: Option<&str>,
    event_id: Option<&str>,
) -> Result<Vec<CourseDistributionEntry>, String> {
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    let (where_clause, values) = attendance_filter(start_date, end_date, event_id);

    let sql = format!(
        "SELECT s.course, COUNT(DISTINCT s.id) AS cnt
         FROM attendance a
         JOIN students s ON a.student_id = s.id
         {where_clause}
         AND s.is_placeholder = 0 AND s.course != ''
         GROUP BY s.course
         ORDER BY cnt DESC
         LIMIT 10"
    );

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params_from_iter(values.iter().map(|p| p.as_ref())), |r| {
            Ok(CourseDistributionEntry {
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
// 5. year-distribution — distinct students per year in range
// --------------------------------------------------------------------------

pub fn year_distribution(
    db_path: &Path,
    start_date: Option<&str>,
    end_date: Option<&str>,
    event_id: Option<&str>,
) -> Result<Vec<YearDistributionEntry>, String> {
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    let (where_clause, values) = attendance_filter(start_date, end_date, event_id);

    let sql = format!(
        "SELECT s.year, COUNT(DISTINCT s.id) AS cnt
         FROM attendance a
         JOIN students s ON a.student_id = s.id
         {where_clause}
         AND s.is_placeholder = 0
         GROUP BY s.year
         ORDER BY s.year ASC"
    );

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params_from_iter(values.iter().map(|p| p.as_ref())), |r| {
            Ok(YearDistributionEntry {
                year: r.get(0)?,
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
