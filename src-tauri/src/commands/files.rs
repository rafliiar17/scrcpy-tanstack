use serde::Serialize;
use tokio::process::Command;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use tauri::Emitter;
use crate::config::get_adb_path;

// ── Types ────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize)]
pub struct FileInfo {
    pub name: String,
    pub size: u64,
    pub is_dir: bool,
    pub modified: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct PullProgress {
    pub download_id: String,
    pub percent: u32,
    pub speed: String,
    pub bytes_transferred: u64,
    pub done: bool,
    pub success: bool,
    pub error: String,
}

// Global map to track active pull child processes for cancellation
lazy_static::lazy_static! {
    static ref ACTIVE_PULLS: Arc<Mutex<HashMap<String, u32>>> = Arc::new(Mutex::new(HashMap::new()));
}

// ── Helpers ──────────────────────────────────────────────────────

fn expand_tilde(path: &str) -> String {
    if let Some(stripped) = path.strip_prefix("~/") {
        if let Some(home) = std::env::var("HOME").ok().or_else(|| dirs::home_dir().map(|p| p.to_string_lossy().to_string())) {
            return format!("{}/{}", home, stripped);
        }
    }
    path.to_string()
}

async fn run_adb_shell(adb: &std::path::Path, serial: &str, cmd: &str) -> String {
    let output = Command::new(adb)
        .args(["-s", serial, "shell", cmd])
        .output()
        .await
        .ok();
    
    if let Some(out) = output {
        String::from_utf8_lossy(&out.stdout).to_string()
    } else {
        String::new()
    }
}

fn parse_ls_output(stdout: &str) -> Vec<FileInfo> {
    let mut files = Vec::new();
    
    // Android `ls -lLA` format is generally:
    // drwxrwx--x 23 system system     4096 2023-10-10 10:00 sdcard
    for line in stdout.lines() {
        let line = line.trim();
        if line.is_empty() || line.starts_with("total ") { continue; }
        
        let parts: Vec<&str> = line.split_whitespace().collect();
        // Typically length is 7 or 8 depending on the timestamp format
        if parts.len() >= 6 {
            let is_dir = parts[0].starts_with('d');
            let is_link = parts[0].starts_with('l');
            
            // Better heuristic: find the first part that looks like a date (e.g. 2023-10-10 or Oct 10)
            let mut size: u64 = 0;
            let mut name_idx = 0;
            
            for (i, p) in parts.iter().enumerate() {
                if i > 2 && p.contains('-') && p.len() >= 8 {
                    // Looks like YYYY-MM-DD
                    if let Ok(s) = parts[i-1].parse::<u64>() {
                        size = s;
                    }
                    name_idx = i + 2; // Date at i, Time at i+1, Name starts at i+2
                    break;
                }
            }
            
            if name_idx == 0 || name_idx >= parts.len() {
                // Fallback for different output syntaxes
                size = parts.get(4).unwrap_or(&"0").parse().unwrap_or(0);
                name_idx = 7.min(parts.len() - 1);
            }
            
            let name_parts: Vec<&str> = parts[name_idx..].to_vec();
            let mut name = name_parts.join(" ");
            
            // Handle symlinks (e.g. "sdcard -> /storage/emulated/0")
            if is_link && name.contains(" -> ") {
                if let Some(real_name) = name.split(" -> ").next() {
                    name = real_name.to_string();
                }
            }
            
            // Skip '.' and '..'
            if name == "." || name == ".." { continue; }
            
            let modified = if name_idx >= 2 {
                format!("{} {}", parts[name_idx-2], parts[name_idx-1])
            } else {
                String::new()
            };
            
            files.push(FileInfo {
                name,
                size,
                is_dir: is_dir || is_link, // Treat links as dirs for navigation mostly
                modified,
            });
        }
    }
    
    // Sort directories first, then alphabetically
    files.sort_by(|a, b| {
        if a.is_dir && !b.is_dir { std::cmp::Ordering::Less }
        else if !a.is_dir && b.is_dir { std::cmp::Ordering::Greater }
        else { a.name.to_lowercase().cmp(&b.name.to_lowercase()) }
    });

    files
}

// ── Commands ─────────────────────────────────────────────────────

#[tauri::command]
pub async fn list_files(handle: tauri::AppHandle, serial: String, path: String) -> Result<Vec<FileInfo>, String> {
    if serial.is_empty() { return Err("No device selected".into()); }
    let safe_path = if path.is_empty() { "/" } else { &path };
    
    let adb = get_adb_path(&handle);
    let cmd = format!("ls -lLA \"{}\"", safe_path.replace('"', "\\\""));
    let stdout = run_adb_shell(&adb, &serial, &cmd).await;
    
    if stdout.contains("No such file or directory") || stdout.contains("Permission denied") {
        return Err(format!("Cannot access {}: Permission denied or not found", safe_path));
    }

    Ok(parse_ls_output(&stdout))
}

#[tauri::command]
pub async fn pull_file(
    app: tauri::AppHandle,
    serial: String,
    remote: String,
    local: String,
    total_size: u64,
    download_id: Option<String>,
) -> Result<String, String> {
    let expanded_local = expand_tilde(&local);

    // Ensure parent directory exists
    if let Some(parent) = std::path::Path::new(&expanded_local).parent() {
        let _ = std::fs::create_dir_all(parent);
    }

    let dl_id = download_id.unwrap_or_default();
    let adb = get_adb_path(&app);

    let mut child = Command::new(&adb)
        .args(["-s", &serial, "pull", &remote, &expanded_local])
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("ADB pull failed to spawn: {}", e))?;

