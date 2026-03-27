use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};
use tokio::process::Command;
use std::process::Stdio;

use crate::config::*;
use crate::config::get_adb_path;
use crate::error::AppError;
use crate::state::AppState;

// ── Types ────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MirrorOptions {
    pub device: String,
    pub bitrate: u32,
    pub max_fps: u32,
    pub resolution: String,
    pub codec: String,
    pub rotation: String,
    pub no_audio: bool,
    pub fullscreen: bool,
    pub borderless: bool,
    pub always_on_top: bool,
    pub stay_awake: bool,
    pub turn_screen_off: bool,
    pub no_control: bool,
    pub sync_clipboard: bool,
    pub window_title: String,
    pub custom_args: String,
    pub audio_source: String,
    pub audio_bit_rate: Option<u32>,
    pub audio_codec: Option<String>,
    pub video_source: Option<String>, // "display" or "camera"
    pub camera_id: Option<String>,
    pub camera_facing: Option<String>,
    pub camera_size: Option<String>,
}

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct CameraInfo {
    pub id: String,
    pub facing: String,
    pub size: String,
}

#[tauri::command]
pub async fn list_cameras(serial: String) -> Result<Vec<CameraInfo>, String> {
    let output = Command::new(SCRCPY_BIN)
        .args(["--serial", &serial, "--list-cameras"])
        .output()
        .await
        .map_err(|e| e.to_string())?;

    // scrcpy outputs to stderr for list commands
    let raw = String::from_utf8_lossy(&output.stderr);
    let stdout = String::from_utf8_lossy(&output.stdout);
    let combined = format!("{}{}", stdout, raw);
    let mut cameras = Vec::new();

    for line in combined.lines() {
        // Format: "    --camera-id=0    (back, 4640x3472, fps=[15, 24, 30])"
        if !line.contains("--camera-id=") {
            continue;
        }
        // Extract ID
        let id = line.split("--camera-id=")
            .nth(1)
            .and_then(|s| s.split_whitespace().next())
            .unwrap_or("")
            .to_string();

        // Extract facing and size from parentheses: (back, 4640x3472, fps=[...])
        let paren_content = line.split('(').nth(1).and_then(|s| s.split(')').next()).unwrap_or("");
        let parts: Vec<&str> = paren_content.split(',').map(|s| s.trim()).collect();

        let facing = match parts.first().unwrap_or(&"") {
            &"back" => "Back".to_string(),
            &"front" => "Front".to_string(),
            &"external" => "External".to_string(),
            other => other.to_string(),
        };

        let size = parts.get(1).unwrap_or(&"Unknown").trim().to_string();

        cameras.push(CameraInfo { id, facing, size });
    }

    Ok(cameras)
}
#[derive(Debug, Clone, Serialize)]
pub struct MirrorStatus {
    pub running: bool,
    pub device: String,
    pub pid: Option<u32>,
}

// ── Command Builder ──────────────────────────────────────────────

