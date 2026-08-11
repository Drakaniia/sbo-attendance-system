//! Student listing and course enumeration queries.

use rusqlite::{params_from_iter, Connection, Result};
use std::path::Path;

use super::types::{row_to_student, ListStudentsOpts, PaginatedStudents};

/// Paginated, filtered, searchable student list.
pub fn list_students(
    db_path: &Path,
    opts: &ListStudentsOpts<'_>,
) -> Result<PaginatedStudents, String> {
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    let mut conditions: Vec<String> = Vec::new();
    let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    // Placeholder students are hidden by default (same as old code).
    if !opts.include_placeholders {
        conditions.push("is_placeholder = 0".into());
    }

    if let Some(c) = opts.course {
        params.push(Box::new(c.to_string()));
        conditions.push(format!("course = ?{}", params.len()));
    }
    if let Some(y) = opts.year {
        params.push(Box::new(y));
        conditions.push(format!("year = ?{}", params.len()));
    }
    if let Some(g) = opts.gender {
        params.push(Box::new(g.to_string()));
        conditions.push(format!("gender = ?{}", params.len()));
    }
    if let Some(ref s) = opts.search {
        let pattern = format!("%{}%", s);
        params.push(Box::new(pattern));
        let n = params.len();
        conditions.push(format!(
            "(student_id LIKE ?{n} OR firstname LIKE ?{n} OR lastname LIKE ?{n} OR middlename LIKE ?{n})"
        ));
    }

    let where_clause = if conditions.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", conditions.join(" AND "))
    };

    // Count
    let count_sql = format!("SELECT COUNT(*) FROM students {where_clause}");
    let total: i64 = conn
        .query_row(
            &count_sql,
            params_from_iter(params.iter().map(|p| p.as_ref())),
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;

    let total_pages = ((total as f64) / (opts.page_size as f64)).ceil() as i64;
    let total_pages = if total_pages < 1 { 1 } else { total_pages };

    let offset = (opts.page - 1) * opts.page_size;
    let skip = offset.max(0);

    // Sort direction — matches old `firstname: sortBy === 'dec' ? -1 : 1`
    let order_dir = if opts.sort_by == Some("dec") {
        "DESC"
    } else {
        "ASC"
    };

    let data_sql = format!(
        "SELECT id, student_id, firstname, lastname, middlename,
                gender, course, year, email, is_placeholder,
                created_at, updated_at
         FROM students {where_clause}
         ORDER BY firstname {order_dir}
         LIMIT ?{p} OFFSET ?{o}",
        p = params.len() + 1,
        o = params.len() + 2,
    );

    params.push(Box::new(opts.page_size));
    params.push(Box::new(skip));

    let mut stmt = conn.prepare(&data_sql).map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(
            params_from_iter(params.iter().map(|p| p.as_ref())),
            row_to_student,
        )
        .map_err(|e| e.to_string())?;

    let mut students = Vec::new();
    for r in rows {
        students.push(r.map_err(|e| e.to_string())?);
    }

    let next = if offset + opts.page_size < total {
        opts.page + 1
    } else {
        -1
    };
    let prev = if opts.page > 1 { opts.page - 1 } else { -1 };

    Ok(PaginatedStudents {
        data: students,
        total,
        total_pages,
        next,
        prev,
    })
}

/// Distinct non-empty courses, excluding placeholders.
pub fn available_courses(db_path: &Path) -> Result<Vec<String>, String> {
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT DISTINCT course FROM students
             WHERE is_placeholder = 0 AND course != ''
             ORDER BY course",
        )
        .map_err(|e| e.to_string())?;

    let courses: Vec<String> = stmt
        .query_map([], |r| r.get(0))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(courses)
}
