mod attendance;
mod dashboard;
mod events;
mod reports;
mod settings;
mod students;

// Re-export sub-routers — each domain builds its own Router<ApiContext>.
pub use attendance::router as attendance_router;
pub use dashboard::router as dashboard_router;
pub use events::router as event_router;
pub use reports::router as reports_router;
pub use settings::router as settings_router;
pub use students::router as student_router;
