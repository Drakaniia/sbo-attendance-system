pub mod error;
pub mod routes;
pub mod server;

use std::path::PathBuf;

/// Context shared across all axum handlers — injected via `State<ApiContext>`.
#[derive(Clone)]
pub struct ApiContext {
    pub db_path: PathBuf,
}