fn build_mirror_args(opts: &MirrorOptions) -> Vec<String> {
    let mut args: Vec<String> = Vec::new();

    // Device serial
    if !opts.device.is_empty() {
        args.push("-s".into());
        args.push(opts.device.clone());
    }

    // Bitrate
    args.push("--video-bit-rate".into());
    args.push(format!("{}M", opts.bitrate));

    // FPS and Resolution logic depends on source
    let is_camera = opts.video_source.as_deref() == Some("camera");

    if !is_camera {
        args.push("--max-fps".into());
        args.push(opts.max_fps.to_string());

        if !opts.resolution.is_empty() && opts.resolution != "default" {
            args.push("--max-size".into());
            args.push(opts.resolution.clone());
        }
    } else {
        // Camera specific options
        if opts.max_fps > 0 {
            args.push(format!("--camera-fps={}", opts.max_fps));
        }
        if let Some(size) = &opts.camera_size {
            if !size.is_empty() && size != "auto" {
                args.push(format!("--camera-size={}", size));
            }
        }
    }

    // Codec
    if opts.codec != MIRROR_DEFAULT_CODEC {
        args.push("--video-codec".into());
        args.push(opts.codec.clone());
    }

    // Rotation / Orientation (scrcpy 3.x)
    if opts.rotation != "0" && !opts.rotation.is_empty() {
        // In scrcpy 3+, values are degrees directly: 0, 90, 180, 270
        let degrees = match opts.rotation.as_str() {
            "1" => "90".to_string(),
            "2" => "180".to_string(),
            "3" => "270".to_string(),
            other => other.to_string(),
        };
        if is_camera {
            // For camera source, use --capture-orientation
            args.push(format!("--capture-orientation={}", degrees));
        } else {
            // For display source, use --display-orientation
            args.push(format!("--display-orientation={}", degrees));
        }
    }

    // Audio
    if opts.no_audio {
        args.push("--no-audio".into());
    } else if !opts.audio_source.is_empty() && opts.audio_source != "output" {
        args.push(format!("--audio-source={}", opts.audio_source));
    }

    // Window options
    if opts.fullscreen {
        args.push("--fullscreen".into());
    }
    if opts.borderless {
        args.push("--window-borderless".into());
    }
    if opts.always_on_top {
        args.push("--always-on-top".into());
    }
    if opts.stay_awake && !opts.no_control && !is_camera {
        args.push("--stay-awake".into());
    }
    if let Some(source) = &opts.video_source {
        if source == "camera" {
            args.push("--video-source=camera".into());
            // camera-id and camera-facing are mutually exclusive
            let has_id = opts.camera_id.as_ref().map_or(false, |id| !id.is_empty());
            if has_id {
                args.push(format!("--camera-id={}", opts.camera_id.as_ref().unwrap()));
            } else if let Some(facing) = &opts.camera_facing {
                if !facing.is_empty() && facing != "auto" {
                    args.push(format!("--camera-facing={}", facing));
                }
            }
        }
    }

    if let Some(abr) = opts.audio_bit_rate {
        args.push(format!("--audio-bit-rate={}", abr));
    }

    if let Some(codec) = &opts.audio_codec {
        args.push(format!("--audio-codec={}", codec));
    }
    if opts.turn_screen_off {
        args.push("--turn-screen-off".into());
    }
    if opts.no_control {
        args.push("--no-control".into());
    }
    if !opts.sync_clipboard {
        args.push("--no-clipboard-autosync".into());
    }

    // Window title
    if !opts.window_title.is_empty() && opts.window_title != "scrcpy" {
        args.push("--window-title".into());
        args.push(opts.window_title.clone());
    }

    // Custom args
    if !opts.custom_args.trim().is_empty() {
        for arg in opts.custom_args.split_whitespace() {
            args.push(arg.to_string());
        }
    }

    args
}

// ── Validation ───────────────────────────────────────────────────

fn validate_mirror_options(opts: &MirrorOptions) -> Result<(), AppError> {
    if opts.device.is_empty() {
        return Err(AppError::InvalidArgument("No device selected".into()));
    }
    if opts.device.chars().any(|c| !DEVICE_ID_ALLOWED_CHARS.contains(c)) {
        return Err(AppError::InvalidArgument(format!(
            "Device ID contains invalid characters: {}",
            opts.device
        )));
    }
    if opts.bitrate < MIRROR_MIN_BITRATE || opts.bitrate > MIRROR_MAX_BITRATE {
        return Err(AppError::InvalidArgument(format!(
            "Bitrate must be between {} and {} Mbps",
            MIRROR_MIN_BITRATE, MIRROR_MAX_BITRATE
        )));
    }
    if opts.max_fps < MIRROR_MIN_FPS || opts.max_fps > MIRROR_MAX_FPS {
        return Err(AppError::InvalidArgument(format!(
            "FPS must be between {} and {}",
            MIRROR_MIN_FPS, MIRROR_MAX_FPS
        )));
    }
    Ok(())
}

// ── Commands ─────────────────────────────────────────────────────

/// Build the scrcpy command arguments (for preview/debug).
#[tauri::command]
pub async fn build_scrcpy_command(opts: MirrorOptions) -> Result<Vec<String>, String> {
    validate_mirror_options(&opts).map_err(String::from)?;
    let mut cmd = vec![SCRCPY_BIN.to_string()];
    cmd.extend(build_mirror_args(&opts));
    Ok(cmd)
}

