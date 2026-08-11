//! Student import from CSV and XLSX files.

use rusqlite::{Connection, Result};
use std::path::Path;
use uuid::Uuid;

/// Import students from a CSV buffer.
///
/// Required headers: `firstname`, `lastname`, `studentID`, `course`, `gender`,
/// `year`, `middlename`.
pub fn import_from_csv(db_path: &Path, buffer: &[u8]) -> Result<i64, String> {
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    conn.execute("BEGIN IMMEDIATE", [])
        .map_err(|e| format!("Transaction begin error: {e}"))?;

    let mut rdr = csv::Reader::from_reader(buffer);
    let headers = rdr
        .headers()
        .map_err(|e| format!("CSV header error: {e}"))?
        .clone();

    let required = [
        "firstname",
        "lastname",
        "studentID",
        "course",
        "gender",
        "year",
        "middlename",
    ];
    for h in required {
        if !headers.iter().any(|c| c == h) {
            return Err(format!("CSV headers are incorrect — missing '{h}'"));
        }
    }

    let mut upserted = 0i64;

    for result in rdr.records() {
        let record = result.map_err(|e| format!("CSV row error: {e}"))?;
        let row: std::collections::HashMap<String, String> = headers
            .iter()
            .zip(record.iter())
            .map(|(k, v)| (k.to_string(), v.to_string()))
            .collect();

        let student_id = row.get("studentID").cloned().unwrap_or_default();
        if student_id.is_empty() {
            continue;
        }

        upserted += upsert_student(&conn, &student_id, &row)?;
    }

    conn.execute("COMMIT", [])
        .map_err(|e| format!("Commit error: {e}"))?;
    Ok(upserted)
}

/// Import students from an XLSX buffer using the university masterlist format
/// (header on **row 8**, data starting **row 9**).
///
/// Column mapping:
///   B: Code → studentID
///   C: Last Name → lastname
///   D: First Name → firstname
///   E: Middle Name → middlename
///   F: Sex → gender
///   G: Course → course
///   H: Year → year
pub fn import_from_xlsx(db_path: &Path, buffer: &[u8]) -> Result<i64, String> {
    use calamine::{Data, Range, Reader, Xlsx};
    use std::io::Cursor;

    let cursor = Cursor::new(buffer.to_vec());
    let mut wb = Xlsx::new(cursor).map_err(|e| format!("Cannot open XLSX: {e}"))?;

    let range = wb
        .worksheet_range_at(0)
        .ok_or("Excel file contains no sheets")?
        .map_err(|e| format!("Sheet read error: {e}"))?;
    let range: Range<Data> = range;

    let mut rows = range.rows();
    // Skip first 7 rows (university metadata).
    for _ in 0..7 {
        rows.next();
    }

    // Row 8 is the header — must match expected columns.
    let header = rows
        .next()
        .ok_or("Missing header row (expected at row 8)")?;

    let col_code = col_index(header, "Code").ok_or(
        "Missing 'Code' column in header (row 8). Make sure the Excel file follows the university masterlist format."
    )?;
    let col_last = col_index(header, "Last Name");
    let col_first = col_index(header, "First Name");
    let col_mid = col_index(header, "Middle Name");
    let col_sex = col_index(header, "Sex");
    let col_course = col_index(header, "Course");
    let col_year = col_index(header, "Year");

    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    conn.execute("BEGIN IMMEDIATE", [])
        .map_err(|e| format!("Transaction begin error: {e}"))?;
    let mut upserted = 0i64;

    for row in rows {
        let sid = cell_str(row, Some(col_code)).trim().to_string();
        if sid.is_empty() {
            continue;
        }

        let mut map: std::collections::HashMap<String, String> = std::collections::HashMap::new();
        map.insert("studentID".into(), sid.clone());
        map.insert("lastname".into(), cell_str(row, col_last));
        map.insert("firstname".into(), cell_str(row, col_first));
        map.insert("middlename".into(), cell_str(row, col_mid));
        map.insert("gender".into(), cell_str(row, col_sex).to_uppercase());
        map.insert("course".into(), cell_str(row, col_course));
        map.insert("year".into(), cell_str(row, col_year));

        upserted += upsert_student(&conn, &sid, &map)?;
    }

    conn.execute("COMMIT", [])
        .map_err(|e| format!("Commit error: {e}"))?;
    Ok(upserted)
}

// ── helpers ──────────────────────────────────────────────────────────────

/// Upsert a single student row.
///
/// If a student with this `studentID` already exists (e.g. a placeholder
/// auto-created from a scan), merge in the real data and clear the
/// placeholder flag. Otherwise insert a new record.
fn upsert_student(
    conn: &Connection,
    student_id: &str,
    row: &std::collections::HashMap<String, String>,
) -> Result<i64, String> {
    let firstname = row.get("firstname").map(|s| s.as_str()).unwrap_or("");
    let lastname = row.get("lastname").map(|s| s.as_str()).unwrap_or("");
    let middlename = row.get("middlename").map(|s| s.as_str()).unwrap_or("");
    let gender = {
        let g = row.get("gender").map(|s| s.as_str()).unwrap_or("M");
        if g == "F" {
            "F"
        } else {
            "M"
        }
    };
    let course = row.get("course").map(|s| s.as_str()).unwrap_or("");
    let year: i64 = row.get("year").and_then(|y| y.parse().ok()).unwrap_or(1);

    let existing = conn
        .query_row(
            "SELECT id, is_placeholder FROM students WHERE student_id = ?1",
            rusqlite::params![student_id],
            |r| Ok((r.get::<_, String>(0)?, r.get::<_, i64>(1)?)),
        )
        .ok();

    if let Some((existing_id, _is_placeholder)) = existing {
        // Merge — fill in real data and clear placeholder flag.
        conn.execute(
            "UPDATE students
             SET firstname       = ?1,
                 lastname        = ?2,
                 middlename      = ?3,
                 gender          = ?4,
                 course          = ?5,
                 year            = ?6,
                 is_placeholder  = 0,
                 updated_at      = datetime('now')
             WHERE id = ?7",
            rusqlite::params![
                firstname,
                lastname,
                middlename,
                gender,
                course,
                year,
                existing_id
            ],
        )
        .map_err(|e| e.to_string())?;
    } else {
        // Insert new.
        let id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO students (id, student_id, firstname, lastname, middlename, gender, course, year, email, is_placeholder, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, '', 0, datetime('now'), datetime('now'))",
            rusqlite::params![id, student_id, firstname, lastname, middlename, gender, course, year],
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(1)
}

/// Get a cell from a calamine row as a trimmed string, or empty string.
fn cell_str(row: &[calamine::Data], idx: Option<usize>) -> String {
    idx.and_then(|i| row.get(i))
        .map(|d| d.to_string().trim().to_string())
        .unwrap_or_default()
}

/// Find column index by header name (case-insensitive).
fn col_index(header: &[calamine::Data], name: &str) -> Option<usize> {
    header
        .iter()
        .position(|h| h.to_string().trim().eq_ignore_ascii_case(name))
}
