use rusqlite::{Connection, Result};
use std::fs;
use std::path::PathBuf;

/// Opens (or creates) the SQLite database in the app data directory.
///
/// On Windows the data lives in `%APPDATA%\SEATS\seats.db`.
/// Creates the parent directory if it doesn't exist. Never panics —
/// folder and PRAGMA failures are returned as error strings so callers
/// can surface them gracefully.
pub fn open_database(data_dir: &PathBuf) -> Result<Connection, String> {
    fs::create_dir_all(data_dir)
        .map_err(|e| format!("failed to create app data directory: {e}"))?;

    let db_path = data_dir.join("seats.db");
    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;

    // Performance and safety PRAGMAs
    conn.execute_batch(
        "PRAGMA journal_mode = WAL;
         PRAGMA foreign_keys = ON;
         PRAGMA busy_timeout = 5000;
         PRAGMA synchronous = NORMAL;",
    )
    .map_err(|e| e.to_string())?;

    Ok(conn)
}

/// Returns the canonical app data directory on the current platform.
///
/// On Windows: `%APPDATA%\SEATS`
pub fn data_dir() -> PathBuf {
    // Tauri v2 exposes resolve::BaseDirectory::AppData, but this utility
    // is called from the main process outside Tauri's managed scope.
    // We resolve via the standard env var on Windows and XDG on Linux.
    #[cfg(target_os = "windows")]
    {
        let appdata = std::env::var("APPDATA").unwrap_or_else(|_| ".".to_string());
        PathBuf::from(appdata).join("SEATS")
    }
    #[cfg(target_os = "macos")]
    {
        let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
        PathBuf::from(home)
            .join("Library")
            .join("Application Support")
            .join("SEATS")
    }
    #[cfg(target_os = "linux")]
    {
        let xdg = std::env::var("XDG_DATA_HOME").unwrap_or_else(|_| {
            let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
            format!("{}/.local/share", home)
        });
        PathBuf::from(xdg).join("SEATS")
    }
}
