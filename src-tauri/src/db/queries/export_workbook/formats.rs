//! Cell styles, formatting, and colour palette for the Excel export.

use rust_xlsxwriter::{Color, Format, FormatAlign, FormatBorder};

/// The formats shared by both workbook layouts.
pub struct ExportFormats {
    pub app: Format,
    pub title: Format,
    pub info: Format,
    pub summary: Format,
    pub header: Format,
    pub band: Format,
    pub present: Format,
    pub no_timeout: Format,
    pub plain: Format,
}

impl ExportFormats {
    pub fn new() -> Self {
        Self {
            app: Format::new()
                .set_font_size(9.0)
                .set_font_color(Color::RGB(0x6B7280)),
            title: Format::new().set_bold().set_font_size(16.0),
            info: Format::new()
                .set_font_size(10.0)
                .set_font_color(Color::RGB(0x6B7280)),
            summary: Format::new().set_bold().set_font_size(11.0),
            header: Format::new()
                .set_bold()
                .set_font_color(Color::RGB(0xFFFFFF))
                .set_background_color(Color::RGB(0x4F46E5))
                .set_align(FormatAlign::Center)
                .set_border(FormatBorder::Thin),
            band: Format::new().set_background_color(Color::RGB(0xF9FAFB)),
            present: Format::new()
                .set_background_color(Color::RGB(0xDCFCE7))
                .set_font_color(Color::RGB(0x166534)),
            no_timeout: Format::new()
                .set_background_color(Color::RGB(0xFEF3C7))
                .set_font_color(Color::RGB(0x92400E)),
            plain: Format::new(),
        }
    }
}
