use serde::{Deserialize, Serialize};
use std::collections::VecDeque;
use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncBufReadExt, AsyncReadExt, AsyncWriteExt, BufReader};
use tokio::process::Command;

use crate::config::{ADB_BIN, EVENT_LOGCAT_PREFIX};
use crate::state::AppState;

// ── Types ────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogcatEntry {
    pub timestamp: String,
    pub level: String,
    pub tag: String,
    pub pid: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ShellResult {
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
}

// ── Commands ─────────────────────────────────────────────────────

#[tauri::command]
pub async fn tcpip_connect(ip: String, port: String) -> Result<String, String> {
    let target = format!("{}:{}", ip, if port.is_empty() { "5555" } else { &port });
    
    let output = Command::new(ADB_BIN)
        .args(["connect", &target])
        .output()
        .await
        .map_err(|e| format!("Command failed: {}", e))?;
        
    let out = String::from_utf8_lossy(&output.stdout).to_string();
    if out.contains("connected to") || out.contains("already connected") {
        Ok(out)
    } else {
        Err(out)
    }
}

#[tauri::command]
pub async fn tcpip_disconnect(target: String) -> Result<String, String> {
    let output = Command::new(ADB_BIN)
        .args(["disconnect", &target])
        .output()
        .await
        .map_err(|e| format!("Command failed: {}", e))?;
        
    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

#[tauri::command]
pub async fn enable_tcpip(serial: String) -> Result<String, String> {
    let output = Command::new(ADB_BIN)
        .args(["-s", &serial, "tcpip", "5555"])
        .output()
        .await
        .map_err(|e| format!("Command failed: {}", e))?;
        
    let out = String::from_utf8_lossy(&output.stdout).to_string();
    if out.contains("restarting in TCP mode") || output.status.success() {
        Ok("ADB restarted in TCP mode on port 5555".into())
    } else {
        Err(out)
    }
}

#[tauri::command]
pub async fn reboot_device(serial: String, mode: String) -> Result<String, String> {
    let mut args = vec!["-s", &serial, "reboot"];
    if mode == "bootloader" || mode == "recovery" || mode == "edl" {
        args.push(&mode);
    }
    
    let output = Command::new(ADB_BIN)
        .args(&args)
        .output()
        .await
        .map_err(|e| format!("Command failed: {}", e))?;
        
    if output.status.success() {
        Ok(format!("Device rebooting into {} mode...", if mode.is_empty() { "system" } else { &mode }))
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
pub async fn shell_run(serial: String, command: String) -> Result<ShellResult, String> {
    let output = Command::new(ADB_BIN)
        .args(["-s", &serial, "shell", &command])
        .output()
        .await
        .map_err(|e| format!("Command failed: {}", e))?;
        
    Ok(ShellResult {
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        exit_code: output.status.code().unwrap_or(-1),
    })
}

#[tauri::command]
pub async fn start_logcat(
    app: AppHandle,
    state: tauri::State<'_, AppState>,
    serial: String,
) -> Result<(), String> {
    // Check if already running
    {
        let registry = state.processes.lock().await;
        if registry.logcat.contains_key(&serial) {
            return Err("Logcat already running for this device".into());
        }
    }

    // Spawn adb logcat
    let mut child = Command::new(ADB_BIN)
        .args(["-s", &serial, "logcat", "-v", "time"])
        .stdout(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn logcat: {}", e))?;

    let stdout = child.stdout.take().ok_or("Failed to capture stdout")?;

    {
        let mut registry = state.processes.lock().await;
        registry.logcat.insert(serial.clone(), child);
    }

    let app_handle = app.clone();
    let event_name = format!("{}-{}", EVENT_LOGCAT_PREFIX, serial);

    // Stream logs
    tokio::spawn(async move {
        let mut reader = BufReader::new(stdout).lines();
        
        while let Ok(Some(line)) = reader.next_line().await {
            let _ = app_handle.emit(&event_name, line);
        }
    });

    Ok(())
}

#[tauri::command]
pub async fn stop_logcat(
    state: tauri::State<'_, AppState>,
    serial: String,
) -> Result<(), String> {
    let mut registry = state.processes.lock().await;
    if let Some(mut child) = registry.logcat.remove(&serial) {
        let _ = child.kill().await;
        Ok(())
    } else {
        Err("Logcat is not running for this device".into())
    }
}

#[tauri::command]
pub async fn start_shell(
    app: AppHandle,
    state: tauri::State<'_, AppState>,
    serial: String,
) -> Result<(), String> {
    let mut registry = state.processes.lock().await;
    if registry.shell.contains_key(&serial) {
        return Ok(());
    }

    println!("Spawning interactive shell for [{}]", serial);

    let mut child = Command::new(ADB_BIN)
        .args(["-s", &serial, "shell", "-tt"])
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn shell: {}", e))?;

    let mut stdout = child.stdout.take().expect("Failed to open stdout");
    let mut stderr = child.stderr.take().expect("Failed to open stderr");
    let stdin = child.stdin.take().expect("Failed to open stdin");

    registry.shell.insert(serial.clone(), child);
    registry.shell_stdin.insert(serial.clone(), stdin);

    let app_handle_clone = app.clone();
    let serial_clone = serial.clone();
    let safe_serial = serial.replace(|c: char| !c.is_alphanumeric(), "_");
    let event_name = format!("shell-stdout-{}", safe_serial);
    let shell_history = state.shell_history.clone();

    // Stream and buffer stdout
    let event_name_clone = event_name.clone();
    tokio::spawn(async move {
        let mut buffer = [0u8; 4096];
        while let Ok(n) = stdout.read(&mut buffer).await {
            if n == 0 { break; }
            let chunk = String::from_utf8_lossy(&buffer[..n]).to_string();
            // Buffer in history
            {
                let mut history = shell_history.lock().await;
                let entry = history.entry(serial_clone.clone()).or_insert_with(|| VecDeque::with_capacity(5000));
                entry.push_back(chunk.clone());
                while entry.len() > 5000 {
                    entry.pop_front();
                }
            }
            let _ = app_handle_clone.emit(&event_name_clone, chunk);
        }
    });

    let app_handle_clone2 = app.clone();
    let event_name2 = event_name.clone();
    let shell_history2 = state.shell_history.clone();
    let serial_clone2 = serial.clone();

    // Stream and buffer stderr
    tokio::spawn(async move {
        let mut buffer = [0u8; 4096];
        while let Ok(n) = stderr.read(&mut buffer).await {
            if n == 0 { break; }
            let chunk = String::from_utf8_lossy(&buffer[..n]).to_string();
            // Buffer in history
            {
                let mut history = shell_history2.lock().await;
                let entry = history.entry(serial_clone2.clone()).or_insert_with(|| VecDeque::with_capacity(5000));
                entry.push_back(chunk.clone());
                while entry.len() > 5000 {
                    entry.pop_front();
                }
            }
            let _ = app_handle_clone2.emit(&event_name2, chunk);
        }
    });

    Ok(())
}

#[tauri::command]
pub async fn stop_shell(
    serial: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let mut registry = state.processes.lock().await;
    registry.shell_stdin.remove(&serial);
    if let Some(mut child) = registry.shell.remove(&serial) {
        let _ = child.kill().await;
    }
    Ok(())
}

#[tauri::command]
pub async fn write_to_shell(
    serial: String,
    data: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let mut registry = state.processes.lock().await;
    if let Some(stdin) = registry.shell_stdin.get_mut(&serial) {
        stdin.write_all(data.as_bytes())
            .await
            .map_err(|e| e.to_string())?;
        stdin.flush().await.map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("Shell not running".to_string())
    }
}

#[tauri::command]
pub async fn get_app_logs(
    state: tauri::State<'_, AppState>,
) -> Result<Vec<String>, String> {
    let logs = state.app_logs.lock().await;
    Ok(logs.iter().cloned().collect())
}

#[tauri::command]
pub async fn get_shell_history(
    serial: String,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<String>, String> {
    let history = state.shell_history.lock().await;
    if let Some(entry) = history.get(&serial) {
        Ok(entry.iter().cloned().collect())
    } else {
        Ok(vec![])
    }
}
