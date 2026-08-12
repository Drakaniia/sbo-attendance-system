//! Shared Excel (.xlsx) workbook builders for the export features.
//!
//! The event-page export and the reports-page export share one
//! styling/layout pipeline. This module owns the pure builder functions;
//! the query layer (`attendance::export_xlsx`, `reports::export_xlsx`)
//! fetches rows and calls into here.
//!
//! ## TDD status (green)
//! The test suite in `mod tests` was written first (Phase A, red) and is
//! now green: every function below is implemented against that contract.
//!
//! ## Workbook layout (event export)
//! - Row 0: `SEATS — SBO Attendance System` (small, muted)
//! - Row 1: event title (large, bold, merged)
//! - Row 2: `Date: 08/15/2026 • Time: 08:00 AM – 05:00 PM • Venue: ...` (merged)
//! - Row 3: blank
//! - Row 4: `Present: N   Registered: M   Attendance Rate: X.X%` (merged)
//! - Row 5: blank
//! - Row 6: table header — No | Student ID | Full Name | Course/Year |
//!   Time In | Time Out | Remarks
//! - Row 7+: data rows (banded; Present tinted, No time-out tinted)
//! - Freeze panes below the header, auto-filter over the table, landscape
//!   print setup fit to one page wide.

pub mod builders;
pub mod formats;
pub mod sanitizers;
pub mod types;

// Re-export symbols consumed by external callers and by the test suite.
#[allow(unused_imports)]
pub use builders::{build_event_workbook, build_reports_workbook};
#[allow(unused_imports)]
pub use formats::ExportFormats;
#[allow(unused_imports)]
pub use sanitizers::{
    compute_attendance_rate, compute_remarks, format_date, format_datetime, format_time,
    sanitize_cell, sanitize_filename, sanitize_sheet_name,
};
#[allow(unused_imports)]
pub use types::{EventHeader, ExportRow, ExportSummary, FIRST_DATA_ROW, HEADER_ROW};

