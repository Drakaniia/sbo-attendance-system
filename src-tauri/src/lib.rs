use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use tauri::{Emitter, Listener, Manager};
use tauri_plugin_autostart::ManagerExt;
use tracing::info;

mod app_config;
mod commands;
mod db;
mod state;

use state::AppState;

/// Launched from `main.rs` — builds and runs the Tauri application.
pub fn run() {
    // Resolve the primary data folder early — the startup log lives there.
    let primary_data_dir = db::connection::data_dir();
    init_logging(&primary_data_dir);

    let app_state = Arc::new(Mutex::new(AppState {
        db_path: primary_data_dir.join("seats.db"),
        data_dir: primary_data_dir,
    }));

    tauri::Builder::default()
        // Single instance — a second launch forwards its args to the first
        // instance and exits; the first instance focuses its main window.
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .manage(app_state.clone())
        .setup(move |app| {
            let state = app_state.clone();

            // The main window is intentionally hidden in tauri.conf.json.
            // Reveal it only after React has mounted, so the native splash
            // remains visible through database setup and first paint.
            let frontend_ready = Arc::new(AtomicBool::new(false));
            let backend_ready = Arc::new(AtomicBool::new(false));
            let splash_ready = Arc::new(AtomicBool::new(false));
            let splash_dismissed = Arc::new(AtomicBool::new(false));
            let main_revealed = Arc::new(AtomicBool::new(false));

            // React signals that the main shell has painted. The splash gets
            // its own fade-out event so the native window never hard-cuts.
            let frontend_flag = frontend_ready.clone();
            let backend_flag = backend_ready.clone();
            let splash_flag = splash_ready.clone();
            let dismiss_flag = splash_dismissed.clone();
            let event_handle = app.handle().clone();
            app.listen("frontend-ready", move |_| {
                frontend_flag.store(true, Ordering::SeqCst);
                request_splash_dismiss(
                    &event_handle,
                    &frontend_flag,
                    &backend_flag,
                    &splash_flag,
                    &dismiss_flag,
                );
            });

            let frontend_flag = frontend_ready.clone();
            let backend_flag = backend_ready.clone();
            let splash_flag = splash_ready.clone();
            let dismiss_flag = splash_dismissed.clone();
            let event_handle = app.handle().clone();
            app.listen("splash-ready", move |_| {
                splash_flag.store(true, Ordering::SeqCst);
                request_splash_dismiss(
                    &event_handle,
                    &frontend_flag,
                    &backend_flag,
                    &splash_flag,
                    &dismiss_flag,
                );
            });

            let faded_flag = splash_dismissed.clone();
            let revealed_flag = main_revealed.clone();
            let faded_handle = app.handle().clone();
            app.listen("splash-faded", move |_| {
                if faded_flag.load(Ordering::SeqCst)
                    && !revealed_flag.swap(true, Ordering::SeqCst)
                {
                    reveal_main_window(&faded_handle);
                }
            });

            // ── Database — graceful: retry → fallback folder → error dialog ──
            info!("Opening database at {:?}", &state.lock().unwrap().db_path);
            if !ensure_database(app, &state) {
                // The user was shown what went wrong and chose to exit.
                app.handle().exit(1);
                return Ok(());
            } // ── Apply persisted preferences ────────────────────────────
            let settings = app_config::load(&state.lock().unwrap().data_dir);

            if settings.kiosk {
                if let Some(window) = app.get_webview_window("main") {
                    if let Err(e) = window.set_fullscreen(true) {
                        eprintln!("Could not enter kiosk mode: {e}");
                    }
                }
            }

            // Keep the OS auto-start entry in sync with the persisted flag
            // (settings.json is the source of truth). Note: `disable()` errors
            // when no entry exists yet (winreg ERROR_FILE_NOT_FOUND), so only
            // call it when one is actually registered.
            if settings.auto_start {
                if let Err(e) = app.autolaunch().enable() {
                    eprintln!("Could not enable auto-start: {e}");
                }
            } else {
                match app.autolaunch().is_enabled() {
                    Ok(true) => {
                        if let Err(e) = app.autolaunch().disable() {
                            eprintln!("Could not disable auto-start: {e}");
                        }
                    }
                    Ok(false) => {} // not registered — nothing to clean up
                    Err(e) => eprintln!("Could not read auto-start state: {e}"),
                }
            }

            if let Some(window) = app.get_webview_window("main") {
                if let Err(e) = window.set_title("SEATS") {
                    eprintln!("Could not set window title: {e}");
                }
            }

            backend_ready.store(true, Ordering::SeqCst);
            request_splash_dismiss(
                app.handle(),
                &frontend_ready,
                &backend_ready,
                &splash_ready,
                &splash_dismissed,
            );

            // Start the safety fallback only after synchronous backend setup is
            // complete, so it can never reveal a half-initialized main window.
            let fallback_revealed = main_revealed.clone();
            let fallback_handle = app.handle().clone();
            std::thread::spawn(move || {
                std::thread::sleep(Duration::from_secs(8));
                if !fallback_revealed.load(Ordering::SeqCst) {
                    tracing::error!("Splash handshake timed out; keeping splash visible");
                    let _ = fallback_handle.emit("splash-error", ());
                }
            });

            info!("Tauri setup complete");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Native commands (defined in this module)
            commands::backup_db,
            commands::restore_db,
            commands::get_db_path,
            commands::set_kiosk,
            commands::import_students_file,
            // Students
            commands::students::list_students,
            commands::students::list_student_courses,
            // Events
            commands::events::list_events,
            commands::events::get_event,
            commands::events::create_event,
            commands::events::update_event,
            commands::events::delete_event,
            commands::events::archive_event,
            commands::events::unarchive_event,
            commands::events::event_attendance_summary,
            // Attendance
            commands::attendance::list_recent_attendances,
            commands::attendance::get_attendance,
            commands::attendance::list_event_attendances,
            commands::attendance::record_time_in,
            commands::attendance::record_time_out,
            commands::attendance::update_attendance,
            commands::attendance::export_event_excel,
            // Dashboard
            commands::dashboard::dashboard_stats,
            commands::dashboard::dashboard_event_attendance,
            commands::dashboard::dashboard_course_distribution,
            commands::dashboard::dashboard_recent_activity,
            commands::dashboard::dashboard_attendance_trend,
            // Reports
            commands::reports::reports_stats,
            commands::reports::reports_attendance_trend,
            commands::reports::reports_event_breakdown,
            commands::reports::reports_course_distribution,
            commands::reports::reports_year_distribution,
            commands::reports::reports_leaderboard,
            commands::reports::reports_heatmap,
            commands::reports::export_reports_excel,
            commands::settings::reset_all_data,
            commands::settings::get_app_settings,
            commands::settings::set_auto_start,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
/// Ask the splash window to fade out once both windows are ready.
fn request_splash_dismiss(
    app: &tauri::AppHandle,
    frontend_ready: &AtomicBool,
    backend_ready: &AtomicBool,
    splash_ready: &AtomicBool,
    splash_dismissed: &AtomicBool,
) {
    if frontend_ready.load(Ordering::SeqCst)
        && backend_ready.load(Ordering::SeqCst)
        && splash_ready.load(Ordering::SeqCst)
        && !splash_dismissed.swap(true, Ordering::SeqCst)
    {
        let _ = app.emit("splash-dismiss", ());
    }
}

/// Reveal the prepared main window and close the native splash window.
fn reveal_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }
    if let Some(splash) = app.get_webview_window("splashscreen") {
        let _ = splash.close();
    }
}

/// Opens the database with retries, falling back to a secondary per-user
/// folder when the primary one is unwritable. Returns `false` only when the
/// user chooses to exit from the error dialog.
fn ensure_database(app: &tauri::App, state: &Arc<Mutex<AppState>>) -> bool {
    loop {
        let data_dir = state.lock().unwrap().data_dir.clone();

        // Attempt 1 — the primary folder.
        let first_err = match try_open_migrate(&data_dir) {
            Ok(()) => return true,
            Err(e) => e,
        };
        info!("Database open failed (first attempt): {first_err}");

        // Attempt 2 — retry it; transient locks (OneDrive/AV) often clear.
        std::thread::sleep(Duration::from_millis(500));
        let second_err = match try_open_migrate(&data_dir) {
            Ok(()) => return true,
            Err(e) => e,
        };
        info!("Database open failed (retry): {second_err}");

        // Attempt 3 — the primary folder may be blocked entirely (e.g. a
        // school redirecting %APPDATA%), so use a different per-user folder.
        let fallback = fallback_data_dir();
        let fallback_err = match try_open_migrate(&fallback) {
            Ok(()) => {
                info!("Using fallback data folder: {}", fallback.display());
                let mut s = state.lock().unwrap();
                s.data_dir = fallback.clone();
                s.db_path = fallback.join("seats.db");
                return true;
            }
            Err(e) => e,
        };
        info!("Fallback data folder also failed: {fallback_err}");

        // Nothing worked — tell the user. Retry loops back; anything else
        // (Exit, dismissing the dialog) quits the app.
        if !ask_retry(app, &second_err, &fallback_err, &data_dir) {
            return false;
        }
    }
}

/// Open the database and run migrations. Returns a human-readable error
/// when any step fails (never panics).
fn try_open_migrate(data_dir: &Path) -> Result<(), String> {
    let conn = db::connection::open_database(&data_dir.to_path_buf())?;
    db::migrations::run_migrations(&conn).map_err(|e| e.to_string())?;
    Ok(())
}

/// Secondary per-user data folder used when the primary one is unavailable.
fn fallback_data_dir() -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        let base = std::env::var("LOCALAPPDATA")
            .or_else(|_| std::env::var("TEMP"))
            .unwrap_or_else(|_| ".".to_string());
        PathBuf::from(base).join("SEATS")
    }
    #[cfg(target_os = "macos")]
    {
        let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
        PathBuf::from(home)
            .join("Library")
            .join("Caches")
            .join("SEATS")
    }
    #[cfg(target_os = "linux")]
    {
        let cache = std::env::var("XDG_CACHE_HOME").unwrap_or_else(|_| {
            let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
            format!("{home}/.cache")
        });
        PathBuf::from(cache).join("SEATS")
    }
}
/// Shows a native error dialog; returns `true` when the user clicks Retry.
fn ask_retry(app: &tauri::App, primary_err: &str, fallback_err: &str, data_dir: &Path) -> bool {
    use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogKind};

    app.dialog()
        .message(format!(
            "SEATS can't start because it cannot open its data folder.\n\n\
             Primary folder error:\n{primary_err}\n\n\
             Fallback folder error:\n{fallback_err}\n\n\
             Data folder:\n{}\n\n\
             Choose Retry to try again, or Exit to close the app.",
            data_dir.display()
        ))
        .title("SEATS — Startup problem")
        .kind(MessageDialogKind::Error)
        .buttons(MessageDialogButtons::OkCustom("Retry".into()))
        .blocking_show()
}

/// Sets up tracing: writes to `seats-startup.log` in the data folder (plus
/// stdout for dev). Falls back to console-only when the log file can't be
/// created, so a broken data folder never hides a diagnosable startup.
fn init_logging(data_dir: &Path) {
    use tracing_subscriber::layer::SubscriberExt;
    use tracing_subscriber::util::SubscriberInitExt;

    let _ = std::fs::create_dir_all(data_dir);

    match std::fs::File::create(data_dir.join("seats-startup.log")) {
        Ok(file) => {
            let file_layer = tracing_subscriber::fmt::layer()
                .with_writer(Mutex::new(file))
                .with_ansi(false);
            tracing_subscriber::registry()
                .with(file_layer)
                .with(tracing_subscriber::fmt::layer())
                .init();
        }
        Err(e) => {
            tracing_subscriber::fmt().init();
            eprintln!("Could not open seats-startup.log ({e}) — logging to console only");
        }
    }
}
