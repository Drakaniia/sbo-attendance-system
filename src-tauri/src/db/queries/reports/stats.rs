use rusqlite::{params_from_iter, Connection};
use serde::Serialize;
use std::path::Path;

use super::attendance_filter;

// --------------------------------------------------------------------------
// Response types
// --------------------------------------------------------------------------

#[derive(Debug, Serialize)]
pub struct ReportsStats {
    #[serde(rename = "totalCheckIns")]
    pub total_check_ins: i64,
    #[serde(rename = "totalCheckOuts")]
    pub total_check_outs: i64,
    #[serde(rename = "attendanceRate")]
    pub attendance_rate: i64,
    #[serde(rename = "uniqueStudents")]
    pub unique_students: i64,
    #[serde(rename = "activeEvents")]
    pub active_events: i64,
    #[serde(rename = "totalRecords")]
    pub total_records: i64,
}

#[derive(Debug, Serialize)]
pub struct AttendanceTrendEntry {
    pub date: String,
    #[serde(rename = "checkIns")]
    pub check_ins: i64,
    #[serde(rename = "checkOuts")]
    pub check_outs: i64,
    pub total: i64,
}

// --------------------------------------------------------------------------
// 1. stats
// --------------------------------------------------------------------------

pub fn stats(
    db_path: &Path,
    start_date: Option<&str>,
    end_date: Option<&str>,
    event_id: Option<&str>,
) -> Result<ReportsStats, String> {
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    let (where_clause, values) = attendance_filter(start_date, end_date, event_id);

    // Count distinct students who have at least one attendance record.
    let student_sql = format!(
        "SELECT COUNT(DISTINCT a.student_id) FROM attendance a
         LEFT JOIN students s ON a.student_id = s.id
         {where_clause} AND s.is_placeholder = 0"
    );
    let unique_students: i64 = conn
        .query_row(
            &student_sql,
            params_from_iter(values.iter().map(|p| p.as_ref())),
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;

    // Count active events that have at least one attendance in range.
    let event_sql = format!("SELECT COUNT(DISTINCT a.event_id) FROM attendance a {where_clause}");
    let active_events: i64 = conn
        .query_row(
            &event_sql,
            params_from_iter(values.iter().map(|p| p.as_ref())),
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;

    // Aggregate counts.
    let agg_sql = format!(
        "SELECT
            COUNT(CASE WHEN a.time_in  IS NOT NULL THEN 1 END) AS check_ins,
            COUNT(CASE WHEN a.time_out IS NOT NULL THEN 1 END) AS check_outs,
            COUNT(*) AS total_records
         FROM attendance a {where_clause}"
    );
    conn.query_row(
        &agg_sql,
        params_from_iter(values.iter().map(|p| p.as_ref())),
        |r| {
            let check_ins: i64 = r.get(0)?;
            let check_outs: i64 = r.get(1)?;
            Ok(ReportsStats {
                total_check_ins: check_ins,
                total_check_outs: check_outs,
                attendance_rate: if check_ins > 0 {
                    ((check_outs as f64 / check_ins as f64) * 100.0).round() as i64
                } else {
                    0
                },
                unique_students,
                active_events,
                total_records: r.get(2)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}

// --------------------------------------------------------------------------
// 2. attendance-trend — daily check-in/out counts
// --------------------------------------------------------------------------

pub fn attendance_trend(
    db_path: &Path,
    start_date: Option<&str>,
    end_date: Option<&str>,
    event_id: Option<&str>,
) -> Result<Vec<AttendanceTrendEntry>, String> {
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    let (where_clause, values) = attendance_filter(start_date, end_date, event_id);

    let sql = format!(
        "SELECT date(a.created_at) AS day,
                COUNT(CASE WHEN a.time_in  IS NOT NULL THEN 1 END) AS check_ins,
                COUNT(CASE WHEN a.time_out IS NOT NULL THEN 1 END) AS check_outs
         FROM attendance a {where_clause}
         GROUP BY day
         ORDER BY day ASC"
    );

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params_from_iter(values.iter().map(|p| p.as_ref())), |r| {
            let c_in: i64 = r.get(1)?;
            let c_out: i64 = r.get(2)?;
            Ok(AttendanceTrendEntry {
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