// ---------------------------------------------------------------------------
// Tests (Phase A — now green). These pin the API contract and expected
// workbook layout; all 19 pass against the implementations above.
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::queries::test_util::{
        cell, cell_is_empty, cell_str, cell_text, open_workbook, sheet1_xml,
    };
    use calamine::Data;

    // Event sheet columns
    const COL_NO: u32 = 0;
    const COL_STUDENT_ID: u32 = 1;
    const COL_FULL_NAME: u32 = 2;
    const COL_COURSE_YEAR: u32 = 3;
    const COL_TIME_IN: u32 = 4;
    const COL_TIME_OUT: u32 = 5;
    const COL_REMARKS: u32 = 6;
    // Reports sheet columns
    const R_COL_EVENT: u32 = 4;
    const R_COL_DATE: u32 = 5;
    const R_COL_TIME_IN: u32 = 6;
    const R_COL_REMARKS: u32 = 8;

    // ── Helpers (shared via `test_util` — temp DB, seeding, workbook
    //    reading) ────────────────────────────────────────────────────────

    fn header(title: &str) -> EventHeader {
        EventHeader {
            title: title.to_string(),
            date: "08/15/2026".to_string(),
            start_time: "08:00 AM".to_string(),
            end_time: "05:00 PM".to_string(),
            venue: "Gymnasium".to_string(),
        }
    }

    fn summary(present: u32, registered: u32) -> ExportSummary {
        ExportSummary {
            present,
            registered,
            rate: compute_attendance_rate(present, registered),
        }
    }

    fn row(
        no: usize,
        sid: &str,
        full_name: &str,
        course_year: &str,
        time_in: Option<&str>,
        time_out: Option<&str>,
    ) -> ExportRow {
        ExportRow {
            no,
            student_id: sid.to_string(),
            full_name: full_name.to_string(),
            course_year: course_year.to_string(),
            time_in: time_in.map(str::to_string),
            time_out: time_out.map(str::to_string),
            event_title: "Orientation".to_string(),
            event_date: "08/15/2026".to_string(),
        }
    }

    // ── 1. Content correctness ────────────────────────────────────────────

    #[test]
    fn event_workbook_has_correct_rows_columns_and_values() {
        let rows = vec![
            row(
                1,
                "2024-0001",
                "Juan Dela Cruz",
                "BSCS/2",
                Some("2026-08-15T08:12:00"),
                Some("2026-08-15T16:40:00"),
            ),
            row(
                2,
                "2024-0002",
                "Maria Santos",
                "BSIT/1",
                Some("2026-08-15T08:45:00"),
                None,
            ),
        ];
        let bytes = build_event_workbook(&header("Orientation"), &summary(2, 50), &rows)
            .expect("build should succeed");

        let (sheet_name, range) = open_workbook(&bytes);
        assert_eq!(
            sheet_name, "Orientation",
            "sheet should be named after the event"
        );

        // Header block
        assert!(cell_str(&range, 0, 0).contains("SEATS"));
        assert!(cell_str(&range, 1, 0).contains("Orientation"));
        assert!(cell_str(&range, 2, 0).contains("Gymnasium"));
        assert!(cell_str(&range, 2, 0).contains("08/15/2026"));

        // Summary block
        let summary_cell = cell_str(&range, 4, 0);
        assert!(summary_cell.contains("Present: 2"), "got {summary_cell}");
        assert!(
            summary_cell.contains("Registered: 50"),
            "got {summary_cell}"
        );
        assert!(summary_cell.contains("4.0%"), "got {summary_cell}");

        // Table header
        assert_eq!(cell_str(&range, HEADER_ROW, COL_NO), "No");
        assert_eq!(cell_str(&range, HEADER_ROW, COL_STUDENT_ID), "Student ID");
        assert_eq!(cell_str(&range, HEADER_ROW, COL_REMARKS), "Remarks");

        // First data row
        assert_eq!(cell_text(&range, FIRST_DATA_ROW, COL_NO), "1");
        assert_eq!(
            cell_str(&range, FIRST_DATA_ROW, COL_STUDENT_ID),
            "2024-0001"
        );
        assert_eq!(
            cell_str(&range, FIRST_DATA_ROW, COL_FULL_NAME),
            "Juan Dela Cruz"
        );
        assert_eq!(cell_str(&range, FIRST_DATA_ROW, COL_COURSE_YEAR), "BSCS/2");
        assert_eq!(
            cell_str(&range, FIRST_DATA_ROW, COL_TIME_IN),
            "08/15/2026 08:12 AM"
        );
        assert_eq!(
            cell_str(&range, FIRST_DATA_ROW, COL_TIME_OUT),
            "08/15/2026 04:40 PM"
        );
        assert_eq!(cell_str(&range, FIRST_DATA_ROW, COL_REMARKS), "Present");

        // Second data row — incomplete scan flagged, time-out cell unwritten
        assert_eq!(cell_text(&range, FIRST_DATA_ROW + 1, COL_NO), "2");
        assert_eq!(
            cell_str(&range, FIRST_DATA_ROW + 1, COL_REMARKS),
            "No time-out"
        );
        assert!(
            matches!(cell(&range, FIRST_DATA_ROW + 1, COL_TIME_OUT), Data::Empty),
            "time-out cell should be empty when no time-out was scanned"
        );
    }

    // ── 2. Remarks logic (no time-out) ────────────────────────────────────

    #[test]
    fn remarks_are_no_time_out_when_time_out_missing() {
        assert_eq!(
            compute_remarks(Some("2026-08-15T08:12:00"), None),
            "No time-out"
        );
        assert_eq!(
            compute_remarks(Some("2026-08-15T08:12:00"), Some("2026-08-15T16:40:00")),
            "Present"
        );
        assert_eq!(
            compute_remarks(None, Some("2026-08-15T16:40:00")),
            "No time-in"
        );
        assert_eq!(compute_remarks(None, None), "No time-in");
    }

    // ── 3. Placeholder students ───────────────────────────────────────────

    #[test]
    fn placeholder_rows_have_empty_name_and_course() {
        let rows = vec![row(
            1,
            "2024-9999",
            "",
            "",
            Some("2026-08-15T09:00:00"),
            None,
        )];
        let bytes = build_event_workbook(&header("Orientation"), &summary(1, 50), &rows)
            .expect("build should succeed");
        let (_, range) = open_workbook(&bytes);

        assert_eq!(
            cell_str(&range, FIRST_DATA_ROW, COL_STUDENT_ID),
            "2024-9999"
        );
        assert!(
            cell_is_empty(&range, FIRST_DATA_ROW, COL_FULL_NAME),
            "placeholder full name should be empty"
        );
        assert!(
            cell_is_empty(&range, FIRST_DATA_ROW, COL_COURSE_YEAR),
            "placeholder course/year should be empty"
        );
    }

    // ── 4. Injection safety ───────────────────────────────────────────────

    #[test]
    fn injection_values_are_written_as_strings_not_formulas() {
        let rows = vec![row(
            1,
            "=1+1",
            "@import os",
            "BSCS/2",
            Some("2026-08-15T08:12:00"),
            None,
        )];
        let bytes = build_event_workbook(&header("Orientation"), &summary(1, 50), &rows)
            .expect("build should succeed");

        let (_, range) = open_workbook(&bytes);
        assert!(matches!(
            cell(&range, FIRST_DATA_ROW, COL_STUDENT_ID),
            Data::String(_)
        ));
        assert!(matches!(
            cell(&range, FIRST_DATA_ROW, COL_FULL_NAME),
            Data::String(_)
        ));
        assert_eq!(cell_str(&range, FIRST_DATA_ROW, COL_STUDENT_ID), "'=1+1");
        assert_eq!(
            cell_str(&range, FIRST_DATA_ROW, COL_FULL_NAME),
            "'@import os"
        );

        let xml = sheet1_xml(&bytes);
        assert!(
            !xml.contains("<f"),
            "sheet XML must not contain formula nodes, got: {xml}"
        );
    }

    #[test]
    fn sanitize_cell_neutralizes_formula_prefixes() {
        assert_eq!(sanitize_cell("=1+1"), "'=1+1");
        assert_eq!(sanitize_cell("@evil"), "'@evil");
        assert_eq!(sanitize_cell("+cmd"), "'+cmd");
        assert_eq!(sanitize_cell("-cmd"), "'-cmd");
        assert_eq!(sanitize_cell("2024-0001"), "2024-0001");
        assert_eq!(sanitize_cell("Juan Dela Cruz"), "Juan Dela Cruz");
    }

    // ── 5. Special characters & unicode ───────────────────────────────────

    #[test]
    fn special_characters_and_unicode_are_preserved() {
        let rows = vec![row(
            1,
            "2024-0001",
            "Dela Cruz, Juan O'Neil",
            "BSCS/2",
            Some("2026-08-15T08:12:00"),
            None,
        )];
        let bytes = build_event_workbook(&header("Orientation"), &summary(1, 50), &rows)
            .expect("build should succeed");
        let (_, range) = open_workbook(&bytes);

        assert_eq!(
            cell_str(&range, FIRST_DATA_ROW, COL_FULL_NAME),
            "Dela Cruz, Juan O'Neil"
        );
        assert_eq!(cell_str(&range, FIRST_DATA_ROW, COL_COURSE_YEAR), "BSCS/2");
    }

    #[test]
    fn unicode_names_survive_round_trip() {
        let rows = vec![row(
            1,
            "2024-0001",
            "María José Ocampo",
            "BSN/3",
            Some("2026-08-15T08:12:00"),
            None,
        )];
        let bytes = build_event_workbook(&header("Orientation"), &summary(1, 50), &rows)
            .expect("build should succeed");
        let (_, range) = open_workbook(&bytes);
        assert_eq!(
            cell_str(&range, FIRST_DATA_ROW, COL_FULL_NAME),
            "María José Ocampo"
        );
    }

    // ── 6. Empty event ────────────────────────────────────────────────────

    #[test]
    fn empty_rows_still_produce_valid_workbook() {
        let bytes = build_event_workbook(&header("Orientation"), &summary(0, 50), &[])
            .expect("empty event should still export");

        let (sheet_name, range) = open_workbook(&bytes);
        assert_eq!(sheet_name, "Orientation");
        assert_eq!(cell_str(&range, HEADER_ROW, COL_NO), "No");
        assert!(
            matches!(cell(&range, FIRST_DATA_ROW, COL_NO), Data::Empty),
            "no data rows should be written for an empty event"
        );
    }

    // ── 7. Summary math ───────────────────────────────────────────────────

    #[test]
    fn attendance_rate_is_present_divided_by_registered() {
        assert!((compute_attendance_rate(2, 50) - 0.04).abs() < 1e-9);
        assert!((compute_attendance_rate(12, 50) - 0.24).abs() < 1e-9);
        assert!((compute_attendance_rate(50, 50) - 1.0).abs() < 1e-9);
    }

    #[test]
    fn attendance_rate_with_empty_masterlist_is_zero_not_nan() {
        let rate = compute_attendance_rate(12, 0);
        assert_eq!(rate, 0.0);
        assert!(rate.is_finite());
    }

    // ── 8. Filename sanitizer ─────────────────────────────────────────────

    #[test]
    fn filename_uses_title_and_date() {
        assert_eq!(
            sanitize_filename("Freshman Orientation 2026!", "2026-08-15T08:00:00"),
            "Freshman-Orientation-2026_2026-08-15.xlsx"
        );
    }

    #[test]
    fn filename_falls_back_when_title_is_empty() {
        assert_eq!(
            sanitize_filename("", "2026-08-15T08:00:00"),
            "SEATS-Attendance_2026-08-15.xlsx"
        );
        assert_eq!(
            sanitize_filename("!!!", "2026-08-15T08:00:00"),
            "SEATS-Attendance_2026-08-15.xlsx"
        );
    }

    // ── 9. Sheet name sanitizer ───────────────────────────────────────────

    #[test]
    fn sheet_name_removes_invalid_characters() {
        assert_eq!(sanitize_sheet_name("A: [2026] *X*/Y\\Z?"), "A 2026 X Y Z");
        assert_eq!(sanitize_sheet_name("Orientation"), "Orientation");
    }

    #[test]
    fn sheet_name_truncates_to_31_characters() {
        let long = "A very long event title that definitely exceeds thirty one characters for sure";
        let name = sanitize_sheet_name(long);
        assert!(name.len() <= 31, "sheet name too long: {name}");
        for c in ['[', ']', ':', '*', '?', '/', '\\'] {
            assert!(
                !name.contains(c),
                "sheet name contains invalid char {c}: {name}"
            );
        }
    }

    // ── 10. Date/time formatting ──────────────────────────────────────────

    #[test]
    fn time_formatting_is_12_hour_with_ampm() {
        assert_eq!(format_time("2026-08-15T08:12:00"), "08:12 AM");
        assert_eq!(format_time("2026-08-15T16:40:00"), "04:40 PM");
        assert_eq!(format_time("2026-08-15T00:05:00"), "12:05 AM");
        assert_eq!(format_time("2026-08-15T12:00:00"), "12:00 PM");
        // SQLite datetime('now') style — no 'T' separator.
        assert_eq!(format_time("2026-08-15 08:12:00"), "08:12 AM");
    }

    #[test]
    fn date_formatting_is_mm_dd_yyyy() {
        assert_eq!(format_date("2026-08-15T08:00:00"), "08/15/2026");
        assert_eq!(format_date("2026-08-15 08:00:00"), "08/15/2026");
    }

    #[test]
    fn datetime_formatting_combines_date_and_time() {
        assert_eq!(
            format_datetime("2026-08-15T16:40:00"),
            "08/15/2026 04:40 PM"
        );
        assert_eq!(
            format_datetime("2026-08-15T08:12:00"),
            "08/15/2026 08:12 AM"
        );
    }

    #[test]
    fn unparseable_timestamps_fall_back_to_dashes() {
        assert_eq!(format_date("garbage"), "--");
        assert_eq!(format_time("garbage"), "--");
        assert_eq!(format_datetime("garbage"), "--");
    }

    // ── 11. Reports workbook ──────────────────────────────────────────────

    #[test]
    fn reports_workbook_has_event_and_date_columns() {
        let rows = vec![
            row(
                1,
                "2024-0001",
                "Juan Dela Cruz",
                "BSCS/2",
                Some("2026-08-15T08:12:00"),
                Some("2026-08-15T16:40:00"),
            ),
            row(
                2,
                "2024-0002",
                "Maria Santos",
                "BSIT/1",
                Some("2026-09-01T09:00:00"),
                None,
            ),
        ];
        let bytes = build_reports_workbook(&summary(2, 50), &rows).expect("build should succeed");

        let (_, range) = open_workbook(&bytes);
        assert_eq!(cell_str(&range, HEADER_ROW, R_COL_EVENT), "Event");
        assert_eq!(cell_str(&range, HEADER_ROW, R_COL_DATE), "Date");
        assert_eq!(cell_str(&range, FIRST_DATA_ROW, R_COL_EVENT), "Orientation");
        assert_eq!(cell_str(&range, FIRST_DATA_ROW, R_COL_DATE), "08/15/2026");
        assert_eq!(
            cell_str(&range, FIRST_DATA_ROW, R_COL_TIME_IN),
            "08/15/2026 08:12 AM"
        );
        assert_eq!(
            cell_str(&range, FIRST_DATA_ROW + 1, R_COL_REMARKS),
            "No time-out"
        );
    }
}
