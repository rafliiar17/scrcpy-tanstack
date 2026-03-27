use serde::Serialize;
use tauri::AppHandle;
use tokio::process::Command;

use crate::config::get_adb_path;
use crate::error::AppError;

// ── Types ────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize)]
pub struct AppInfo {
    pub package: String,
    pub is_system: bool,
}

// ── Helpers ──────────────────────────────────────────────────────

/// Validate that a package name doesn't contain shell injection characters
fn validate_package(package: &str) -> Result<(), AppError> {
    if package.trim().is_empty() {
        return Err(AppError::InvalidArgument("Package name cannot be empty".into()));
    }
    // Android package names only allow alphanumeric, dots, and underscores.
    // We strictly validate this to prevent any shell injection.
    if package.chars().any(|c| !c.is_ascii_alphanumeric() && c != '.' && c != '_') {
        return Err(AppError::InvalidArgument(format!(
            "Invalid package name format: {}",
            package
        )));
    }
    Ok(())
}

async fn run_adb_shell(adb: &std::path::Path, serial: &str, cmd: &str) -> Result<String, AppError> {
    let output = Command::new(adb)
        .args(["-s", serial, "shell", cmd])
        .output()
        .await
        .map_err(|e| AppError::Process(format!("ADB execution failed: {}", e)))?;

    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();

    if !output.status.success() {
        let err_msg = if !stderr.is_empty() { stderr } else { stdout };
        return Err(AppError::Process(err_msg));
    }

    Ok(stdout)
}

// ── Commands ─────────────────────────────────────────────────────

#[tauri::command]
pub async fn list_packages(handle: tauri::AppHandle, serial: String) -> Result<Vec<AppInfo>, String> {
    if serial.is_empty() {
        return Err(AppError::InvalidArgument("No device selected".into()).into());
    }

    let adb = get_adb_path(&handle);

    // List system apps
    let sys_output = run_adb_shell(&adb, &serial, "pm list packages -s").await.map_err(String::from)?;
    // List third-party apps
    let user_output = run_adb_shell(&adb, &serial, "pm list packages -3").await.map_err(String::from)?;

    let mut apps = Vec::new();

    // Process system apps
    for line in sys_output.lines() {
        if let Some(pkg) = line.strip_prefix("package:") {
            apps.push(AppInfo {
                package: pkg.trim().to_string(),
                is_system: true,
            });
        }
    }

    // Process user apps
    for line in user_output.lines() {
        if let Some(pkg) = line.strip_prefix("package:") {
            apps.push(AppInfo {
                package: pkg.trim().to_string(),
                is_system: false,
            });
        }
    }

    // Sort alphabetically
    apps.sort_by(|a, b| a.package.to_lowercase().cmp(&b.package.to_lowercase()));

    Ok(apps)
}

#[tauri::command]
pub async fn install_apk(
    _app: AppHandle,
    serial: String,
    path: String,
) -> Result<String, String> {
    if serial.is_empty() {
        return Err(AppError::InvalidArgument("No device selected".into()).into());
    }
    if path.is_empty() {
        return Err(AppError::InvalidArgument("No APK path provided".into()).into());
    }

    let adb = get_adb_path(&_app);
    let output = Command::new(&adb)
        .args(["-s", &serial, "install", "-r", &path])
        .output()
        .await
        .map_err(|e| AppError::Process(format!("Failed to install APK: {}", e)).to_string())?;

    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();

    if stdout.to_lowercase().contains("success") {
        let filename = std::path::Path::new(&path)
            .file_name()
            .unwrap_or_default()
            .to_string_lossy();
        Ok(format!("Installed {}", filename))
    } else {
        Err(AppError::Process(format!("Install failed: {} {}", stdout, stderr)).into())
    }
}

#[tauri::command]
pub async fn uninstall_app(handle: tauri::AppHandle, serial: String, package: String) -> Result<String, String> {
    validate_package(&package).map_err(String::from)?;
    
    let adb = get_adb_path(&handle);
    let cmd = format!("pm uninstall --user 0 {}", package);
    let stdout = run_adb_shell(&adb, &serial, &cmd).await.map_err(String::from)?;

    if stdout.to_lowercase().contains("success") {
        Ok(format!("Uninstalled {}", package))
    } else {
        Err(AppError::Process(format!("Uninstall failed: {}", stdout)).into())
    }
}

#[tauri::command]
pub async fn clear_app_data(handle: tauri::AppHandle, serial: String, package: String) -> Result<String, String> {
    validate_package(&package).map_err(String::from)?;
    
    let adb = get_adb_path(&handle);
    let cmd = format!("pm clear {}", package);
    let stdout = run_adb_shell(&adb, &serial, &cmd).await.map_err(String::from)?;

    if stdout.to_lowercase().contains("success") {
        Ok(format!("Cleared data for {}", package))
    } else {
        Err(AppError::Process(format!("Clear failed: {}", stdout)).into())
    }
}

#[tauri::command]
pub async fn force_stop_app(handle: tauri::AppHandle, serial: String, package: String) -> Result<String, String> {
    validate_package(&package).map_err(String::from)?;
    
    let adb = get_adb_path(&handle);
    let cmd = format!("am force-stop {}", package);
    run_adb_shell(&adb, &serial, &cmd).await.map_err(String::from)?;
    
    Ok(format!("Force stopped {}", package))
}

#[tauri::command]
pub async fn launch_app(handle: tauri::AppHandle, serial: String, package: String) -> Result<String, String> {
    validate_package(&package).map_err(String::from)?;
    
    let adb = get_adb_path(&handle);
    // Use monkey to launch the main intent of the app
    let cmd = format!("monkey -p {} -c android.intent.category.LAUNCHER 1", package);
    let stdout = run_adb_shell(&adb, &serial, &cmd).await.map_err(String::from)?;
    
    if stdout.contains("Events injected") || stdout.contains("monkey aborted") {
        Ok(format!("Launched {}", package))
    } else {
        Err(AppError::Process(format!("Failed to launch: {}", stdout)).into())
    }
}
