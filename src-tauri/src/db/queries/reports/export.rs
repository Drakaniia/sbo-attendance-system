use rusqlite::{params_from_iter, Connection};
use std::path::Path;

use super::attendance_filter;

// --------------------------------------------------------------------------
// 8. export-csv — merged CSV across filtered range
// --------------------------------------------------------------------------

pub fn export_csv(
    db_path: &Path,
    start_date: Option<&str>,
    end_date: Option<&str>,
    event_id: Option<&str>,
) -> Result<String, String> {
    use chrono::NaiveDateTime;

    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    let (where_clause, values) = attendance_filter(start_date, end_date, event_id);

    let sql = format!(
        "SELECT a.student_id_number, a.time_in, a.time_out,
                s.firstname, s.lastname, s.middlename,
                s.course, s.year, s.is_placeholder,
                e.title, e.start_time
         FROM attendance a
         LEFT JOIN students s ON a.student_id = s.id
         LEFT JOIN events  e ON a.event_id    = e.id
         {where_clause}
         ORDER BY a.created_at"
    );

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params_from_iter(values.iter().map(|p| p.as_ref())), |r| {
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
                r.get::<_, String>(9)?,
                r.get::<_, String>(10)?,
            ))
        })
        .map_err(|e| e.to_string())?;

    fn parse_dt(s: &str) -> Option<NaiveDateTime> {
        NaiveDateTime::parse_from_str(s, "%Y-%m-%dT%H:%M:%S%.fZ")
            .or_else(|_| NaiveDateTime::parse_from_str(s, "%Y-%m-%d %H:%M:%S"))
            .ok()
    }

    fn fmt_time(s: Option<&str>) -> String {
        s.and_then(parse_dt)
            .map(|dt| {
                let h = dt.format("%H:%M:%S").to_string();
                h
            })
            .unwrap_or_else(|| "--".into())
    }

    fn fmt_date(s: &str) -> String {
        parse_dt(s)
            .map(|dt| dt.format("%m/%d/%Y").to_string())
            .unwrap_or_else(|| "--".into())
    }

    let mut csv =
        String::from("No,Student ID,Full Name,Course/Year,Event,Date,Time In,Time Out,Remarks\n");

    for (idx, row_result) in rows.enumerate() {
        let row = row_result.map_err(|e| e.to_string())?;
        let (
            sid,
            time_in,
            time_out,
            firstname,
            lastname,
            middlename,
            course,
            year,
            is_placeholder,
            event_title,
            event_start,
        ) = row;

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

        let event_date = fmt_date(&event_start);
        let event_start_dt = parse_dt(&event_start);

        let t_in = fmt_time(time_in.as_deref());
        let t_out = fmt_time(time_out.as_deref());

        let mut remarks = "Absent";
        if time_in.is_some() && time_out.is_some() {
            if let (Some(in_dt), Some(start_dt)) =
                (time_in.as_deref().and_then(parse_dt), event_start_dt)
            {
                let minutes_late = (in_dt - start_dt).num_minutes();
                remarks = if minutes_late <= 30 {
                    "Present"
                } else {
                    "Late"
                };
            }
        }

        csv.push_str(&format!(
            "{},{},{},{},{},{},{},{},{}\n",
            idx, sid, fullname, course_year, event_title, event_date, t_in, t_out, remarks,
        ));
    }

    Ok(csv)
}
