//! Workbook builders for single-event and multi-event Excel exports.

use rust_xlsxwriter::Workbook;

use super::formats::ExportFormats;
use super::sanitizers::{
    compute_remarks, format_datetime, sanitize_cell, sanitize_sheet_name, setup_print,
};
use super::types::{EventHeader, ExportRow, ExportSummary, FIRST_DATA_ROW, HEADER_ROW};

// ---------------------------------------------------------------------------
// Builder entry points
// ---------------------------------------------------------------------------

/// Build a single-event `.xlsx` workbook (event-page export).
pub fn build_event_workbook(
    header: &EventHeader,
    summary: &ExportSummary,
    rows: &[ExportRow],
) -> Result<Vec<u8>, String> {
    let mut workbook = Workbook::new();
    let ws = workbook.add_worksheet();
    ws.set_name(sanitize_sheet_name(&header.title))
        .map_err(|e| e.to_string())?;

    let fmts = ExportFormats::new();

    // ── Header block ──
    ws.write_string_with_format(0, 0, "SEATS — SBO Attendance System", &fmts.app)
        .map_err(|e| e.to_string())?;
    ws.merge_range(1, 0, 1, 6, &header.title, &fmts.title)
        .map_err(|e| e.to_string())?;
    let _ = ws.set_row_height(1, 26.0);

    let info = format!(
        "Date: {} • Time: {} – {} • Venue: {}",
        header.date, header.start_time, header.end_time, header.venue
    );
    ws.merge_range(2, 0, 2, 6, &info, &fmts.info)
        .map_err(|e| e.to_string())?;

    let summary_text = format!(
        "Present: {}   Registered: {}   Attendance Rate: {:.1}%",
        summary.present,
        summary.registered,
        summary.rate * 100.0
    );
    ws.merge_range(4, 0, 4, 6, &summary_text, &fmts.summary)
        .map_err(|e| e.to_string())?;

    // ── Table header ──
    const COLUMNS: [&str; 7] = [
        "No",
        "Student ID",
        "Full Name",
        "Course/Year",
        "Time In",
        "Time Out",
        "Remarks",
    ];
    for (col, label) in COLUMNS.iter().enumerate() {
        ws.write_string_with_format(HEADER_ROW, col as u16, *label, &fmts.header)
            .map_err(|e| e.to_string())?;
    }

    // ── Data rows ──
    write_rows(ws, &fmts, rows);

    // ── Table furniture: auto-filter, freeze panes, widths, print ──
    let last_row = if rows.is_empty() {
        HEADER_ROW
    } else {
        FIRST_DATA_ROW + rows.len() as u32 - 1
    };
    ws.autofilter(HEADER_ROW, 0, last_row, COLUMNS.len() as u16 - 1)
        .map_err(|e| e.to_string())?;
    ws.set_freeze_panes(FIRST_DATA_ROW, 0)
        .map_err(|e| e.to_string())?;

    const WIDTHS: [f64; 7] = [5.0, 14.0, 28.0, 12.0, 20.0, 20.0, 14.0];
    for (col, w) in WIDTHS.iter().enumerate() {
        ws.set_column_width(col as u16, *w)
            .map_err(|e| e.to_string())?;
    }
    setup_print(ws);

    save_to_bytes(workbook)
}

