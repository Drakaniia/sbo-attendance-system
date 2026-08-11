mod attendance_models;
mod attendance_reporting;
mod attendance_time_in_out;
pub mod attendance {
    pub use super::attendance_models::*;
    pub use super::attendance_reporting::*;
    pub use super::attendance_time_in_out::*;
}

pub mod dashboard;
pub mod events;
pub mod export_workbook;

mod reports_breakdown;
mod reports_export;
mod reports_heatmap;
mod reports_leaderboard;
mod reports_stats;
pub mod reports {
    pub use super::reports_breakdown::*;
    pub use super::reports_export::export_xlsx;
    pub use super::reports_heatmap::*;
    pub use super::reports_leaderboard::*;
    pub use super::reports_stats::*;
}

pub mod settings;
pub mod students;

// Shared helpers for query-layer tests (temp DB + seed data + workbook
// reading). Test-only — it would otherwise be dead code in normal builds.
#[cfg(test)]
pub mod test_util;
