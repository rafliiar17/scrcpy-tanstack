use thiserror::Error;

/// Unified error type for all backend operations.
/// Each variant maps to a specific failure category.
#[derive(Debug, Error)]
pub enum AppError {
    #[error("Process error: {0}")]
    Process(String),

    #[error("ADB error: {0}")]
    Adb(String),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Parse error: {0}")]
    Parse(String),

    #[error("Device not found: {0}")]
    DeviceNotFound(String),

    #[error("Already running: {0}")]
    AlreadyRunning(String),

    #[error("Not running: {0}")]
    NotRunning(String),

    #[error("Invalid argument: {0}")]
    InvalidArgument(String),

    #[error("Device unauthorized: {0}")]
    DeviceUnauthorized(String),

    #[error("Permission denied: {0}")]
    PermissionDenied(String),
}

/// Serialize AppError to String for Tauri command returns.
/// Logs the error via tracing before returning.
impl From<AppError> for String {
    fn from(err: AppError) -> String {
        let msg = err.to_string();
        tracing::error!("{}", msg);
        msg
    }
}
