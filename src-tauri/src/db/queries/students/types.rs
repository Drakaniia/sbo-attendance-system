//! Student data types and row mapping.

use rusqlite;
use serde::Serialize;

/// Mirror of the `Student` JSON the frontend expects.
/// Field names use camelCase to match the old API.
#[derive(Debug, Serialize)]
pub struct Student {
    #[serde(rename = "_id")]
    pub id: String,
    #[serde(rename = "studentID")]
    pub student_id: String,
    pub firstname: String,
    pub lastname: String,
    pub middlename: String,
    pub gender: String,
    pub course: String,
    pub year: i64,
    pub email: String,
    #[serde(rename = "isPlaceholder")]
    pub is_placeholder: bool,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

/// Paginated list returned to the client.
#[derive(Debug, Serialize)]
pub struct PaginatedStudents {
    pub data: Vec<Student>,
    pub total: i64,
    #[serde(rename = "totalPages")]
    pub total_pages: i64,
    pub next: i64,
    pub prev: i64,
}

/// Options for the `list_students` query.
pub struct ListStudentsOpts<'a> {
    pub page: i64,
    pub page_size: i64,
    pub search: Option<&'a str>,
    pub course: Option<&'a str>,
    pub year: Option<i64>,
    pub gender: Option<&'a str>,
    pub sort_by: Option<&'a str>,
    pub include_placeholders: bool,
}

/// Map a rusqlite row to a `Student` struct.
pub(crate) fn row_to_student(row: &rusqlite::Row<'_>) -> rusqlite::Result<Student> {
    Ok(Student {
        id: row.get(0)?,
        student_id: row.get(1)?,
        firstname: row.get(2)?,
        lastname: row.get(3)?,
        middlename: row.get(4)?,
        gender: row.get(5)?,
        course: row.get(6)?,
        year: row.get(7)?,
        email: row.get(8)?,
        is_placeholder: row.get::<_, i64>(9)? != 0,
        created_at: row.get(10)?,
        updated_at: row.get(11)?,
    })
}
