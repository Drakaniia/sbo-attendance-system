//! Report aggregation queries — stats, trends, breakdowns, leaderboard,
//! heatmaps, and CSV export.
//!
//! Split from a single `reports.rs` into domain submodules. This file
//! re-exports the public API so call sites (`api/routes/reports.rs`) are
//! unaffected.

mod breakdown;
mod export;
mod heatmap;
mod leaderboard;
mod stats;

pub use breakdown::{
    course_distribution, event_breakdown, year_distribution, CourseDistributionEntry,
    EventBreakdownEntry, YearDistributionEntry,
};
pub use export::export_csv;
// The heatmap entry types are part of the module's public API (they appear in
// the return types of `heatmap_hourly`/`heatmap_daily`) even though call sites
// don't name them explicitly yet.
#[allow(unused_imports)]
pub use heatmap::{heatmap_daily, heatmap_hourly, HeatmapDailyEntry, HeatmapHourlyEntry};
pub use leaderboard::{leaderboard, LeaderboardEntry};
pub use stats::{attendance_trend, stats, AttendanceTrendEntry, ReportsStats};

// --------------------------------------------------------------------------
// Helpers — build WHERE clause from optional filters
// --------------------------------------------------------------------------

/// Returns (where_clause_sql, param_values) for filtering attendance by
/// date range and optional event.
fn attendance_filter(
    start_date: Option<&str>,
    end_date: Option<&str>,
    event_id: Option<&str>,
) -> (String, Vec<Box<dyn rusqlite::types::ToSql>>) {
    let mut conditions: Vec<String> = Vec::new();
    let mut values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    // Use a.created_at for date range filtering (when the record was created).
    if let Some(sd) = start_date {
        values.push(Box::new(sd.to_string()));
        conditions.push(format!("a.created_at >= ?{}", values.len()));
    }
    if let Some(ed) = end_date {
        // End date is inclusive — include the entire day.
        values.push(Box::new(format!("{} 23:59:59", ed)));
        conditions.push(format!("a.created_at <= ?{}", values.len()));
    }
    if let Some(eid) = event_id {
        values.push(Box::new(eid.to_string()));
        conditions.push(format!("a.event_id = ?{}", values.len()));
    }

    let where_clause = if conditions.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", conditions.join(" AND "))
    };

    (where_clause, values)
}
