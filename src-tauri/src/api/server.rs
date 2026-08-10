use axum::{Json, Router};
use serde::Serialize;
use std::future::Future;
use std::net::SocketAddr;
use std::path::PathBuf;
use tokio::sync::oneshot;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;
use tracing::info;

use crate::api::routes;
use crate::api::ApiContext;

/// Top-level health-check response.
#[derive(Serialize)]
struct HealthResponse {
    success: bool,
    message: String,
}

async fn health_check() -> Json<HealthResponse> {
    Json(HealthResponse {
        success: true,
        message: "SEATS API is running".into(),
    })
}

/// Builds the complete axum application router with shared DB-path state.
fn build_router(ctx: ApiContext) -> Router {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    Router::new()
        .route("/", axum::routing::get(health_check))
        .route("/api/v1/", axum::routing::get(health_check))
        .nest("/api/v1/student", routes::student_router())
        .nest("/api/v1/event", routes::event_router())
        .nest("/api/v1/attendance", routes::attendance_router())
        .nest("/api/v1/dashboard", routes::dashboard_router())
        .nest("/api/v1/reports", routes::reports_router())
        .nest("/api/v1/settings", routes::settings_router())
        .with_state(ctx)
        .layer(TraceLayer::new_for_http())
        .layer(cors)
}

/// Returns the server future and a oneshot sender for graceful shutdown.
///
/// The caller must **spawn** the returned future on a Tokio runtime
/// (e.g. via `tauri::async_runtime::spawn`).
pub fn make_server(
    db_path: PathBuf,
) -> (
    impl Future<Output = ()> + Send + 'static,
    oneshot::Sender<()>,
) {
    let (shutdown_tx, shutdown_rx) = oneshot::channel::<()>();
    let ctx = ApiContext { db_path };

    let fut = async move {
        let addr = SocketAddr::from(([127, 0, 0, 1], 8000));
        let listener = tokio::net::TcpListener::bind(addr)
            .await
            .expect("failed to bind to 127.0.0.1:8000 — port already in use?");
        info!("SEATS API listening on http://{}", addr);
        axum::serve(listener, build_router(ctx))
            .with_graceful_shutdown(async {
                let _ = shutdown_rx.await;
            })
            .await
            .expect("axum server exited with error");
    };

    (fut, shutdown_tx)
}
