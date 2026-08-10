pub mod models;
pub mod reporting;
pub mod time_in_out;

// Re-export everything so external callers using `attendance::function_name`
// continue to work without changes.
pub use models::*;
pub use reporting::*;
pub use time_in_out::*;
