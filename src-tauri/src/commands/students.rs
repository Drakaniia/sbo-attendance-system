use std::sync::{Arc, Mutex};

use tauri::State;

use crate::commands::error::IpcError;
use crate::db::queries::students;
use crate::state::AppState;

/// Query args for `list_students` — mirrors the old `StudentListQuery`
/// axum extractor (camelCase keys).
#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StudentListArgs {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub course: Option<String>,
    pub year: Option<i64>,
    pub gender: Option<String>,
    pub sort_by: Option<String>,
    /// IPC version uses a real bool instead of the old "true" query string.
    pub include_placeholders: Option<bool>,
}

/// Formerly `GET /student` — paginated, filtered, searchable list.
#[tauri::command]
pub async fn list_students(
    state: State<'_, Arc<Mutex<AppState>>>,
    args: StudentListArgs,
) -> Result<students::PaginatedStudents, IpcError> {
    let db_path = state.lock().unwrap().db_path.clone();

    students::list_students(
        &db_path,
        &students::ListStudentsOpts {
            page: args.page.unwrap_or(1).max(1),
            page_size: args.page_size.unwrap_or(100).clamp(1, 1000),
            search: args.search.as_deref(),
            course: args.course.as_deref(),
            year: args.year,
            gender: args.gender.as_deref(),
            sort_by: args.sort_by.as_deref(),
            include_placeholders: args.include_placeholders.unwrap_or(false),
        },
    )
    .map_err(IpcError::new)
}

/// Formerly `GET /student/courses` — distinct courses for the filter bar.
#[tauri::command]
pub async fn list_student_courses(
    state: State<'_, Arc<Mutex<AppState>>>,
) -> Result<Vec<String>, IpcError> {
    let db_path = state.lock().unwrap().db_path.clone();
    students::available_courses(&db_path).map_err(IpcError::new)
}

#[cfg(test)]
mod tests {
    use super::StudentListArgs;
    use serde_json::json;

    #[derive(serde::Deserialize)]
    struct CommandPayload {
        args: StudentListArgs,
    }

    #[test]
    fn list_students_command_requires_named_args_payload() {
        let flat = serde_json::from_value::<CommandPayload>(json!({
            "page": 1,
            "pageSize": 10,
        }));
        assert!(flat.is_err(), "a flat payload must not satisfy the `args` parameter");

        let named = serde_json::from_value::<CommandPayload>(json!({
            "args": {
                "page": 1,
                "pageSize": 10,
            },
        }))
        .expect("Tauri payload should name the `args` parameter");
        assert_eq!(named.args.page, Some(1));
        assert_eq!(named.args.page_size, Some(10));
    }
}
