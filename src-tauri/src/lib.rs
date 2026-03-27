pub mod commands;
pub mod config;
pub mod error;
pub mod state;

use state::AppState;
use tauri::{Emitter, Manager};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState::default())
        .setup(|app| {
            let app_handle_clone = app.handle().clone();
            let state = app.state::<AppState>();
            let app_logs = state.app_logs.clone();

            tauri::async_runtime::spawn(async move {
                let mut rx = config::APP_LOG_TX.subscribe();
                while let Ok(msg) = rx.recv().await {
                    // Buffer log in state
                    {
                        let mut logs_guard = app_logs.lock().await;
                        let logs = &mut *logs_guard;
                        if logs.len() >= 1000 {
                            logs.pop_front();
                        }
                        logs.push_back(msg.clone());
                    }
                    // Emit to frontend
                    let _ = app_handle_clone.emit(config::EVENT_LOG, msg.clone());
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Device
            commands::device::list_devices,
            commands::device::get_device_info,
            // Mirror
            commands::mirror::build_scrcpy_command,
            commands::mirror::start_mirror,
            commands::mirror::stop_mirror,
            commands::mirror::get_mirror_status,
            commands::mirror::start_virtual_display,
            commands::mirror::list_cameras,
            // Apps
            commands::apps::list_packages,
            commands::apps::install_apk,
            commands::apps::uninstall_app,
            commands::apps::clear_app_data,
            commands::apps::force_stop_app,
            commands::apps::launch_app,
            // Files
            commands::files::list_files,
            commands::files::pull_file,
            commands::files::cancel_pull,
            commands::files::push_file,
            commands::files::delete_file,
            commands::files::create_directory,
            // System
            commands::system::tcpip_connect,
            commands::system::tcpip_disconnect,
            commands::system::enable_tcpip,
            commands::system::adb_pair,
            commands::system::adb_mdns_discover,
            commands::system::set_adb_server,
            commands::system::get_adb_server,
            commands::system::reboot_device,
            commands::system::shell_run,
            commands::system::start_logcat,
            commands::system::stop_logcat,
            commands::system::start_shell,
            commands::system::stop_shell,
            commands::system::write_to_shell,
            commands::system::get_app_logs,
            commands::system::get_shell_history,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