/// Start scrcpy mirroring for a device.
#[tauri::command]
pub async fn start_mirror(
    app: AppHandle,
    state: tauri::State<'_, AppState>,
    opts: MirrorOptions,
) -> Result<MirrorStatus, String> {
    validate_mirror_options(&opts).map_err(String::from)?;

    let serial = opts.device.clone();

    // Check if already running for this device
    {
        let registry = state.processes.lock().await;
        if registry.mirror.contains_key(&serial) {
            return Err(AppError::AlreadyRunning(format!(
                "Mirror already running for {}",
                serial
            ))
            .into());
        }
    }

    let args = build_mirror_args(&opts);
    let cmd_str = format!("{} {}", SCRCPY_BIN, args.join(" "));

    tracing::info!(serial = %serial, cmd = %cmd_str, "Starting mirror");
    let _ = app.emit(EVENT_LOG, format!("$ {}", cmd_str));

    let mut child = Command::new(SCRCPY_BIN)
        .args(&args)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| -> String {
            if e.kind() == std::io::ErrorKind::NotFound {
                AppError::Process(
                    "scrcpy not found. Please install scrcpy and ensure it's in PATH.".into(),
                )
                .into()
            } else {
                AppError::Process(format!("Failed to start scrcpy: {}", e)).into()
            }
        })?;

    let pid = child.id();
    tracing::info!(serial = %serial, pid = ?pid, "Mirror process spawned");

    let stdout = child.stdout.take();
    let stderr = child.stderr.take();

    let app_out = app.clone();
    if let Some(out) = stdout {
        tokio::spawn(async move {
            use tokio::io::{AsyncBufReadExt, BufReader};
            let mut reader = BufReader::new(out).lines();
            while let Ok(Some(line)) = reader.next_line().await {
                let _ = app_out.emit(EVENT_LOG, line);
            }
        });
    }

    let app_err = app.clone();
    if let Some(err) = stderr {
        tokio::spawn(async move {
            use tokio::io::{AsyncBufReadExt, BufReader};
            let mut reader = BufReader::new(err).lines();
            while let Ok(Some(line)) = reader.next_line().await {
                let _ = app_err.emit(EVENT_LOG, line);
            }
        });
    }

    // Store in registry
    {
        let mut registry = state.processes.lock().await;
        registry.mirror.insert(serial.clone(), child);
    }

    // Spawn background task to monitor process exit
    let app_exit = app.clone();
    let serial_exit = serial.clone();
    let state_clone = state.processes.clone();
    tokio::spawn(async move {
        // Wait for process to exit
        loop {
            tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
            let mut registry = state_clone.lock().await;
            if let Some(child) = registry.mirror.get_mut(&serial_exit) {
                match child.try_wait() {
                    Ok(Some(exit_status)) => {
                        tracing::info!(
                            serial = %serial_exit,
                            exit = %exit_status,
                            "Mirror process exited"
                        );
                        let _ = app_exit.emit(
                            EVENT_LOG,
                            format!("→ Mirror exited for {} ({})", serial_exit, exit_status),
                        );
                        let _ = app_exit.emit(
                            EVENT_PROCESS_EXIT,
                            MirrorStatus {
                                running: false,
                                device: serial_exit.clone(),
                                pid: None,
                            },
                        );
                        registry.mirror.remove(&serial_exit);
                        break;
                    }
                    Ok(None) => {
                        // Still running
                    }
                    Err(e) => {
                        tracing::error!(serial = %serial_exit, error = %e, "Error checking mirror process");
                        registry.mirror.remove(&serial_exit);
                        break;
                    }
                }
            } else {
                // Process was removed externally (stop_mirror)
                break;
            }
        }
    });

    Ok(MirrorStatus {
        running: true,
        device: serial,
        pid,
    })
}

