use rusqlite::{params, Connection, Result};
use std::path::Path;
use uuid::Uuid;

use super::models::{populate_sql, row_to_attendance, AttendancePopulated};
use crate::db::queries::students::{self, Student};

// --------------------------------------------------------------------------
// find_or_create_student — lookup by studentID, create placeholder if missing
// --------------------------------------------------------------------------

fn find_or_create_student(conn: &Connection, student_id_number: &str) -> Result<Student, String> {
    // Try to find existing student.
    let mut stmt = conn
        .prepare(
            "SELECT id, student_id, firstname, lastname, middlename,
                    gender, course, year, email, is_placeholder,
                    created_at, updated_at
             FROM students WHERE student_id = ?1",
        )
        .map_err(|e| e.to_string())?;

    let existing = stmt
        .query_row(params![student_id_number], students::row_to_student)
        .ok();

    if let Some(s) = existing {
        return Ok(s);
    }

    // Create placeholder.
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO students (id, student_id, firstname, lastname, middlename, gender, course, year, email, is_placeholder, created_at, updated_at)
         VALUES (?1, ?2, '', '', '', 'M', '', 1, '', 1, datetime('now'), datetime('now'))",
        params![id, student_id_number],
    )
    .map_err(|e| e.to_string())?;

    // Read back the created row.
    let mut stmt2 = conn
        .prepare(
            "SELECT id, student_id, firstname, lastname, middlename,
                    gender, course, year, email, is_placeholder,
                    created_at, updated_at
             FROM students WHERE id = ?1",
        )
        .map_err(|e| e.to_string())?;

    stmt2
        .query_row(params![id], students::row_to_student)
        .map_err(|e| e.to_string())
}

// --------------------------------------------------------------------------
// get_attendance — single record, fully populated
// --------------------------------------------------------------------------

fn get_attendance(db_path: &Path, attendance_id: &str) -> Result<AttendancePopulated, String> {
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    conn.query_row(
        &populate_sql("WHERE a.id = ?1"),
        params![attendance_id],
        row_to_attendance,
    )
    .map_err(|e| {
        if matches!(e, rusqlite::Error::QueryReturnedNoRows) {
            "Attendance record not found".into()
        } else {
            e.to_string()
        }
    })
}

// --------------------------------------------------------------------------
// record_time_in
// --------------------------------------------------------------------------

pub fn record_time_in(
    db_path: &Path,
    event_id: &str,
    student_id_number: &str,
) -> Result<AttendancePopulated, String> {
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    // 1. Event must exist.
    let event_exists = conn
        .query_row(
            "SELECT 1 FROM events WHERE id = ?1",
            params![event_id],
            |_| Ok(()),
        )
        .is_ok();
    if !event_exists {
        return Err("Event not found".into());
    }

    // 2. Find-or-create student.
    let _student = find_or_create_student(&conn, student_id_number)?;

    // 3. Duplicate check — existing attendance for this event+student with time_in.
    let existing = conn
        .query_row(
            "SELECT id, time_in FROM attendance
             WHERE event_id = ?1 AND student_id_number = ?2 AND time_in IS NOT NULL",
            params![event_id, student_id_number],
            |r| Ok((r.get::<_, String>(0)?, r.get::<_, Option<String>>(1)?)),
        )
        .ok();

    if existing.is_some() {
        return Err("Student has already checked in".into());
    }

    // 4. Create attendance record.
    let id = Uuid::new_v4().to_string();
    let _sid = conn
        .query_row(
            "SELECT id FROM students WHERE student_id = ?1",
            params![student_id_number],
            |r| r.get::<_, String>(0),
        )
        .map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT INTO attendance (id, event_id, student_id, student_id_number, time_in, time_out, created_at, updated_at)
         VALUES (?1, ?2,
                 (SELECT id FROM students WHERE student_id = ?3),
                 ?3, datetime('now'), NULL, datetime('now'), datetime('now'))",
        params![id, event_id, student_id_number],
    )
    .map_err(|e| e.to_string())?;

    get_attendance(db_path, &id)
}

// --------------------------------------------------------------------------
// record_time_out
// --------------------------------------------------------------------------

pub fn record_time_out(
    db_path: &Path,
    event_id: &str,
    student_id_number: &str,
) -> Result<AttendancePopulated, String> {
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    // 1. Event must exist.
    let event_exists = conn
        .query_row(
            "SELECT 1 FROM events WHERE id = ?1",
            params![event_id],
            |_| Ok(()),
        )
        .is_ok();
    if !event_exists {
        return Err("Event not found".into());
    }

    // 2. Find-or-create student.
    let _student = find_or_create_student(&conn, student_id_number)?;

    // 3. Find existing attendance record.
    let existing = conn
        .query_row(
            "SELECT id, time_in, time_out FROM attendance
             WHERE event_id = ?1 AND student_id_number = ?2",
            params![event_id, student_id_number],
            |r| {
                Ok((
                    r.get::<_, String>(0)?,
                    r.get::<_, Option<String>>(1)?,
                    r.get::<_, Option<String>>(2)?,
                ))
            },
        )
        .ok();

    match existing {
        None => {
            // No attendance record at all — create one with only time_out.
            let id = Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO attendance (id, event_id, student_id, student_id_number, time_in, time_out, created_at, updated_at)
                 VALUES (?1, ?2,
                         (SELECT id FROM students WHERE student_id = ?3),
                         ?3, NULL, datetime('now'), datetime('now'), datetime('now'))",
                params![id, event_id, student_id_number],
            )
            .map_err(|e| e.to_string())?;
            get_attendance(db_path, &id)
        }
        Some((att_id, _time_in, time_out)) => {
            if time_out.is_some() {
                return Err("Student has already checked out".into());
            }
            conn.execute(
                "UPDATE attendance SET time_out = datetime('now'), updated_at = datetime('now') WHERE id = ?1",
                params![att_id],
            )
            .map_err(|e| e.to_string())?;
            get_attendance(db_path, &att_id)
        }
    }
}

// --------------------------------------------------------------------------
// get_attendance_by_id — public wrapper
// --------------------------------------------------------------------------

pub fn get_attendance_by_id(
    db_path: &Path,
    attendance_id: &str,
) -> Result<AttendancePopulated, String> {
    get_attendance(db_path, attendance_id)
}

// --------------------------------------------------------------------------
// update_attendance — reassign studentID on an attendance record
// --------------------------------------------------------------------------

pub fn update_attendance(
    db_path: &Path,
    attendance_id: &str,
    new_student_id: &str,
) -> Result<AttendancePopulated, String> {
    const STUDENT_ID_LEN: usize = 10;
    if new_student_id.len() != STUDENT_ID_LEN || !new_student_id.chars().all(|c| c.is_ascii_digit())
    {
        return Err(format!(
            "Student ID must be exactly {STUDENT_ID_LEN} digits"
        ));
    }

    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    // Verify attendance exists.
    let exists = conn
        .query_row(
            "SELECT 1 FROM attendance WHERE id = ?1",
            params![attendance_id],
            |_| Ok(()),
        )
        .is_ok();
    if !exists {
        return Err("Attendance record not found".into());
    }

    // Find-or-create the new student.
    let _student = find_or_create_student(&conn, new_student_id)?;

    conn.execute(
        "UPDATE attendance
         SET student_id_number = ?1,
             student_id = (SELECT id FROM students WHERE student_id = ?1),
             updated_at = datetime('now')
         WHERE id = ?2",
        params![new_student_id, attendance_id],
    )
    .map_err(|e| e.to_string())?;

    get_attendance(db_path, attendance_id)
}
