use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde::Serialize;

/// Standard error codes matching the existing client-side error mapping.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum ErrorCode {
    AlreadyCheckedIn,
    AlreadyCheckedOut,
}

/// Structured API error returned to the client.
#[derive(Debug, Serialize)]
pub struct ApiError {
    pub success: bool,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error_code: Option<ErrorCode>,
}

#[derive(Debug)]
pub struct AppError {
    pub status: StatusCode,
    pub message: String,
    pub code: Option<ErrorCode>,
}

impl AppError {
    pub fn new(status: StatusCode, message: impl Into<String>) -> Self {
        Self {
            status,
            message: message.into(),
            code: None,
        }
    }

    pub fn with_code(status: StatusCode, message: impl Into<String>, code: ErrorCode) -> Self {
        Self {
            status,
            message: message.into(),
            code: Some(code),
        }
    }
}

// Allow `?` with AppError in handlers that return `Result<_, AppError>`.
impl<E: std::fmt::Display> From<E> for AppError {
    fn from(err: E) -> Self {
        Self {
            status: StatusCode::INTERNAL_SERVER_ERROR,
            message: err.to_string(),
            code: None,
        }
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let body = ApiError {
            success: false,
            message: self.message,
            error_code: self.code,
        };
        (self.status, Json(body)).into_response()
    }
}