/// Stop mirroring for a specific device.
#[tauri::command]
pub async fn stop_mirror(
    app: AppHandle,
    state: tauri::State<'_, AppState>,
    serial: String,
) -> Result<MirrorStatus, String> {
    tracing::info!(serial = %serial, "Stopping mirror");

    let mut registry = state.processes.lock().await;

    if let Some(mut child) = registry.mirror.remove(&serial) {
        let _ = child.kill().await;
        let _ = child.wait().await;
        tracing::info!(serial = %serial, "Mirror process killed");
        let _ = app.emit(EVENT_LOG, format!("→ Mirror stopped for {}", serial));
    } else {
        tracing::warn!(serial = %serial, "No mirror process found to stop");
    }

    let _ = app.emit(
        EVENT_PROCESS_EXIT,
        MirrorStatus {
            running: false,
            device: serial.clone(),
            pid: None,
        },
    );

    Ok(MirrorStatus {
        running: false,
        device: serial,
        pid: None,
    })
}

/// Get the mirror status for a specific device.
#[tauri::command]
pub async fn get_mirror_status(
    state: tauri::State<'_, AppState>,
    serial: String,
) -> Result<MirrorStatus, String> {
    let registry = state.processes.lock().await;
    let running = registry.mirror.contains_key(&serial);
    let pid = registry
        .mirror
        .get(&serial)
        .and_then(|c| c.id());

    Ok(MirrorStatus {
        running,
        device: serial,
        pid,
    })
}

/// Start a virtual display for a device.
#[tauri::command]
pub async fn start_virtual_display(
    app: AppHandle,
    serial: String,
    package: String,
    resolution: String,
) -> Result<String, String> {
    if serial.is_empty() {
        return Err(AppError::InvalidArgument("No device selected".into()).into());
    }

    let mut args = vec!["-s".to_string(), serial.clone()];

    if resolution.is_empty() {
        args.push("--new-display".into());
    } else {
        args.push(format!("--new-display={}", resolution));
    }

    if !package.is_empty() {
        args.push("--start-app".into());
        args.push(package.clone());
    }

    let title = if package.is_empty() {
        "Launcher (Virtual Display)".to_string()
    } else {
        format!("{} (Virtual Display)", package)
    };
    args.push("--window-title".into());
    args.push(title);

    let cmd_str = format!("{} {}", SCRCPY_BIN, args.join(" "));
    tracing::info!(serial = %serial, cmd = %cmd_str, "Starting virtual display");
    let _ = app.emit(EVENT_LOG, format!("$ {}", cmd_str));

    Command::new(SCRCPY_BIN)
        .args(&args)
        .spawn()
        .map_err(|e| -> String {
            AppError::Process(format!("Virtual display failed: {}", e)).into()
        })?;

    Ok(format!("Virtual display started for {}", if package.is_empty() { serial } else { package }))
}

async fn get_pc_clipboard() -> Option<String> {
    // Try wl-paste (Wayland)
    if let Ok(child) = Command::new("wl-paste")
        .arg("-n")
        .stdout(Stdio::piped())
        .spawn()
    {
        if let Ok(output) = child.wait_with_output().await {
            if output.status.success() {
                return Some(String::from_utf8_lossy(&output.stdout).trim().to_string());
            }
        }
    }

    // Try xclip (X11)
    if let Ok(child) = Command::new("xclip")
        .args(["-o", "-selection", "clipboard"])
        .stdout(Stdio::piped())
        .spawn()
    {
        if let Ok(output) = child.wait_with_output().await {
            if output.status.success() {
                return Some(String::from_utf8_lossy(&output.stdout).trim().to_string());
            }
        }
    }

    None
}