    // Store PID for cancellation
    if !dl_id.is_empty() {
        if let Some(pid) = child.id() {
            ACTIVE_PULLS.lock().await.insert(dl_id.clone(), pid);
        }
    }

    // Read stderr for progress (adb pull outputs progress lines to stderr)
    let dl_id_clone_poll = dl_id.clone();
    let app_clone_poll = app.clone();
    let local_path_poll = expanded_local.clone();
    let total_size_poll = total_size;

    let polling_task = tokio::spawn(async move {
        if dl_id_clone_poll.is_empty() { return; }
        
        let mut last_size = 0;
        let mut last_time = std::time::Instant::now();
        
        loop {
            tokio::time::sleep(std::time::Duration::from_millis(500)).await;
            
            if let Ok(metadata) = std::fs::metadata(&local_path_poll) {
                let current_size = metadata.len();
                if current_size != last_size {
                    let now = std::time::Instant::now();
                    let elapsed = now.duration_since(last_time).as_secs_f64();
                    
                    let percent = if total_size_poll > 0 {
                        ((current_size as f64 / total_size_poll as f64) * 100.0) as u32
                    } else {
                        0
                    };
                    
                    let speed_bps = if elapsed > 0.0 {
                        (current_size - last_size) as f64 / elapsed
                    } else {
                        0.0
                    };
                    
                    let speed_str = if speed_bps > 1024.0 * 1024.0 {
                        format!("{:.1} MB/s", speed_bps / (1024.0 * 1024.0))
                    } else if speed_bps > 1024.0 {
                        format!("{:.1} KB/s", speed_bps / 1024.0)
                    } else {
                        format!("{:.0} B/s", speed_bps)
                    };

                    let _ = app_clone_poll.emit("pull-progress", PullProgress {
                        download_id: dl_id_clone_poll.clone(),
                        percent: percent.min(99), // Keep at 99% until adb finishes
                        speed: speed_str,
                        bytes_transferred: current_size,
                        done: false,
                        success: false,
                        error: String::new(),
                    });
                    
                    last_size = current_size;
                    last_time = now;
                }
            } else {
                // File might not exist yet if adb just started
            }
        }
    });

    let status = child.wait().await.map_err(|e| format!("ADB pull wait error: {}", e))?;
    polling_task.abort();

    // Cleanup PID
    if !dl_id.is_empty() {
        ACTIVE_PULLS.lock().await.remove(&dl_id);
    }


    if status.success() {
        // Emit final done event
        if !dl_id.is_empty() {
            let _ = app.emit("pull-progress", PullProgress {
                download_id: dl_id,
                percent: 100,
                speed: String::new(),
                bytes_transferred: 0, // Frontend will use total size
                done: true,
                success: true,
                error: String::new(),
            });
        }
        Ok("Download complete".into())
    } else {
        let err_msg = "Download failed".to_string();
        if !dl_id.is_empty() {
            let _ = app.emit("pull-progress", PullProgress {
                download_id: dl_id,
                percent: 0,
                speed: String::new(),
                bytes_transferred: 0,
                done: true,
                success: false,
                error: err_msg.clone(),
            });
        }
        Err(err_msg)
    }
}

#[tauri::command]
pub async fn cancel_pull(download_id: String) -> Result<String, String> {
    let map = ACTIVE_PULLS.lock().await;
    if let Some(pid) = map.get(&download_id) {
        // Kill the adb process
        let _ = Command::new("kill")
            .args(["-9", &pid.to_string()])
            .output()
            .await;
        drop(map);
        ACTIVE_PULLS.lock().await.remove(&download_id);
        Ok("Cancelled".into())
    } else {
        Err("Download not found or already completed".into())
    }
}

#[tauri::command]
pub async fn push_file(handle: tauri::AppHandle, serial: String, local: String, remote: String) -> Result<String, String> {
    let adb = get_adb_path(&handle);
    let output = Command::new(&adb)
        .args(["-s", &serial, "push", &local, &remote])
        .output()
        .await
        .map_err(|e| format!("ADB push failed: {}", e))?;

    if output.status.success() {
        Ok("Upload complete".into())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
pub async fn delete_file(handle: tauri::AppHandle, serial: String, path: String) -> Result<String, String> {
    let adb = get_adb_path(&handle);
    let cmd = format!("rm -rf \"{}\"", path.replace('"', "\\\""));
    let output = Command::new(&adb)
        .args(["-s", &serial, "shell", &cmd])
        .output()
        .await
        .map_err(|e| format!("Delete failed: {}", e))?;
        
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    if output.status.success() && stderr.is_empty() {
        Ok("Deleted successfully".into())
    } else {
        Err(format!("Delete failed: {}", stderr))
    }
}

#[tauri::command]
pub async fn create_directory(handle: tauri::AppHandle, serial: String, path: String) -> Result<String, String> {
    let adb = get_adb_path(&handle);
    let cmd = format!("mkdir -p \"{}\"", path.replace('"', "\\\""));
    let output = Command::new(&adb)
        .args(["-s", &serial, "shell", &cmd])
        .output()
        .await
        .map_err(|e| format!("Mkdir failed: {}", e))?;
        
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    if output.status.success() && stderr.is_empty() {
        Ok("Directory created".into())
    } else {
        Err(format!("Mkdir failed: {}", stderr))
    }
}
