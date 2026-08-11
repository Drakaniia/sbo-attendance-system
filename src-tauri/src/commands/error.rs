use serde::Serialize;

/// Mirrors the old `error_code` API body — the scan page uses this to
/// show a "duplicate scan" flash instead of a hard error.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum ErrorCode {
    AlreadyCheckedIn,
    AlreadyCheckedOut,
}

/// Error value returned by every command. Tauri serializes it to the
/// webview, so the client rejection is the same `{ message, errorCode }`
/// shape the old axios interceptor produced.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IpcError {
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error_code: Option<ErrorCode>,
}

/// Lets `?` convert `Result<_, String>` (the query-layer error type) into
/// a command error.
impl From<String> for IpcError {
    fn from(message: String) -> Self {
        Self::new(message)
    }
}

impl IpcError {
    pub fn new(message: impl Into<String>) -> Self {
        Self {
            message: message.into(),
            error_code: None,
        }
    }

    pub fn with_code(message: impl Into<String>, code: ErrorCode) -> Self {
        Self {
            message: message.into(),
            error_code: Some(code),
        }
    }
}

/// Maps attendance-query error strings to typed IPC errors, preserving the
/// duplicate-scan error codes the frontend relies on.
pub fn map_attendance_err(msg: String) -> IpcError {
    if msg.contains("already checked in") {
        IpcError::with_code(msg, ErrorCode::AlreadyCheckedIn)
    } else if msg.contains("already checked out") {
        IpcError::with_code(msg, ErrorCode::AlreadyCheckedOut)
    } else {
        IpcError::new(msg)
    }
}
