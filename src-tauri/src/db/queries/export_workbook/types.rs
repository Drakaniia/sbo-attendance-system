//! Data types and constants for the Excel workbook builders.

/// 0-indexed row of the table header (shared by both layouts).
pub const HEADER_ROW: u32 = 6;
/// 0-indexed row of the first data row.
pub const FIRST_DATA_ROW: u32 = 7;

/// One attendance row destined for an export sheet (both variants).
#[derive(Debug, Clone)]
pub struct ExportRow {
    /// 1-based row number shown in the "No" column.
    pub no: usize,
    /// Scanned student ID — always written as text (keeps leading zeros).
    pub student_id: String,
    /// `First Middle Last` — empty for placeholder students.
    pub full_name: String,
    /// `Course/Year` e.g. `BSCS/2` — empty for placeholder students.
    pub course_year: String,
    /// Raw ISO timestamp of the time-in scan, if any.
    pub time_in: Option<String>,
    /// Raw ISO timestamp of the time-out scan, if any.
    pub time_out: Option<String>,
    /// Event title (used by the multi-event reports sheet).
    pub event_title: String,
    /// Event date `MM/DD/YYYY` (used by the multi-event reports sheet).
    pub event_date: String,
}

/// Event information rendered in the workbook header block (event export).
#[derive(Debug, Clone)]
pub struct EventHeader {
    pub title: String,
    /// Event date formatted `MM/DD/YYYY`.
    pub date: String,
    /// Start time formatted `hh:mm AM/PM`.
    pub start_time: String,
    /// End time formatted `hh:mm AM/PM`.
    pub end_time: String,
    pub venue: String,
}

/// Summary block rendered above the table.
#[derive(Debug, Clone)]
pub struct ExportSummary {
    pub present: u32,
    /// Denominator — total registered students (masterlist).
    pub registered: u32,
    /// Rate 0.0–1.0 (present ÷ registered), computed by
    /// `compute_attendance_rate`.
    pub rate: f64,
}
