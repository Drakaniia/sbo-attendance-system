use rusqlite::{params, Connection};
use std::path::Path;

use super::attendance_models::{
    populate_select, row_to_attendance, AttendancePopulated, PaginatedAttendances,
};

// --------------------------------------------------------------------------
// list_recent — latest N attendances
// --------------------------------------------------------------------------

pub fn list_recent(db_path: &Path, limit: i64) -> Result<Vec<AttendancePopulated>, String> {
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(&format!(
            "{} ORDER BY a.updated_at DESC LIMIT ?1",
            populate_select()
        ))
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![limit], row_to_attendance)
        .map_err(|e| e.to_string())?;
    let mut list = Vec::new();
    for r in rows {
        list.push(r.map_err(|e| e.to_string())?);
    }
    Ok(list)
}

// --------------------------------------------------------------------------
// list_by_event — paginated attendances for an event
// --------------------------------------------------------------------------

pub fn list_by_event(
    db_path: &Path,
    event_id: &str,
    page: i64,
    page_size: i64,
) -> Result<PaginatedAttendances, String> {
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    let total: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM attendance WHERE event_id = ?1",
            params![event_id],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;

    let total_pages = ((total as f64) / (page_size as f64)).ceil() as i64;
    let total_pages = if total_pages < 1 { 1 } else { total_pages };
    let offset = (page - 1).max(0) * page_size;
    let next = if offset + page_size < total {
        page + 1
    } else {
        -1
    };
    let prev = if page > 1 { page - 1 } else { -1 };

    let sql = format!(
        "{} WHERE a.event_id = ?1 ORDER BY a.updated_at DESC LIMIT ?2 OFFSET ?3",
        populate_select()
    );
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![event_id, page_size, offset], row_to_attendance)
        .map_err(|e| e.to_string())?;

    let mut data = Vec::new();
    for r in rows {
        data.push(r.map_err(|e| e.to_string())?);
    }

    Ok(PaginatedAttendances {
        data,
        total,
        total_pages,
        next,
        prev,
    })
}

// --------------------------------------------------------------------------
// export_xlsx — build a formatted Excel workbook for an event's attendances
// --------------------------------------------------------------------------

use crate::db::queries::export_workbook::{
    build_event_workbook, compute_attendance_rate, format_date, format_time, EventHeader,
    ExportRow, ExportSummary,
};

