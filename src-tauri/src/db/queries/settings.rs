use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::path::Path;

// --------------------------------------------------------------------------
// Reset — wipe all attendance data
// --------------------------------------------------------------------------

/// Summary of what was removed during a full data reset.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ResetSummary {
    pub students: i64,
    pub events: i64,
    pub attendance: i64,
}

/// Delete every student, event, and attendance record so the app starts
/// fresh.
///
/// Returns the number of rows removed from each table.
pub fn reset_all_data(db_path: &Path) -> Result<ResetSummary, String> {
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    // Delete in dependency order (attendance first) so the reset still works
    // even if foreign keys are enabled.
    conn.execute("BEGIN IMMEDIATE", [])
        .map_err(|e| e.to_string())?;

    let attendance = conn
        .execute("DELETE FROM attendance", [])
        .map_err(|e| e.to_string())?;
    let events = conn
        .execute("DELETE FROM events", [])
        .map_err(|e| e.to_string())?;
    let students = conn
        .execute("DELETE FROM students", [])
        .map_err(|e| e.to_string())?;

    conn.execute("COMMIT", []).map_err(|e| e.to_string())?;

    Ok(ResetSummary {
        students: students as i64,
        events: events as i64,
        attendance: attendance as i64,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::migrations::run_migrations;
    use rusqlite::params;
    use std::path::PathBuf;
    use uuid::Uuid;

    // ── helpers ───────────────────────────────────────────────────────────

    /// Unique temp DB path per test; removed when the test finishes.
    fn temp_db() -> PathBuf {
        let path = std::env::temp_dir().join(format!("seats-settings-test-{}.db", Uuid::new_v4()));
        path
    }

    fn open_migrated(db_path: &Path) -> Connection {
        let conn = Connection::open(db_path).unwrap();
        run_migrations(&conn).unwrap();
        conn
    }

    fn cleanup(path: &Path) {
        for suffix in ["", "-wal", "-shm"] {
            let _ = std::fs::remove_file(path.with_extension(format!("db{suffix}")));
        }
    }

    fn count(conn: &Connection, table: &str) -> i64 {
        conn.query_row(&format!("SELECT COUNT(*) FROM {table}"), [], |r| r.get(0))
            .unwrap()
    }

    /// Insert one student, one event, and one attendance record.
    fn seed(conn: &Connection) -> (String, String) {
        let student_id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO students (id, student_id, firstname, lastname, gender, course, year)
             VALUES (?1, ?2, 'Juan', 'Dela Cruz', 'M', 'BSCS', 2)",
            params![student_id, "2024-0001"],
        )
        .unwrap();

        let event_id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO events (id, title, start_time, end_time)
             VALUES (?1, 'Freshman Orientation', '2026-08-15T08:00:00', '2026-08-15T17:00:00')",
            params![event_id],
        )
        .unwrap();

        conn.execute(
            "INSERT INTO attendance (id, event_id, student_id, student_id_number, time_in, time_out)
             VALUES (?1, ?2, ?3, '2024-0001', '2026-08-15T08:12:00', '2026-08-15T16:40:00')",
            params![Uuid::new_v4().to_string(), event_id, student_id],
        )
        .unwrap();

        (student_id, event_id)
    }

    // ── reset_all_data ────────────────────────────────────────────────────

    #[test]
    fn reset_all_data_deletes_students_events_and_attendance() {
        let path = temp_db();
        let conn = open_migrated(&path);
        seed(&conn);

        let summary = reset_all_data(&path).unwrap();

        assert_eq!(summary.students, 1);
        assert_eq!(summary.events, 1);
        assert_eq!(summary.attendance, 1);
        // Every data table is now empty.
        assert_eq!(count(&conn, "students"), 0);
        assert_eq!(count(&conn, "events"), 0);
        assert_eq!(count(&conn, "attendance"), 0);
        cleanup(&path);
    }

    #[test]
    fn reset_all_data_on_empty_database_returns_zero_counts() {
        let path = temp_db();
        open_migrated(&path);

        let summary = reset_all_data(&path).unwrap();

        assert_eq!(summary.students, 0);
        assert_eq!(summary.events, 0);
        assert_eq!(summary.attendance, 0);
        cleanup(&path);
    }
}
