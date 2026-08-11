//! Student queries — paginated listing, course enumeration, CSV/XLSX import.
//!
//! Submodules split by concern to keep each file under 400 lines.

pub mod import;
pub mod list;
pub mod types;

// Re-export symbols consumed by external callers.
pub use import::{import_from_csv, import_from_xlsx};
pub use list::{available_courses, list_students};
#[allow(unused_imports)]
pub use types::{ListStudentsOpts, PaginatedStudents, Student};

// `row_to_student` is `pub(crate)` — re-exported so sibling crates can use it.
pub(crate) use types::row_to_student;

#[cfg(test)]
mod boundary_repro {
    use super::*;
    use serde_json::json;
    use std::path::Path;

    /// Mirrors `StudentListArgs` in `commands/students.rs` — the exact shape
    /// Tauri deserializes from the frontend payload.
    #[derive(serde::Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct Args {
        page: Option<i64>,
        page_size: Option<i64>,
        search: Option<String>,
        course: Option<String>,
        year: Option<i64>,
        gender: Option<String>,
        sort_by: Option<String>,
        include_placeholders: Option<bool>,
    }

    #[test]
    fn repro_real_db_and_payload() {
        // Exact payload the Students page sends on first load.
        let payload = json!({ "page": 1, "pageSize": 10, "sortBy": "asc" });
        let args: Args = serde_json::from_value(payload).expect("args deserialize");
        eprintln!(
            "parsed: page={:?} page_size={:?} sort_by={:?}",
            args.page, args.page_size, args.sort_by
        );

        let db = Path::new(r"C:\Users\Qwenzy\AppData\Roaming\SEATS\seats.db");
        let result = list_students(
            db,
            &ListStudentsOpts {
                page: args.page.unwrap_or(1).max(1),
                page_size: args.page_size.unwrap_or(100).clamp(1, 1000),
                search: args.search.as_deref(),
                course: args.course.as_deref(),
                year: args.year,
                gender: args.gender.as_deref(),
                sort_by: args.sort_by.as_deref(),
                include_placeholders: args.include_placeholders.unwrap_or(false),
            },
        );
        match result {
            Ok(p) => {
                let out = serde_json::to_value(&p).expect("serialize");
                eprintln!(
                    "OK total={} totalPages={} rows={} first={:?}",
                    p.total, p.total_pages, p.data.len(), out["data"][0]["firstname"]
                );
            }
            Err(e) => eprintln!("ERROR: {e}"),
        }
    }
}
