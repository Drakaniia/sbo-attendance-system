use rusqlite::{Connection, Result};

const LATEST_VERSION: i32 = 3;

/// Run all pending migrations, creating tables if they don't exist.
///
/// Uses `PRAGMA user_version` for schema versioning so adding tables
/// later is a clean incremental step.
pub fn run_migrations(conn: &Connection) -> Result<()> {
    let current_version: i32 = conn.pragma_query_value(None, "user_version", |r| r.get(0))?;

    if current_version >= LATEST_VERSION {
        return Ok(());
    }

    // ------------------------------------------------------------------
    // Migration  001 — initial schema
    // ------------------------------------------------------------------
    if current_version < 1 {
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS students (
                id          TEXT PRIMARY KEY,
                student_id  TEXT    NOT NULL UNIQUE,
                firstname   TEXT    NOT NULL DEFAULT '',
                lastname    TEXT    NOT NULL DEFAULT '',
                middlename  TEXT    NOT NULL DEFAULT '',
                gender      TEXT    NOT NULL DEFAULT 'M'  CHECK (gender IN ('M','F')),
                course      TEXT    NOT NULL DEFAULT '',
                year        INTEGER NOT NULL DEFAULT 1,
                email       TEXT    NOT NULL DEFAULT '',
                is_placeholder INTEGER NOT NULL DEFAULT 0,
                created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
                updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
            );

            CREATE INDEX IF NOT EXISTS idx_students_student_id ON students(student_id);
            CREATE INDEX IF NOT EXISTS idx_students_course ON students(course);
            CREATE INDEX IF NOT EXISTS idx_students_year ON students(year);
            CREATE INDEX IF NOT EXISTS idx_students_gender ON students(gender);
            CREATE INDEX IF NOT EXISTS idx_students_name ON students(firstname, lastname);

            CREATE TABLE IF NOT EXISTS events (
                id          TEXT PRIMARY KEY,
                title       TEXT    NOT NULL,
                description TEXT    NOT NULL DEFAULT '',
                type        TEXT    NOT NULL DEFAULT '',
                venue       TEXT    NOT NULL DEFAULT '',
                start_time  TEXT    NOT NULL,
                end_time    TEXT    NOT NULL,
                archived    INTEGER NOT NULL DEFAULT 0,
                created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
                updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
            );

            CREATE INDEX IF NOT EXISTS idx_events_archived ON events(archived);

            CREATE TABLE IF NOT EXISTS attendance (
                id          TEXT PRIMARY KEY,
                event_id    TEXT    NOT NULL REFERENCES events(id),
                student_id  TEXT    NOT NULL REFERENCES students(id),
                student_id_number TEXT NOT NULL,
                time_in     TEXT,
                time_out    TEXT,
                created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
                updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
            );

            CREATE INDEX IF NOT EXISTS idx_attendance_event ON attendance(event_id);
            CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
            CREATE INDEX IF NOT EXISTS idx_attendance_student_id_number ON attendance(student_id_number);
            CREATE INDEX IF NOT EXISTS idx_attendance_updated_at ON attendance(updated_at);

            -- Prevent duplicate time-in scans at the database level
            CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_unique_checkin
                ON attendance(event_id, student_id_number)
                WHERE time_in IS NOT NULL;
        ",
        )?;

        conn.pragma_update(None, "user_version", 1)?;
    }

    // ------------------------------------------------------------------
    // Migration  002 — reserved for the former settings table
    // ------------------------------------------------------------------
    if current_version < 2 {
        conn.pragma_update(None, "user_version", 2)?;
    }

    // ------------------------------------------------------------------
    // Migration  003 — remove the former academic-calendar settings
    // ------------------------------------------------------------------
    if current_version < 3 {
        let has_legacy_settings: bool = conn.query_row(
            "SELECT EXISTS (
                SELECT 1 FROM sqlite_master
                WHERE type = 'table' AND name = 'settings'
            )",
            [],
            |row| row.get(0),
        )?;

        if has_legacy_settings {
            conn.execute(
                "DELETE FROM settings
                 WHERE key IN (
                     'semester1_start', 'semester1_end',
                     'semester2_start', 'semester2_end'
                 )",
                [],
            )?;
        }

        conn.pragma_update(None, "user_version", 3)?;
    }

    Ok(())
}
