//! String sanitizers, date/time formatters, and math helpers for the Excel
//! export pipeline.

use chrono::{NaiveDateTime, Timelike};

use super::types::HEADER_ROW;

// ---------------------------------------------------------------------------
// Public sanitizers & formatters
// ---------------------------------------------------------------------------

/// Excel sheet-name rules: ≤31 chars, no `[ ] : * ? / \\`, not blank.
pub fn sanitize_sheet_name(title: &str) -> String {
    const INVALID: &[char] = &['[', ']', ':', '*', '?', '/', '\\'];
    const MAX_CHARS: usize = 31;

    // Swap invalid characters for a space, then collapse whitespace runs.
    let cleaned: String = title
        .chars()
        .map(|c| if INVALID.contains(&c) { ' ' } else { c })
        .collect();
    let collapsed = cleaned.split_whitespace().collect::<Vec<_>>().join(" ");

    let name: String = collapsed.chars().take(MAX_CHARS).collect();
    if name.is_empty() {
        "Attendance".to_string()
    } else {
        name
    }
}

/// `EventTitle_YYYY-MM-DD.xlsx` with path-hostile characters replaced;
/// falls back to `SEATS-Attendance_YYYY-MM-DD.xlsx` when the title is empty.
pub fn sanitize_filename(title: &str, date_iso: &str) -> String {
    // The date part is the first 10 characters (`YYYY-MM-DD`).
    let date_part: String = date_iso.chars().take(10).collect();

    let stem: String = title
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '-' || c == '_' || c == '.' {
                c
            } else {
                '-'
            }
        })
        .collect();
    let stem = stem.trim_matches('-').to_string();
    let stem = if stem.is_empty() {
        "SEATS-Attendance".to_string()
    } else {
        stem
    };
    format!("{stem}_{date_part}.xlsx")
}

/// `2026-08-15T08:00:00` or `2026-08-15 08:00:00` → `08/15/2026`; `--` on parse failure.
pub fn format_date(iso: &str) -> String {
    match parse_dt(iso) {
        Some(dt) => dt.format("%m/%d/%Y").to_string(),
        None => "--".to_string(),
    }
}

/// `2026-08-15T08:12:00` → `08:12 AM` (12-hour); `--` on parse failure.
pub fn format_time(iso: &str) -> String {
    match parse_dt(iso) {
        Some(dt) => fmt_time_of(&dt),
        None => "--".to_string(),
    }
}

/// `2026-08-15T08:12:00` → `08/15/2026 08:12 AM`; `--` on parse failure.
pub fn format_datetime(iso: &str) -> String {
    match parse_dt(iso) {
        Some(dt) => format!("{} {}", dt.format("%m/%d/%Y"), fmt_time_of(&dt)),
        None => "--".to_string(),
    }
}

/// Presence-based status per the user's "simple Present" decision.
///
/// Contract (pinned by tests):
/// - time-in + time-out  → `"Present"`
/// - time-in only        → `"No time-out"` (incomplete-scan flag)
/// - no time-in          → `"No time-in"` (defensive; a record without a
///   time-in should not normally exist since rows are created on scan)
pub fn compute_remarks(time_in: Option<&str>, time_out: Option<&str>) -> &'static str {
    match (time_in.is_some(), time_out.is_some()) {
        (true, true) => "Present",
        (true, false) => "No time-out",
        _ => "No time-in",
    }
}

/// present ÷ registered as 0.0–1.0; returns 0.0 when registered is 0
/// (never NaN or a panic).
pub fn compute_attendance_rate(present: u32, registered: u32) -> f64 {
    if registered == 0 {
        0.0
    } else {
        present as f64 / registered as f64
    }
}

/// Defense-in-depth against spreadsheet formula injection: values starting
/// with `=`, `+`, `-`, `@`, tab or CR get a leading `'`.
pub fn sanitize_cell(value: &str) -> String {
    match value.chars().next() {
        Some('=' | '+' | '-' | '@' | '\t' | '\r') => format!("'{value}"),
        _ => value.to_string(),
    }
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/// Parse timestamps stored either as ISO-8601 (`2026-08-15T08:12:00` /
/// `...T08:12:00.000Z`) or SQLite `datetime('now')` style
/// (`2026-08-15 08:12:00`).
fn parse_dt(s: &str) -> Option<NaiveDateTime> {
    const FORMATS: [&str; 3] = [
        "%Y-%m-%dT%H:%M:%S%.fZ",
        "%Y-%m-%dT%H:%M:%S%.f",
        "%Y-%m-%d %H:%M:%S",
    ];
    FORMATS
        .iter()
        .find_map(|fmt| NaiveDateTime::parse_from_str(s, fmt).ok())
}

/// `08:12 AM` style 12-hour clock for a parsed timestamp.
fn fmt_time_of(dt: &NaiveDateTime) -> String {
    let h = dt.hour();
    let ampm = if h >= 12 { "PM" } else { "AM" };
    let h12 = if h == 0 {
        12
    } else if h > 12 {
        h - 12
    } else {
        h
    };
    format!("{h12:02}:{:02} {ampm}", dt.minute())
}

/// Landscape, fit-to-one-page-wide print setup with the table header row
/// repeated on every printed page.
pub fn setup_print(ws: &mut rust_xlsxwriter::Worksheet) {
    let _ = ws.set_landscape();
    let _ = ws.set_print_fit_to_pages(1, 0);
    let _ = ws.set_margins(0.5, 0.5, 0.5, 0.5, 0.5, 0.5);
    let _ = ws.set_print_center_horizontally(true);
    let _ = ws.set_repeat_rows(HEADER_ROW, HEADER_ROW);
}