#[tauri::command]
pub async fn start_clipboard_sync(
    app: AppHandle,
    state: tauri::State<'_, AppState>,
    serial: String,
) -> Result<String, String> {
    if serial.is_empty() {
        return Err("No device selected".to_string());
    }

    let adb = get_adb_path(&app);
    let mut registry = state.processes.lock().await;
    if registry.clipboard_sync.contains_key(&serial) {
        return Ok("Clipboard sync already active".to_string());
    }

    // Spawn the rust-based PC clipboard listener (KDE Connect style)
    let app_handle = app.clone();
    let serial_clone = serial.clone();
    let state_clone = state.processes.clone();

    // Spawn background task for PC <-> Android sync
    tokio::spawn(async move {
        let mut last_pc_clipboard = get_pc_clipboard().await.unwrap_or_default();
        let mut last_android_clipboard = String::new();
        tracing::info!(serial = %serial_clone, "True Headless Sync Service started (Deep Sync Mode)");

        // Initial Connect Sync: Push PC clipboard to Android Clipboard immediately on start
        if !last_pc_clipboard.is_empty() {
            let escaped = last_pc_clipboard.replace("'", "'\\''");
            let _ = Command::new(&adb)
                .args(["-s", &serial_clone, "shell", &format!("cmd clipboard set '{}' 2>/dev/null || service call clipboard 2 i32 1 s16 '{}' 2>/dev/null", escaped, escaped)])
                .spawn();
            let _ = app_handle.emit("clipboard-sync-event", &last_pc_clipboard);
        }

        loop {
            tokio::time::sleep(tokio::time::Duration::from_millis(1500)).await;

            // Check if still active in registry
            {
                let reg = state_clone.lock().await;
                if !reg.clipboard_sync.contains_key(&serial_clone) {
                    break;
                }
            }

            // A. PC -> Android (Direct Clipboard Injection - No Typing)
            if let Some(current_pc) = get_pc_clipboard().await {
                if !current_pc.is_empty() && current_pc != last_pc_clipboard && current_pc != last_android_clipboard {
                    tracing::info!(serial = %serial_clone, "PC Content Changed -> Syncing to Android Clipboard");
                    let escaped = current_pc.replace("'", "'\\''");
                    
                    // Use cmd clipboard (Android 12+) or service call for true clipboard sync.
                    // This prevents the text from being automatically typed into message fields.
                    let _ = Command::new(&adb)
                        .args(["-s", &serial_clone, "shell", &format!("cmd clipboard set '{}' 2>/dev/null || service call clipboard 2 i32 1 s16 '{}' 2>/dev/null", escaped, escaped)])
                        .spawn();
                    
                    last_pc_clipboard = current_pc.clone();
                    let _ = app_handle.emit("clipboard-sync-event", &current_pc);
                }
            }

            // B. Android -> PC (Deep ADB Pull)
            // cmd clipboard get is cleaner. Fallback to service call for older versions.
            let adb_out = Command::new(&adb)
                .args(["-s", &serial_clone, "shell", "cmd clipboard get 2>/dev/null || service call clipboard 1 2>/dev/null"])
                .output()
                .await;

            if let Ok(output) = adb_out {
                let raw = String::from_utf8_lossy(&output.stdout);
                let current_android = if raw.starts_with("Result: Parcel") || raw.contains("'") {
                    raw.split("'").nth(1).map(|s| s.to_string())
                } else {
                    let trimmed = raw.trim();
                    if !trimmed.is_empty() && !trimmed.contains("error") && !trimmed.contains("Unknown service") {
                        Some(trimmed.to_string())
                    } else {
                        None
                    }
                };

                if let Some(content) = current_android {
                    if !content.is_empty() && content != last_android_clipboard && content != last_pc_clipboard {
                         tracing::info!(serial = %serial_clone, "Android Content Changed -> Updating PC history");
                         last_android_clipboard = content.clone();
                         let _ = app_handle.emit("clipboard-sync-event", content);
                    }
                }
            }
        }
        tracing::info!(serial = %serial_clone, "Sync Service stopped");
    });

    // Start a "sleep" process to keep the entry in registry
    let child = Command::new("sleep")
        .arg("infinity")
        .spawn()
        .map_err(|e| format!("Failed to start background task: {}", e))?;

    registry.clipboard_sync.insert(serial.clone(), child);

    Ok(format!("Global headless sync (Deep) started for {}", serial))
}

#[tauri::command]
pub async fn stop_clipboard_sync(
    state: tauri::State<'_, AppState>,
    serial: String,
) -> Result<String, String> {
    let mut registry = state.processes.lock().await;

    if let Some(mut child) = registry.clipboard_sync.remove(&serial) {
        let _ = child.kill().await;
        let _ = child.wait().await;
        tracing::info!(serial = %serial, "Background clipboard sync stopped");
        Ok(format!("Clipboard sync stopped for {}", serial))
    } else {
        Ok("No active clipboard sync to stop".to_string())
    }
}

#[tauri::command]
pub async fn get_clipboard_sync_status(
    state: tauri::State<'_, AppState>,
    serial: String,
) -> Result<bool, String> {
    let registry = state.processes.lock().await;
    Ok(registry.clipboard_sync.contains_key(&serial))
}
