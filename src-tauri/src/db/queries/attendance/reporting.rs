use rusqlite::{params, Connection};
use std::path::Path;

use super::models::{
    populate_select, row_to_attendance, AttendancePopulated, PaginatedAttendances,
};

// --------------------------------------------------------------------------
// list_recent — latest N attendances
// --------------------------------------------------------------------------

pub fn list_recent(db_path: &Path, limit: i64) -> Result<Vec<AttendancePopulated>, String> {
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(&format!(
            "{} ORDER BY a.updated_at DESC LIMIT ?1",
            populate_select()
        ))
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![limit], row_to_attendance)
        .map_err(|e| e.to_string())?;
    let mut list = Vec::new();
    for r in rows {
        list.push(r.map_err(|e| e.to_string())?);
    }
    Ok(list)
}

// --------------------------------------------------------------------------
// list_by_event — paginated attendances for an event
// --------------------------------------------------------------------------

pub fn list_by_event(
    db_path: &Path,
    event_id: &str,
    page: i64,
    page_size: i64,
) -> Result<PaginatedAttendances, String> {
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    let total: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM attendance WHERE event_id = ?1",
            params![event_id],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;

    let total_pages = ((total as f64) / (page_size as f64)).ceil() as i64;
    let total_pages = if total_pages < 1 { 1 } else { total_pages };
    let offset = (page - 1).max(0) * page_size;
    let next = if offset + page_size < total {
        page + 1
    } else {
        -1
    };
    let prev = if page > 1 { page - 1 } else { -1 };

    let sql = format!(
        "{} WHERE a.event_id = ?1 ORDER BY a.updated_at DESC LIMIT ?2 OFFSET ?3",
        populate_select()
    );
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![event_id, page_size, offset], row_to_attendance)
        .map_err(|e| e.to_string())?;

    let mut data = Vec::new();
    for r in rows {
        data.push(r.map_err(|e| e.to_string())?);
    }

    Ok(PaginatedAttendances {
        data,
        total,
        total_pages,
        next,
        prev,
    })
}

// --------------------------------------------------------------------------
// export_csv — generate CSV string for an event's attendances
// --------------------------------------------------------------------------

pub fn export_csv(db_path: &Path, event_id: &str) -> Result<String, String> {
    use chrono::{NaiveDateTime, Timelike};

    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    // Fetch event info.
    let event: (String, String) = conn
        .query_row(
            "SELECT title, start_time FROM events WHERE id = ?1",
            params![event_id],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .map_err(|_| "Event not found".to_string())?;

    let event_title = event.0;
    let event_start: String = event.1;

    // Fetch all attendances with student info.
    let mut stmt = conn
        .prepare(
            "SELECT a.student_id_number, a.time_in, a.time_out,
                    s.firstname, s.lastname, s.middlename,
                    s.course, s.year, s.is_placeholder
             FROM attendance a
             LEFT JOIN students s ON a.student_id = s.id
             WHERE a.event_id = ?1
             ORDER BY a.created_at",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![event_id], |r| {
            Ok((
                r.get::<_, String>(0)?,
                r.get::<_, Option<String>>(1)?,
                r.get::<_, Option<String>>(2)?,
                r.get::<_, String>(3)?,
                r.get::<_, String>(4)?,
                r.get::<_, String>(5)?,
                r.get::<_, String>(6)?,
                r.get::<_, i64>(7)?,
                r.get::<_, i64>(8)?,
            ))
        })
        .map_err(|e| e.to_string())?;

    fn parse_dt(s: &str) -> Option<NaiveDateTime> {
        // Try ISO 8601: "2025-01-15T08:00:00.000Z" or "2025-01-15 08:00:00"
        NaiveDateTime::parse_from_str(s, "%Y-%m-%dT%H:%M:%S%.fZ")
            .or_else(|_| NaiveDateTime::parse_from_str(s, "%Y-%m-%d %H:%M:%S"))
            .ok()
    }

    fn fmt_time(s: Option<&str>) -> String {
        s.and_then(parse_dt)
            .map(|dt| {
                let h = dt.hour();
                let ampm = if h >= 12 { "PM" } else { "AM" };
                let h12 = if h == 0 {
                    12
                } else if h > 12 {
                    h - 12
                } else {
                    h
                };
                format!("{:02}:{:02} {}", h12, dt.minute(), ampm)
            })
            .unwrap_or_else(|| "--".into())
    }

    fn fmt_date(s: &str) -> String {
        parse_dt(s)
            .map(|dt| dt.format("%m/%d/%Y").to_string())
            .unwrap_or_else(|| "--".into())
    }

    let event_date = fmt_date(&event_start);
    let event_start_dt = parse_dt(&event_start);

    let mut csv = String::from(
        "No,Student ID,Full Name,Course/Year,Event Name,Date,Time In,Time Out,Remarks\n",
    );

    for (idx, row_result) in rows.enumerate() {
        let row = row_result.map_err(|e| e.to_string())?;
        let (sid, time_in, time_out, firstname, lastname, middlename, course, year, is_placeholder) =
            row;

        let is_placeholder = is_placeholder != 0;
        let fullname = if is_placeholder {
            String::new()
        } else {
            format!("{} {} {}", firstname, middlename, lastname)
                .trim()
                .to_string()
        };
        let course_year = if is_placeholder {
            String::new()
        } else {
            format!("{}/{}", course, year)
        };

        let t_in = fmt_time(time_in.as_deref());
        let t_out = fmt_time(time_out.as_deref());

        let mut remarks = "Absent";
        if time_in.is_some() && time_out.is_some() {
            if let (Some(in_dt), Some(start_dt)) =
                (time_in.as_deref().and_then(parse_dt), event_start_dt)
            {
                let minutes_late = (in_dt - start_dt).num_minutes();
                if minutes_late <= 30 {
                    remarks = "Present";
                } else {
                    remarks = "Late";
                }
            }
        }

        csv.push_str(&format!(
            "{},{},{},{},{},{},{},{},{}\n",
            idx, sid, fullname, course_year, event_title, event_date, t_in, t_out, remarks,
        ));
    }

    Ok(csv)
}
