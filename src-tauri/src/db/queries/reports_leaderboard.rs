use rusqlite::{params_from_iter, Connection};
use serde::Serialize;
use std::path::Path;

use super::reports_stats::attendance_filter;

// --------------------------------------------------------------------------
// Response types
// --------------------------------------------------------------------------

#[derive(Debug, Serialize)]
pub struct LeaderboardEntry {
    #[serde(rename = "studentId")]
    pub student_id: String,
    pub name: String,
    pub course: String,
    pub year: i64,
    #[serde(rename = "totalAttendances")]
    pub total_attendances: i64,
    #[serde(rename = "checkInRate")]
    pub check_in_rate: i64,
}

// --------------------------------------------------------------------------
// 6. leaderboard — top students by attendance count
// --------------------------------------------------------------------------

pub fn leaderboard(
    db_path: &Path,
    start_date: Option<&str>,
    end_date: Option<&str>,
    event_id: Option<&str>,
    limit: i64,
    sort_by: Option<&str>,
) -> Result<Vec<LeaderboardEntry>, String> {
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    let (where_clause, values) = attendance_filter(start_date, end_date, event_id);

    let order = match sort_by.unwrap_or("total") {
        "rate" => "check_in_rate DESC, total_attendances DESC",
        _ => "total_attendances DESC, check_in_rate DESC",
    };

    // Track param index for the LIMIT — must compute before format! uses it.
    let limit_param = values.len() + 1;

    let sql = format!(
        "SELECT a.student_id_number,
                s.firstname || ' ' || s.lastname AS name,
                COALESCE(s.course, '') AS course,
                COALESCE(s.year, 1) AS year,
                COUNT(*) AS total_attendances,
                CAST(ROUND(
                    (COUNT(CASE WHEN a.time_out IS NOT NULL THEN 1 END) * 100.0)
                    / NULLIF(COUNT(CASE WHEN a.time_in IS NOT NULL THEN 1 END), 0)
                ) AS INTEGER) AS check_in_rate
         FROM attendance a
         JOIN students s ON a.student_id = s.id
         {where_clause}
         AND s.is_placeholder = 0
         GROUP BY a.student_id_number
         ORDER BY {order}
         LIMIT ?{limit_param}"
    );

    let mut all_values = values;
    all_values.push(Box::new(limit));

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(
            params_from_iter(all_values.iter().map(|p| p.as_ref())),
            |r| {
                Ok(LeaderboardEntry {
                    student_id: r.get(0)?,
                    name: r.get::<_, String>(1)?.trim().to_string(),
                    course: r.get(2)?,
                    year: r.get(3)?,
                    total_attendances: r.get(4)?,
                    check_in_rate: r.get::<_, Option<i64>>(5)?.unwrap_or(0),
                })
            },
        )
        .map_err(|e| e.to_string())?;

    let mut list = Vec::new();
    for r in rows {
        list.push(r.map_err(|e| e.to_string())?);
    }
    Ok(list)
}
