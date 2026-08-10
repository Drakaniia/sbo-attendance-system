use rusqlite::{params_from_iter, Connection};
use serde::Serialize;
use std::path::Path;

use super::attendance_filter;

// --------------------------------------------------------------------------
// Response types
// --------------------------------------------------------------------------

#[derive(Debug, Serialize)]
pub struct HeatmapHourlyEntry {
    pub hour: i64,
    pub count: i64,
}

#[derive(Debug, Serialize)]
pub struct HeatmapDailyEntry {
    #[serde(rename = "dayOfWeek")]
    pub day_of_week: i64, // 0=Mon … 6=Sun
    pub hour: i64, // 0–23
    pub count: i64,
}

// --------------------------------------------------------------------------
// 7. heatmap — hourly or daily×hourly attendance counts
// --------------------------------------------------------------------------

pub fn heatmap_hourly(
    db_path: &Path,
    start_date: Option<&str>,
    end_date: Option<&str>,
    event_id: Option<&str>,
) -> Result<Vec<HeatmapHourlyEntry>, String> {
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    let (where_clause, values) = attendance_filter(start_date, end_date, event_id);

    // Extract hour from time_in (check-ins only, as they're the primary activity metric).
    let sql = format!(
        "SELECT CAST(strftime('%H', a.time_in) AS INTEGER) AS hour,
                COUNT(*) AS cnt
         FROM attendance a {where_clause}
         AND a.time_in IS NOT NULL
         GROUP BY hour
         ORDER BY hour ASC"
    );

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params_from_iter(values.iter().map(|p| p.as_ref())), |r| {
            Ok(HeatmapHourlyEntry {
                hour: r.get(0)?,
                count: r.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut list = Vec::new();
    for r in rows {
        list.push(r.map_err(|e| e.to_string())?);
    }
    Ok(list)
}

pub fn heatmap_daily(
    db_path: &Path,
    start_date: Option<&str>,
    end_date: Option<&str>,
    event_id: Option<&str>,
) -> Result<Vec<HeatmapDailyEntry>, String> {
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    let (where_clause, values) = attendance_filter(start_date, end_date, event_id);

    // SQLite: day of week — 0=Sun,1=Mon,…,6=Sat. We want 0=Mon,…,6=Sun.
    // Map: (sqlite_dow + 6) % 7 → 0=Mon…6=Sun
    let sql = format!(
        "SELECT ((CAST(strftime('%w', a.time_in) AS INTEGER) + 6) % 7) AS day_of_week,
                CAST(strftime('%H', a.time_in) AS INTEGER) AS hour,
                COUNT(*) AS cnt
         FROM attendance a {where_clause}
         AND a.time_in IS NOT NULL
         GROUP BY day_of_week, hour
         ORDER BY day_of_week ASC, hour ASC"
    );

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params_from_iter(values.iter().map(|p| p.as_ref())), |r| {
            Ok(HeatmapDailyEntry {
                day_of_week: r.get(0)?,
                hour: r.get(1)?,
                count: r.get(2)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut list = Vec::new();
    for r in rows {
        list.push(r.map_err(|e| e.to_string())?);
    }
    Ok(list)
}
