use rusqlite::{params_from_iter, Connection};
use std::path::Path;

use crate::db::queries::export_workbook::{
    build_reports_workbook, compute_attendance_rate, format_date, ExportRow, ExportSummary,
};

use super::reports_stats::attendance_filter;

// --------------------------------------------------------------------------
// 8. export_xlsx — merged Excel workbook across the filtered range
// --------------------------------------------------------------------------

/// Builds a multi-event `.xlsx` workbook for the selected date range and
/// optional event filter — one row per attendance record, with an extra
/// Event + Date column.
///
/// The summary denominator is the masterlist (every registered student),
/// matching the dashboard's `totalStudents` convention.
pub fn export_xlsx(
    db_path: &Path,
    start_date: Option<&str>,
    end_date: Option<&str>,
    event_id: Option<&str>,
) -> Result<Vec<u8>, String> {
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    let (where_clause, values) = attendance_filter(start_date, end_date, event_id);

    let sql = format!(
        "SELECT a.student_id_number, a.time_in, a.time_out,
                s.firstname, s.lastname, s.middlename,
                s.course, s.year, s.is_placeholder,
                e.title, e.start_time
         FROM attendance a
         LEFT JOIN students s ON a.student_id = s.id
         LEFT JOIN events  e ON a.event_id    = e.id
         {where_clause}
         ORDER BY a.created_at"
    );

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let mapped = stmt
        .query_map(params_from_iter(values.iter().map(|p| p.as_ref())), |r| {
            Ok((
                r.get::<_, String>(0)?,
                r.get::<_, Option<String>>(1)?,
                r.get::<_, Option<String>>(2)?,
                r.get::<_, String>(3)?,
                r.get::<_, String>(4)?,
                r.get::<_, String>(5)?,
                r.get::<_, String>(6)?,
                r.get::<_, i64>(7)?,
                r.get::<_, i64>(8)?,
                r.get::<_, String>(9)?,
                r.get::<_, String>(10)?,
            ))
        })
        .map_err(|e| e.to_string())?;

    let mut rows = Vec::new();
    for (idx, row_result) in mapped.enumerate() {
        let (
            sid,
            time_in,
            time_out,
            firstname,
            lastname,
            middlename,
            course,
            year,
            is_placeholder,
            event_title,
            event_start,
        ) = row_result.map_err(|e| e.to_string())?;

        let is_placeholder = is_placeholder != 0;
        let full_name = if is_placeholder {
            String::new()
        } else {
            // Collapse accidental double spaces around a missing middle name.
            format!("{firstname} {middlename} {lastname}")
                .split_whitespace()
                .collect::<Vec<_>>()
                .join(" ")
        };
        let course_year = if is_placeholder {
            String::new()
        } else {
            format!("{course}/{year}")
        };

        rows.push(ExportRow {
            no: idx + 1,
            student_id: sid,
            full_name,
            course_year,
            time_in,
            time_out,
            event_title,
            event_date: format_date(&event_start),
        });
    }

    // Masterlist denominator — every registered (non-placeholder) student.
    let registered: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM students WHERE is_placeholder = 0",
            [],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;
    let present = rows.len() as u32;
    let summary = ExportSummary {
        present,
        registered: registered as u32,
        rate: compute_attendance_rate(present, registered as u32),
    };

    build_reports_workbook(&summary, &rows)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::queries::test_util::{
        cell_is_empty, cell_str, cell_text, cleanup, open_migrated, open_workbook, seed_attendance,
        seed_attendance_at, seed_event, seed_student, temp_db,
    };

    // Reports sheet columns (must match build_reports_workbook).
    const COL_NO: u32 = 0;
    const COL_STUDENT_ID: u32 = 1;
    const COL_FULL_NAME: u32 = 2;
    const COL_COURSE_YEAR: u32 = 3;
    const COL_EVENT: u32 = 4;
    const COL_DATE: u32 = 5;
    const COL_TIME_IN: u32 = 6;
    const COL_TIME_OUT: u32 = 7;
    const COL_REMARKS: u32 = 8;

    const FIRST_DATA_ROW: u32 = 7;

    #[test]
    fn export_xlsx_filters_by_event_and_includes_event_and_date_columns() {
        let path = temp_db();
        let conn = open_migrated(&path);

        let e1 = seed_event(
            &conn,
            "Orientation",
            "2026-08-15T08:00:00",
            "2026-08-15T17:00:00",
            "Gym",
        );
        let e2 = seed_event(
            &conn,
            "Seminar",
            "2026-08-20T09:00:00",
            "2026-08-20T12:00:00",
            "Auditorium",
        );
        let juan = seed_student(
            &conn,
            "2024-0001",
            "Juan",
            "D.",
            "Dela Cruz",
            "BSCS",
            2,
            false,
        );
        let maria = seed_student(&conn, "2024-0002", "Maria", "", "Santos", "BSIT", 1, false);

        seed_attendance(
            &conn,
            &e1,
            &juan,
            "2024-0001",
            Some("2026-08-15T08:12:00"),
            Some("2026-08-15T16:40:00"),
        );
        seed_attendance(
            &conn,
            &e2,
            &maria,
            "2024-0002",
            Some("2026-08-20T09:30:00"),
            None,
        );

        // Event filter → only that event's rows.
        let bytes = export_xlsx(&path, None, None, Some(&e1)).expect("export should succeed");
        let (_, range) = open_workbook(&bytes);

        assert_eq!(cell_text(&range, FIRST_DATA_ROW, COL_NO), "1");
        assert_eq!(
            cell_str(&range, FIRST_DATA_ROW, COL_STUDENT_ID),
            "2024-0001"
        );
        assert_eq!(
            cell_str(&range, FIRST_DATA_ROW, COL_FULL_NAME),
            "Juan D. Dela Cruz"
        );
        assert_eq!(cell_str(&range, FIRST_DATA_ROW, COL_COURSE_YEAR), "BSCS/2");
        assert_eq!(cell_str(&range, FIRST_DATA_ROW, COL_EVENT), "Orientation");
        assert_eq!(cell_str(&range, FIRST_DATA_ROW, COL_DATE), "08/15/2026");
        assert_eq!(
            cell_str(&range, FIRST_DATA_ROW, COL_TIME_IN),
            "08/15/2026 08:12 AM"
        );
        assert_eq!(
            cell_str(&range, FIRST_DATA_ROW, COL_TIME_OUT),
            "08/15/2026 04:40 PM"
        );
        assert_eq!(cell_str(&range, FIRST_DATA_ROW, COL_REMARKS), "Present");
        assert!(
            cell_is_empty(&range, FIRST_DATA_ROW + 1, COL_NO),
            "the other event's record must be filtered out"
        );

        // The other event → incomplete scan flagged.
        let bytes = export_xlsx(&path, None, None, Some(&e2)).expect("export should succeed");
        let (_, range) = open_workbook(&bytes);
        assert_eq!(cell_str(&range, FIRST_DATA_ROW, COL_EVENT), "Seminar");
        assert_eq!(cell_str(&range, FIRST_DATA_ROW, COL_DATE), "08/20/2026");
        assert_eq!(cell_str(&range, FIRST_DATA_ROW, COL_REMARKS), "No time-out");

        cleanup(&path);
    }

    #[test]
    fn export_xlsx_respects_date_range_filter() {
        let path = temp_db();
        let conn = open_migrated(&path);

        let e1 = seed_event(
            &conn,
            "Orientation",
            "2026-08-15T08:00:00",
            "2026-08-15T17:00:00",
            "Gym",
        );
        let e2 = seed_event(
            &conn,
            "Seminar",
            "2026-08-20T09:00:00",
            "2026-08-20T12:00:00",
            "Auditorium",
        );
        let juan = seed_student(
            &conn,
            "2024-0001",
            "Juan",
            "D.",
            "Dela Cruz",
            "BSCS",
            2,
            false,
        );
        let maria = seed_student(&conn, "2024-0002", "Maria", "", "Santos", "BSIT", 1, false);

        seed_attendance_at(
            &conn,
            &e1,
            &juan,
            "2024-0001",
            Some("2026-08-15T08:12:00"),
            Some("2026-08-15T16:40:00"),
            "2026-08-10 08:00:00",
        );
        seed_attendance_at(
            &conn,
            &e2,
            &maria,
            "2024-0002",
            Some("2026-08-20T09:30:00"),
            None,
            "2026-08-12 08:00:00",
        );

        let bytes = export_xlsx(&path, Some("2026-08-11"), Some("2026-08-12"), None)
            .expect("export should succeed");
        let (_, range) = open_workbook(&bytes);

        assert_eq!(cell_text(&range, FIRST_DATA_ROW, COL_NO), "1");
        assert_eq!(cell_str(&range, FIRST_DATA_ROW, COL_EVENT), "Seminar");
        assert!(
            cell_is_empty(&range, FIRST_DATA_ROW + 1, COL_NO),
            "the Aug 10 record must be excluded by the date range"
        );

        cleanup(&path);
    }

    #[test]
    fn export_xlsx_without_filters_merges_all_events() {
        let path = temp_db();
        let conn = open_migrated(&path);

        let e1 = seed_event(
            &conn,
            "Orientation",
            "2026-08-15T08:00:00",
            "2026-08-15T17:00:00",
            "Gym",
        );
        let e2 = seed_event(
            &conn,
            "Seminar",
            "2026-08-20T09:00:00",
            "2026-08-20T12:00:00",
            "Auditorium",
        );
        let juan = seed_student(
            &conn,
            "2024-0001",
            "Juan",
            "D.",
            "Dela Cruz",
            "BSCS",
            2,
            false,
        );
        let maria = seed_student(&conn, "2024-0002", "Maria", "", "Santos", "BSIT", 1, false);

        seed_attendance(
            &conn,
            &e1,
            &juan,
            "2024-0001",
            Some("2026-08-15T08:12:00"),
            Some("2026-08-15T16:40:00"),
        );
        seed_attendance(
            &conn,
            &e2,
            &maria,
            "2024-0002",
            Some("2026-08-20T09:30:00"),
            None,
        );

        let bytes = export_xlsx(&path, None, None, None).expect("export should succeed");
        let (_, range) = open_workbook(&bytes);

        let summary_cell = cell_str(&range, 4, 0);
        assert!(summary_cell.contains("Present: 2"), "got {summary_cell}");
        assert!(summary_cell.contains("Registered: 2"), "got {summary_cell}");
        assert_eq!(cell_str(&range, FIRST_DATA_ROW, COL_EVENT), "Orientation");
        assert_eq!(cell_str(&range, FIRST_DATA_ROW + 1, COL_EVENT), "Seminar");

        cleanup(&path);
    }
}