/// Builds an `.xlsx` workbook for one event: header block (title, date, time,
/// venue), a summary line (Present / Registered / rate), and one row per
/// scanned student.
///
/// The summary denominator is the masterlist — every registered
/// (non-placeholder) student — matching the dashboard's `totalStudents`
/// convention.
pub fn export_xlsx(db_path: &Path, event_id: &str) -> Result<Vec<u8>, String> {
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    // Event info — error when the event doesn't exist.
    let (title, start_time, end_time, venue): (String, String, String, String) = conn
        .query_row(
            "SELECT title, start_time, end_time, venue FROM events WHERE id = ?1",
            params![event_id],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?)),
        )
        .map_err(|_| "Event not found".to_string())?;

    // Masterlist denominator — every registered (non-placeholder) student.
    let registered: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM students WHERE is_placeholder = 0",
            [],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;

    // Every scanned record for this event, oldest first.
    let mut stmt = conn
        .prepare(
            "SELECT a.student_id_number, a.time_in, a.time_out,
                    s.firstname, s.lastname, s.middlename,
                    s.course, s.year, s.is_placeholder
             FROM attendance a
             LEFT JOIN students s ON a.student_id = s.id
             WHERE a.event_id = ?1
             ORDER BY a.created_at",
        )
        .map_err(|e| e.to_string())?;

    let mapped = stmt
        .query_map(params![event_id], |r| {
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
            ))
        })
        .map_err(|e| e.to_string())?;

    let mut rows = Vec::new();
    for (idx, row_result) in mapped.enumerate() {
        let (sid, time_in, time_out, firstname, lastname, middlename, course, year, is_placeholder) =
            row_result.map_err(|e| e.to_string())?;

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
            event_title: title.clone(),
            event_date: format_date(&start_time),
        });
    }

    let header = EventHeader {
        title: title.clone(),
        date: format_date(&start_time),
        start_time: format_time(&start_time),
        end_time: format_time(&end_time),
        venue,
    };
    let present = rows.len() as u32;
    let summary = ExportSummary {
        present,
        registered: registered as u32,
        rate: compute_attendance_rate(present, registered as u32),
    };

    build_event_workbook(&header, &summary, &rows)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::queries::test_util::{
        cell_is_empty, cell_str, cell_text, cleanup, open_migrated, open_workbook, seed_attendance,
        seed_event, seed_student, temp_db,
    };

    // Event sheet columns (must match build_event_workbook).
    const COL_NO: u32 = 0;
    const COL_STUDENT_ID: u32 = 1;
    const COL_FULL_NAME: u32 = 2;
    const COL_COURSE_YEAR: u32 = 3;
    const COL_TIME_IN: u32 = 4;
    const COL_TIME_OUT: u32 = 5;
    const COL_REMARKS: u32 = 6;

    const FIRST_DATA_ROW: u32 = 7;

    #[test]
    fn export_xlsx_lists_scanned_students_with_header_and_summary() {
        let path = temp_db();
        let conn = open_migrated(&path);

        let event_id = seed_event(
            &conn,
            "Freshman Orientation",
            "2026-08-15T08:00:00",
            "2026-08-15T17:00:00",
            "Gymnasium",
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
        // Masterlist-only student — counted in Registered but never scanned.
        seed_student(&conn, "2024-0003", "Pedro", "", "Reyes", "BSN", 3, false);

        seed_attendance(
            &conn,
            &event_id,
            &juan,
            "2024-0001",
            Some("2026-08-15T08:12:00"),
            Some("2026-08-15T16:40:00"),
        );
        seed_attendance(
            &conn,
            &event_id,
            &maria,
            "2024-0002",
            Some("2026-08-15T08:45:00"),
            None,
        );

        let bytes = export_xlsx(&path, &event_id).expect("export should succeed");

        let (sheet_name, range) = open_workbook(&bytes);
        assert_eq!(sheet_name, "Freshman Orientation");

        // Header block
        assert!(cell_str(&range, 1, 0).contains("Freshman Orientation"));
        let info = cell_str(&range, 2, 0);
        assert!(info.contains("08/15/2026"), "got {info}");
        assert!(info.contains("Gymnasium"), "got {info}");
        assert!(info.contains("08:00 AM"), "got {info}");
        assert!(info.contains("05:00 PM"), "got {info}");

        // Summary — Present = scanned records, Registered = masterlist.
        let summary_cell = cell_str(&range, 4, 0);
        assert!(summary_cell.contains("Present: 2"), "got {summary_cell}");
        assert!(summary_cell.contains("Registered: 3"), "got {summary_cell}");
        assert!(summary_cell.contains("66.7%"), "got {summary_cell}");

        // First row — full scan.
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
        assert_eq!(
            cell_str(&range, FIRST_DATA_ROW, COL_TIME_IN),
            "08/15/2026 08:12 AM"
        );
        assert_eq!(
            cell_str(&range, FIRST_DATA_ROW, COL_TIME_OUT),
            "08/15/2026 04:40 PM"
        );
        assert_eq!(cell_str(&range, FIRST_DATA_ROW, COL_REMARKS), "Present");

        // Second row — incomplete scan flagged, no time-out written.
        assert_eq!(cell_text(&range, FIRST_DATA_ROW + 1, COL_NO), "2");
        assert_eq!(
            cell_str(&range, FIRST_DATA_ROW + 1, COL_FULL_NAME),
            "Maria Santos"
        );
        assert_eq!(
            cell_str(&range, FIRST_DATA_ROW + 1, COL_REMARKS),
            "No time-out"
        );
        assert!(cell_is_empty(&range, FIRST_DATA_ROW + 1, COL_TIME_OUT));

        cleanup(&path);
    }

    #[test]
    fn export_xlsx_placeholder_student_has_empty_name_and_course() {
        let path = temp_db();
        let conn = open_migrated(&path);

        let event_id = seed_event(
            &conn,
            "Orientation",
            "2026-08-15T08:00:00",
            "2026-08-15T17:00:00",
            "Gym",
        );
        let ghost = seed_student(&conn, "2024-9999", "", "", "", "", 1, true);
        seed_attendance(
            &conn,
            &event_id,
            &ghost,
            "2024-9999",
            Some("2026-08-15T09:00:00"),
            None,
        );

        let bytes = export_xlsx(&path, &event_id).expect("export should succeed");
        let (_, range) = open_workbook(&bytes);

        assert_eq!(
            cell_str(&range, FIRST_DATA_ROW, COL_STUDENT_ID),
            "2024-9999"
        );
        assert!(cell_is_empty(&range, FIRST_DATA_ROW, COL_FULL_NAME));
        assert!(cell_is_empty(&range, FIRST_DATA_ROW, COL_COURSE_YEAR));

        cleanup(&path);
    }

    #[test]
    fn export_xlsx_empty_event_still_produces_valid_workbook() {
        let path = temp_db();
        let conn = open_migrated(&path);

        let event_id = seed_event(
            &conn,
            "Orientation",
            "2026-08-15T08:00:00",
            "2026-08-15T17:00:00",
            "Gym",
        );

        let bytes = export_xlsx(&path, &event_id).expect("empty event should export");
        let (sheet_name, range) = open_workbook(&bytes);

        assert_eq!(sheet_name, "Orientation");
        let summary_cell = cell_str(&range, 4, 0);
        assert!(summary_cell.contains("Present: 0"), "got {summary_cell}");
        assert!(summary_cell.contains("Registered: 0"), "got {summary_cell}");
        assert!(
            cell_is_empty(&range, FIRST_DATA_ROW, COL_NO),
            "no data rows expected for an empty event"
        );

        cleanup(&path);
    }

    #[test]
    fn export_xlsx_unknown_event_returns_error() {
        let path = temp_db();
        open_migrated(&path);

        let err = export_xlsx(&path, "00000000-0000-0000-0000-000000000000")
            .expect_err("unknown event should fail");
        assert_eq!(err, "Event not found");

        cleanup(&path);
    }
}
