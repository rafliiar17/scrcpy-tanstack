use serde::Serialize;
use tokio::process::Command;

use crate::config::{get_adb_path, DEVICE_ID_ALLOWED_CHARS};
use crate::error::AppError;

// ── Types ────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize)]
pub struct DeviceInfo {
    pub serial: String,
    pub model: String,
    pub status: String,
    pub connection_type: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct DeviceDetails {
    pub model: String,
    pub manufacturer: String,
    pub android_version: String,
    pub sdk_version: String,
    pub resolution: String,
    pub battery: String,
}

// ── Validation ───────────────────────────────────────────────────

fn validate_device_id(serial: &str) -> Result<(), AppError> {
    if serial.is_empty() {
        return Err(AppError::DeviceNotFound("No device selected".into()));
    }
    if serial.chars().any(|c| !DEVICE_ID_ALLOWED_CHARS.contains(c)) {
        return Err(AppError::InvalidArgument(format!(
            "Device ID contains invalid characters: {}",
            serial
        )));
    }
    Ok(())
}

// ── Helpers ──────────────────────────────────────────────────────

async fn adb_getprop(adb: &std::path::Path, serial: &str, prop: &str) -> String {
    Command::new(adb)
        .args(["-s", serial, "shell", "getprop", prop])
        .output()
        .await
        .ok()
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        .unwrap_or_default()
}

// ── Commands ─────────────────────────────────────────────────────

/// List all connected ADB devices with their model and connection type.
#[tauri::command]
pub async fn list_devices(handle: tauri::AppHandle) -> Result<Vec<DeviceInfo>, String> {
    tracing::debug!("Listing connected devices");
    let adb = get_adb_path(&handle);

    let output = Command::new(&adb)
        .args(["devices", "-l"])
        .output()
        .await
        .map_err(|e| -> String {
            if e.kind() == std::io::ErrorKind::NotFound {
                AppError::Adb("adb not found. Please install Android SDK Platform Tools.".into())
                    .into()
            } else {
                AppError::Adb(format!("Failed to run adb: {}", e)).into()
            }
        })?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut devices = Vec::new();

    for line in stdout.lines().skip(1) {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }

        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 2 {
            continue;
        }

        let serial = parts[0].to_string();
        let status = parts[1].to_string();

        let model = parts
            .iter()
            .find(|p| p.starts_with("model:"))
            .map(|p| p.strip_prefix("model:").unwrap_or("device").to_string())
            .unwrap_or_else(|| "device".to_string());

        let connection_type = if serial.contains('.') {
            "wifi".to_string()
        } else {
            "usb".to_string()
        };

        tracing::info!(serial = %serial, model = %model, status = %status, "Device found");

        devices.push(DeviceInfo {
            serial,
            model,
            status,
            connection_type,
        });
    }

    Ok(devices)
}

/// Get detailed information about a specific device.
#[tauri::command]
pub async fn get_device_info(handle: tauri::AppHandle, serial: String) -> Result<DeviceDetails, String> {
    validate_device_id(&serial).map_err(String::from)?;

    tracing::debug!(serial = %serial, "Getting device info");
    let adb = get_adb_path(&handle);

    // Check device state first to avoid multiple shell error spam
    let state_output = Command::new(&adb)
        .args(["-s", &serial, "get-state"])
        .output()
        .await
        .map_err(|e| AppError::Adb(format!("Failed to run adb: {}", e)))?;

    let state = String::from_utf8_lossy(&state_output.stdout).trim().to_string();
    let stderr = String::from_utf8_lossy(&state_output.stderr).to_string();

    if state != "device" || stderr.contains("unauthorized") {
        return Err(AppError::DeviceUnauthorized(serial).into());
    }

    let model = adb_getprop(&adb, &serial, "ro.product.model").await;
    let manufacturer = adb_getprop(&adb, &serial, "ro.product.manufacturer").await;
    let android_version = adb_getprop(&adb, &serial, "ro.build.version.release").await;
    let sdk_version = adb_getprop(&adb, &serial, "ro.build.version.sdk").await;

    // Resolution
    let resolution = Command::new(&adb)
        .args(["-s", &serial, "shell", "wm", "size"])
        .output()
        .await
        .ok()
        .map(|o| {
            String::from_utf8_lossy(&o.stdout)
                .trim()
                .replace("Physical size: ", "")
        })
        .unwrap_or_default();

    // Battery
    let battery = Command::new(&adb)
        .args(["-s", &serial, "shell", "dumpsys", "battery"])
        .output()
        .await
        .ok()
        .map(|o| {
            let out = String::from_utf8_lossy(&o.stdout);
            out.lines()
                .find(|l| l.contains("level:"))
                .map(|l| {
                    l.trim()
                        .replace("level: ", "")
                        .trim()
                        .to_string()
                        + "%"
                })
                .unwrap_or_default()
        })
        .unwrap_or_default();

    tracing::info!(serial = %serial, model = %model, "Device info retrieved");

    Ok(DeviceDetails {
        model,
        manufacturer,
        android_version,
        sdk_version,
        resolution,
        battery,
    })
}
