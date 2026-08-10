use std::sync::{Arc, Mutex};

use tauri::{Emitter, Manager};
use tracing::info;

mod api;
mod commands;
mod db;
mod state;

use state::AppState;

/// Launched from `main.rs` — builds and runs the Tauri application.
pub fn run() {
    tracing_subscriber::fmt::init();

    let app_state = Arc::new(Mutex::new(AppState {
        db_path: db::connection::data_dir().join("seats.db"),
        data_dir: db::connection::data_dir(),
    }));

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(app_state.clone())
        .setup(move |app| {
            let state = app_state.clone();

            // ── Database ───────────────────────────────────────────
            info!("Opening database at {:?}", &state.lock().unwrap().db_path);
            let conn = db::connection::open_database(&state.lock().unwrap().data_dir)
                .expect("failed to open SQLite database");
            db::migrations::run_migrations(&conn).expect("database migrations failed");
            // Connection closed here — each handler opens its own.
            // (Drop conn so the file handle is released before axum's handlers open it.)

            // ── HTTP API server (spawned on Tauri's async runtime) ─
            let db_path = state.lock().unwrap().db_path.clone();
            let (server_fut, shutdown_tx) = api::server::make_server(db_path);
            let server_task = tauri::async_runtime::spawn(server_fut);

            // Store the task handle and shutdown sender for cleanup on exit.
            app.manage(server_task);
            app.manage(Mutex::new(Some(shutdown_tx)));

            // ── Server-ready event (sent once axum is listening) ──
            let window = app
                .get_webview_window("main")
                .expect("main window not found");
            if let Err(e) = window.set_title("SEATS") {
                eprintln!("Could not set window title: {e}");
            }

            // Spawn a background task that waits for the server to be
            // reachable, then emits server-ready so the frontend splash
            // can transition out faster than polling alone.
            let window_clone = window.clone();
            tauri::async_runtime::spawn(async move {
                let health_url = "http://127.0.0.1:8000/api/v1/";
                let client = reqwest::Client::builder()
                    .connect_timeout(std::time::Duration::from_secs(2))
                    .build()
                    .unwrap();
                for _ in 0..30 {
                    if client.get(health_url).send().await.is_ok() {
                        let _ = window_clone.emit("server-ready", ());
                        info!("server-ready event emitted");
                        return;
                    }
                    tokio::time::sleep(std::time::Duration::from_millis(300)).await;
                }
            });

            info!("Tauri setup complete — API is booting in background");
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                let handle = window.app_handle();
                if let Some(mutex) =
                    handle.try_state::<Mutex<Option<tokio::sync::oneshot::Sender<()>>>>()
                {
                    if let Some(tx) = mutex.lock().unwrap().take() {
                        let _ = tx.send(());
                    }
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::backup_db,
            commands::restore_db,
            commands::get_db_path,
            commands::set_kiosk,
            commands::import_students_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