/// Build a multi-event `.xlsx` workbook (reports-page export).
pub fn build_reports_workbook(
    summary: &ExportSummary,
    rows: &[ExportRow],
) -> Result<Vec<u8>, String> {
    let mut workbook = Workbook::new();
    let ws = workbook.add_worksheet();
    ws.set_name("SEATS Report").map_err(|e| e.to_string())?;

    let fmts = ExportFormats::new();

    // ── Header block ──
    ws.write_string_with_format(0, 0, "SEATS — SBO Attendance System", &fmts.app)
        .map_err(|e| e.to_string())?;
    ws.merge_range(1, 0, 1, 8, "SEATS Attendance Report", &fmts.title)
        .map_err(|e| e.to_string())?;
    let _ = ws.set_row_height(1, 26.0);

    let info = format!(
        "Records: {}   •   Registered: {}",
        rows.len(),
        summary.registered
    );
    ws.merge_range(2, 0, 2, 8, &info, &fmts.info)
        .map_err(|e| e.to_string())?;

    let summary_text = format!(
        "Present: {}   Registered: {}   Attendance Rate: {:.1}%",
        summary.present,
        summary.registered,
        summary.rate * 100.0
    );
    ws.merge_range(4, 0, 4, 8, &summary_text, &fmts.summary)
        .map_err(|e| e.to_string())?;

    // ── Table header (extra Event + Date columns) ──
    const COLUMNS: [&str; 9] = [
        "No",
        "Student ID",
        "Full Name",
        "Course/Year",
        "Event",
        "Date",
        "Time In",
        "Time Out",
        "Remarks",
    ];
    for (col, label) in COLUMNS.iter().enumerate() {
        ws.write_string_with_format(HEADER_ROW, col as u16, *label, &fmts.header)
            .map_err(|e| e.to_string())?;
    }

    // ── Data rows (with Event / Date columns) ──
    for (i, r) in rows.iter().enumerate() {
        let row = FIRST_DATA_ROW + i as u32;
        let base = if i % 2 == 1 { &fmts.band } else { &fmts.plain };

        ws.write_number_with_format(row, 0, r.no as u32, base)
            .map_err(|e| e.to_string())?;
        ws.write_string_with_format(row, 1, sanitize_cell(&r.student_id), base)
            .map_err(|e| e.to_string())?;
        ws.write_string_with_format(row, 2, sanitize_cell(&r.full_name), base)
            .map_err(|e| e.to_string())?;
        ws.write_string_with_format(row, 3, sanitize_cell(&r.course_year), base)
            .map_err(|e| e.to_string())?;
        ws.write_string_with_format(row, 4, sanitize_cell(&r.event_title), base)
            .map_err(|e| e.to_string())?;
        ws.write_string_with_format(row, 5, sanitize_cell(&r.event_date), base)
            .map_err(|e| e.to_string())?;
        if let Some(t) = &r.time_in {
            ws.write_string_with_format(row, 6, format_datetime(t), base)
                .map_err(|e| e.to_string())?;
        }
        if let Some(t) = &r.time_out {
            ws.write_string_with_format(row, 7, format_datetime(t), base)
                .map_err(|e| e.to_string())?;
        }
        write_remarks(ws, &fmts, row, 8, r);
    }

    // ── Table furniture ──
    let last_row = if rows.is_empty() {
        HEADER_ROW
    } else {
        FIRST_DATA_ROW + rows.len() as u32 - 1
    };
    ws.autofilter(HEADER_ROW, 0, last_row, COLUMNS.len() as u16 - 1)
        .map_err(|e| e.to_string())?;
    ws.set_freeze_panes(FIRST_DATA_ROW, 0)
        .map_err(|e| e.to_string())?;

    const WIDTHS: [f64; 9] = [5.0, 14.0, 28.0, 12.0, 24.0, 12.0, 20.0, 20.0, 14.0];
    for (col, w) in WIDTHS.iter().enumerate() {
        ws.set_column_width(col as u16, *w)
            .map_err(|e| e.to_string())?;
    }
    setup_print(ws);

    save_to_bytes(workbook)
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/// Writes the seven data columns for the event-sheet layout.
fn write_rows(ws: &mut rust_xlsxwriter::Worksheet, fmts: &ExportFormats, rows: &[ExportRow]) {
    for (i, r) in rows.iter().enumerate() {
        let row = FIRST_DATA_ROW + i as u32;
        let base = if i % 2 == 1 { &fmts.band } else { &fmts.plain };

        ws.write_number_with_format(row, 0, r.no as u32, base)
            .unwrap();
        ws.write_string_with_format(row, 1, sanitize_cell(&r.student_id), base)
            .unwrap();
        ws.write_string_with_format(row, 2, sanitize_cell(&r.full_name), base)
            .unwrap();
        ws.write_string_with_format(row, 3, sanitize_cell(&r.course_year), base)
            .unwrap();
        if let Some(t) = &r.time_in {
            ws.write_string_with_format(row, 4, format_datetime(t), base)
                .unwrap();
        }
        if let Some(t) = &r.time_out {
            ws.write_string_with_format(row, 5, format_datetime(t), base)
                .unwrap();
        }
        write_remarks(ws, fmts, row, 6, r);
    }
}

/// Writes the Remarks cell with its status tint.
fn write_remarks(
    ws: &mut rust_xlsxwriter::Worksheet,
    fmts: &ExportFormats,
    row: u32,
    col: u16,
    r: &ExportRow,
) {
    let remarks = compute_remarks(r.time_in.as_deref(), r.time_out.as_deref());
    let remarks_fmt = match remarks {
        "Present" => &fmts.present,
        "No time-out" => &fmts.no_timeout,
        _ => &fmts.plain,
    };
    ws.write_string_with_format(row, col, remarks, remarks_fmt)
        .unwrap();
}

/// Serializes the workbook to in-memory bytes.
fn save_to_bytes(mut workbook: Workbook) -> Result<Vec<u8>, String> {
    let mut buf: Vec<u8> = Vec::new();
    workbook
        .save_to_writer(&mut buf)
        .map_err(|e| e.to_string())?;
    Ok(buf)
}
