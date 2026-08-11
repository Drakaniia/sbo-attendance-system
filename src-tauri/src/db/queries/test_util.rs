//! Shared helpers for query-layer tests — a temporary SQLite database with
//! migrations and seed data, plus calamine/zip helpers for reading back
//! generated `.xlsx` workbooks.
//!
//! Extracted from the original pattern in the `settings.rs` tests (temp DB +
//! `run_migrations` + cleanup) so the export tests don't each duplicate it.

use calamine::{Data, Range, Reader, Xlsx};
use rusqlite::{params, Connection};
use std::io::{Cursor, Read};
use std::path::{Path, PathBuf};
use uuid::Uuid;

// ── Database lifecycle ───────────────────────────────────────────────────

/// Unique temp DB path per test; removed when the test finishes.
pub fn temp_db() -> PathBuf {
    std::env::temp_dir().join(format!("seats-export-test-{}.db", Uuid::new_v4()))
}

/// Opens the DB and applies all migrations.
pub fn open_migrated(db_path: &Path) -> Connection {
    let conn = Connection::open(db_path).unwrap();
    crate::db::migrations::run_migrations(&conn).unwrap();
    conn
}

/// Removes the DB file plus its WAL/SHM sidecars.
pub fn cleanup(path: &Path) {
    for suffix in ["", "-wal", "-shm"] {
        let _ = std::fs::remove_file(path.with_extension(format!("db{suffix}")));
    }
}

// ── Seed helpers ─────────────────────────────────────────────────────────

/// Inserts a student; returns the row UUID.
#[allow(clippy::too_many_arguments)]
pub fn seed_student(
    conn: &Connection,
    student_id_number: &str,
    firstname: &str,
    middlename: &str,
    lastname: &str,
    course: &str,
    year: i64,
    is_placeholder: bool,
) -> String {
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO students
            (id, student_id, firstname, middlename, lastname, gender, course, year, is_placeholder)
         VALUES (?1, ?2, ?3, ?4, ?5, 'M', ?6, ?7, ?8)",
        params![
            id,
            student_id_number,
            firstname,
            middlename,
            lastname,
            course,
            year,
            is_placeholder as i64,
        ],
    )
    .unwrap();
    id
}

/// Inserts an event; returns the row UUID.
pub fn seed_event(
    conn: &Connection,
    title: &str,
    start_time: &str,
    end_time: &str,
    venue: &str,
) -> String {
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO events (id, title, description, type, venue, start_time, end_time, archived)
         VALUES (?1, ?2, '', '', ?3, ?4, ?5, 0)",
        params![id, title, venue, start_time, end_time],
    )
    .unwrap();
    id
}

/// Inserts an attendance record for a seeded student + event.
pub fn seed_attendance(
    conn: &Connection,
    event_id: &str,
    student_uuid: &str,
    student_id_number: &str,
    time_in: Option<&str>,
    time_out: Option<&str>,
) {
    conn.execute(
        "INSERT INTO attendance (id, event_id, student_id, student_id_number, time_in, time_out)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            Uuid::new_v4().to_string(),
            event_id,
            student_uuid,
            student_id_number,
            time_in,
            time_out,
        ],
    )
    .unwrap();
}

/// Like [`seed_attendance`] but with an explicit `created_at` — needed by the
/// date-range filter tests (the filter matches `a.created_at`).
pub fn seed_attendance_at(
    conn: &Connection,
    event_id: &str,
    student_uuid: &str,
    student_id_number: &str,
    time_in: Option<&str>,
    time_out: Option<&str>,
    created_at: &str,
) {
    conn.execute(
        "INSERT INTO attendance
            (id, event_id, student_id, student_id_number, time_in, time_out, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            Uuid::new_v4().to_string(),
            event_id,
            student_uuid,
            student_id_number,
            time_in,
            time_out,
            created_at,
        ],
    )
    .unwrap();
}

// ── Workbook readers (calamine + zip) ────────────────────────────────────

/// Opens the first sheet of a generated workbook; returns (sheet_name, cells).
pub fn open_workbook(bytes: &[u8]) -> (String, Range<Data>) {
    assert!(
        bytes.len() >= 2 && &bytes[0..2] == b"PK",
        "output must be a valid xlsx (zip) file"
    );
    let mut rdr: Xlsx<Cursor<&[u8]>> = Xlsx::new(Cursor::new(bytes)).expect("workbook should open");
    let mut sheets = rdr.worksheets();
    assert!(
        !sheets.is_empty(),
        "workbook should have at least one sheet"
    );
    sheets.remove(0)
}

/// The cell at (row, col), or `Data::Empty` when absent.
pub fn cell(range: &Range<Data>, row: u32, col: u32) -> &Data {
    range.get_value((row, col)).unwrap_or(&Data::Empty)
}

/// Cell as a string (panics when the cell holds a non-string value).
pub fn cell_str(range: &Range<Data>, row: u32, col: u32) -> String {
    match cell(range, row, col) {
        Data::String(s) => s.clone(),
        other => panic!("expected a string cell at ({row}, {col}), got {other:?}"),
    }
}

/// Cell rendered as text — accepts both string and numeric cells (the "No"
/// column may legitimately be written as a number).
pub fn cell_text(range: &Range<Data>, row: u32, col: u32) -> String {
    match cell(range, row, col) {
        Data::String(s) => s.clone(),
        Data::Int(i) => i.to_string(),
        Data::Float(f) => f.to_string(),
        other => panic!("expected a string or number cell at ({row}, {col}), got {other:?}"),
    }
}

/// True when the cell holds no meaningful value (blank cell or an empty
/// string — rust_xlsxwriter/calamine may represent either way).
pub fn cell_is_empty(range: &Range<Data>, row: u32, col: u32) -> bool {
    match cell(range, row, col) {
        Data::Empty => true,
        Data::String(s) => s.is_empty(),
        _ => false,
    }
}

/// Unzips `xl/worksheets/sheet1.xml` from a generated workbook.
pub fn sheet1_xml(bytes: &[u8]) -> String {
    let mut archive: zip::ZipArchive<Cursor<&[u8]>> =
        zip::ZipArchive::new(Cursor::new(bytes)).expect("zip should open");
    let mut file = archive
        .by_name("xl/worksheets/sheet1.xml")
        .expect("sheet1.xml should exist");
    let mut xml = String::new();
    file.read_to_string(&mut xml).expect("xml should read");
    xml
}
