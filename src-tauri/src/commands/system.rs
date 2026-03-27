use serde::{Deserialize, Serialize};
use std::collections::VecDeque;
use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncBufReadExt, AsyncReadExt, AsyncWriteExt, BufReader};
use tokio::process::Command;

use crate::config::{get_adb_path, EVENT_LOGCAT_PREFIX};
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
pub async fn tcpip_connect(handle: tauri::AppHandle, ip: String, port: String) -> Result<String, String> {
    let adb = get_adb_path(&handle);
    let target = format!("{}:{}", ip, if port.is_empty() { "5555" } else { &port });
    
    let output = Command::new(&adb)
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
pub async fn tcpip_disconnect(handle: tauri::AppHandle, target: String) -> Result<String, String> {
    let adb = get_adb_path(&handle);
    let output = Command::new(&adb)
        .args(["disconnect", &target])
        .output()
        .await
        .map_err(|e| format!("Command failed: {}", e))?;
        
    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

#[tauri::command]
pub async fn enable_tcpip(handle: tauri::AppHandle, serial: String) -> Result<String, String> {
    let adb = get_adb_path(&handle);
    let output = Command::new(&adb)
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

// ── Zero-Config Wireless ADB ────────────────────────────────────

#[derive(Debug, Clone, Serialize)]
pub struct MdnsDevice {
    pub name: String,
    pub service_type: String,
    pub address: String,
}

#[tauri::command]
pub async fn adb_pair(handle: tauri::AppHandle, ip: String, port: String, code: String) -> Result<String, String> {
    let adb = get_adb_path(&handle);
    let target = format!("{}:{}", ip, port);

    let mut child = std::process::Command::new(&adb)
        .args(["pair", &target])
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start adb pair: {}", e))?;

    // Write the pairing code to stdin
    if let Some(mut stdin) = child.stdin.take() {
        use std::io::Write;
        let _ = writeln!(stdin, "{}", code);
    }

    let output = child
        .wait_with_output()
        .map_err(|e| format!("Failed to wait for adb pair: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    let combined = format!("{}{}", stdout, stderr);

    if combined.contains("Successfully paired") {
        Ok(combined.trim().to_string())
    } else {
        Err(combined.trim().to_string())
    }
}

#[tauri::command]
pub async fn adb_mdns_discover(handle: tauri::AppHandle) -> Result<Vec<MdnsDevice>, String> {
    let adb = get_adb_path(&handle);
    // `adb mdns services` lists discovered services
    let output = Command::new(&adb)
        .args(["mdns", "services"])
        .output()
        .await
        .map_err(|e| format!("Failed to run adb mdns: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let mut devices = Vec::new();

    for line in stdout.lines() {
        let line = line.trim();
        if line.is_empty() || line.starts_with("List of") {
            continue;
        }
        // Format: "service_name\t_adb-tls-pairing._tcp.\t192.168.1.5:38753"
        let parts: Vec<&str> = line.split('\t').collect();
        if parts.len() >= 3 {
            devices.push(MdnsDevice {
                name: parts[0].trim().to_string(),
                service_type: parts[1].trim().to_string(),
                address: parts[2].trim().to_string(),
            });
        }
    }

    Ok(devices)
}

// ── ADB Proxy / Server ──────────────────────────────────────────

#[tauri::command]
pub async fn set_adb_server(handle: tauri::AppHandle, host: String, port: String) -> Result<String, String> {
    let adb = get_adb_path(&handle);
    if host.is_empty() {
        // Reset to local
        std::env::remove_var("ANDROID_ADB_SERVER_ADDRESS");
        std::env::remove_var("ANDROID_ADB_SERVER_PORT");
        // Kill and restart local server
        let _ = Command::new(&adb).args(["kill-server"]).output().await;
        let _ = Command::new(&adb).args(["start-server"]).output().await;
        Ok("Reset to local ADB server".into())
    } else {
        std::env::set_var("ANDROID_ADB_SERVER_ADDRESS", &host);
        std::env::set_var("ANDROID_ADB_SERVER_PORT", if port.is_empty() { "5037" } else { &port });
        // Restart server with new config
        let _ = Command::new(&adb).args(["kill-server"]).output().await;
        let _ = Command::new(&adb).args(["start-server"]).output().await;
        Ok(format!("ADB server set to {}:{}", host, if port.is_empty() { "5037" } else { &port }))
    }
}

#[tauri::command]
pub async fn get_adb_server() -> Result<(String, String), String> {
    let host = std::env::var("ANDROID_ADB_SERVER_ADDRESS").unwrap_or_default();
    let port = std::env::var("ANDROID_ADB_SERVER_PORT").unwrap_or_else(|_| "5037".into());
    Ok((host, port))
}

#[tauri::command]
pub async fn reboot_device(handle: tauri::AppHandle, serial: String, mode: String) -> Result<String, String> {
    let adb = get_adb_path(&handle);
    let mut args = vec!["-s", &serial, "reboot"];
    if mode == "bootloader" || mode == "recovery" || mode == "edl" {
        args.push(&mode);
    }
    
    let output = Command::new(&adb)
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
pub async fn shell_run(handle: tauri::AppHandle, serial: String, command: String) -> Result<ShellResult, String> {
    let adb = get_adb_path(&handle);
    let output = Command::new(&adb)
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
    let adb = get_adb_path(&app);
    let mut child = Command::new(&adb)
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
    if let Some(child) = registry.shell.get_mut(&serial) {
        if let Ok(None) = child.try_wait() {
            return Ok(());
        } else {
            registry.shell.remove(&serial);
            registry.shell_stdin.remove(&serial);
        }
    }

    println!("Spawning interactive shell for [{}]", serial);
    let adb = get_adb_path(&app);

    let mut child = Command::new(&adb)
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
#[derive(Debug, Clone, Serialize)]
pub struct DriverCheckResult {
    pub found_problem: bool,
    pub message: String,
    pub devices: Vec<String>,
}

#[tauri::command]
pub async fn check_adb_drivers() -> Result<DriverCheckResult, String> {
    #[cfg(target_os = "windows")]
    {
        // PowerShell script to find problematic USB devices related to Android
        // We look for "ADB", "Android", or common VIDs (Google=18D1, Samsung=04E8, etc.)
        let script = r#"
            Get-PnpDevice -PresentOnly | 
            Where-Object { 
                ($_.InstanceId -match 'VID_18D1' -or $_.InstanceId -match 'VID_04E8' -or $_.FriendlyName -match 'ADB' -or $_.FriendlyName -match 'Android') -and 
                ($_.Status -ne 'OK' -or $_.ConfigManagerErrorCode -ne 0) 
            } | 
            Select-Object -ExpandProperty FriendlyName
        "#;

        let output = Command::new("powershell")
            .args(["-Command", script])
            .output()
            .await
            .map_err(|e| format!("Failed to run PowerShell: {}", e))?;

        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
        let devices: Vec<String> = stdout.lines()
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect();

        if devices.is_empty() {
            Ok(DriverCheckResult {
                found_problem: false,
                message: "No driver issues detected via PnP scan.".into(),
                devices: vec![],
            })
        } else {
            Ok(DriverCheckResult {
                found_problem: true,
                message: format!("Detected {} device(s) with missing or faulty drivers.", devices.len()),
                devices,
            })
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        Ok(DriverCheckResult {
            found_problem: false,
            message: "Driver check is only applicable to Windows systems.".into(),
            devices: vec![],
        })
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct AdbStatus {
    pub found: bool,
    pub path: String,
    pub os: String,
    pub distro: Option<String>,
    pub bundled: bool,
}

#[tauri::command]
pub async fn get_adb_status(handle: tauri::AppHandle) -> Result<AdbStatus, String> {
    use tauri::Manager;
    let adb = get_adb_path(&handle);
    let adb_str = adb.to_string_lossy().to_string();
    
    // Check if it actually works
    let found = Command::new(&adb).arg("version").output().await.is_ok();
    
    let os = std::env::consts::OS.to_string();
    let mut distro = None;

    // Check if bundled
    let resource_dir = handle.path().resource_dir().unwrap_or_default();
    let bundled = adb.starts_with(resource_dir);

    #[cfg(target_os = "linux")]
    {
        if let Ok(content) = std::fs::read_to_string("/etc/os-release") {
            if content.to_lowercase().contains("ubuntu") || content.to_lowercase().contains("debian") {
                distro = Some("debian".into());
            } else if content.to_lowercase().contains("arch") {
                distro = Some("arch".into());
            } else if content.to_lowercase().contains("fedora") {
                distro = Some("fedora".into());
            }
        }
    }

    Ok(AdbStatus {
        found,
        path: adb_str,
        os,
        distro,
        bundled,
    })
}

#[tauri::command]
pub async fn download_platform_tools(_handle: tauri::AppHandle) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        use tauri::Manager;
        let url = "https://dl.google.com/android/repository/platform-tools-latest-windows.zip";
        let local_bin = handle.path().app_local_data_dir().unwrap_or_default().join("bin");
        std::fs::create_dir_all(&local_bin).map_err(|e| e.to_string())?;

        let zip_path = local_bin.join("platform-tools.zip");
        
        // Download
        let response = reqwest::get(url).await.map_err(|e| format!("Download failed: {}", e))?;
        let bytes = response.bytes().await.map_err(|e| format!("Failed to read bytes: {}", e))?;
        std::fs::write(&zip_path, &bytes).map_err(|e| format!("Failed to save zip: {}", e))?;

        // Extract
        let file = std::fs::File::open(&zip_path).map_err(|e| e.to_string())?;
        let mut archive = zip::ZipArchive::new(file).map_err(|e| e.to_string())?;
        
        for i in 0..archive.len() {
            let mut file = archive.by_index(i).map_err(|e| e.to_string())?;
            let outpath = match file.enclosed_name() {
                Some(path) => local_bin.join(path),
                None => continue,
            };

            if (*file.name()).ends_with('/') {
                std::fs::create_dir_all(&outpath).unwrap();
            } else {
                if let Some(p) = outpath.parent() {
                    if !p.exists() {
                        std::fs::create_dir_all(p).unwrap();
                    }
                }
                let mut outfile = std::fs::File::create(&outpath).unwrap();
                std::io::copy(&mut file, &mut outfile).unwrap();
            }
        }

        // Cleanup
        let _ = std::fs::remove_file(zip_path);
        
        Ok("ADB Platform Tools downloaded and setup successfully.".into())
    }

    #[cfg(not(target_os = "windows"))]
    {
        Err("Automated download is currently only supported on Windows.".into())
    }
}
