import { invoke } from "@tauri-apps/api/core";
import type { DeviceInfo, DeviceDetails, MirrorOptions, MirrorStatus, AppInfo, FileInfo, ShellResult, CameraInfo, MiUnlockSession, FastbootDeviceInfo, UnlockResult } from "./config";

/**
 * Typed API object — single entry point for all Tauri command invocations.
 * No direct invoke() calls in components or hooks.
 */
export const api = {
  // ── Device ──────────────────────────────────────────────────────
  listDevices: () => invoke<DeviceInfo[]>("list_devices"),

  getDeviceInfo: (serial: string) =>
    invoke<DeviceDetails>("get_device_info", { serial }),

  // ── Mirror ──────────────────────────────────────────────────────
  buildScrcpyCommand: (opts: MirrorOptions) =>
    invoke<string[]>("build_scrcpy_command", { opts }),

  startMirror: (opts: MirrorOptions) =>
    invoke<MirrorStatus>("start_mirror", { opts }),

  stopMirror: (serial: string) =>
    invoke<MirrorStatus>("stop_mirror", { serial }),

  getMirrorStatus: (serial: string) =>
    invoke<MirrorStatus>("get_mirror_status", { serial }),

  startVirtualDisplay: (serial: string, pkg: string, resolution: string) =>
    invoke<string>("start_virtual_display", {
      serial,
      package: pkg,
      resolution,
    }),

  listCameras: (args: { serial: string }) =>
    invoke<CameraInfo[]>("list_cameras", args),

  // ── Apps ────────────────────────────────────────────────────────
  listPackages: (serial: string) =>
    invoke<AppInfo[]>("list_packages", { serial }),

  installApk: (serial: string, path: string) =>
    invoke<string>("install_apk", { serial, path }),

  uninstallApp: (serial: string, pkg: string) =>
    invoke<string>("uninstall_app", { serial, package: pkg }),

  clearAppData: (serial: string, pkg: string) =>
    invoke<string>("clear_app_data", { serial, package: pkg }),

  forceStopApp: (serial: string, pkg: string) =>
    invoke<string>("force_stop_app", { serial, package: pkg }),

  launchApp: (serial: string, pkg: string) =>
    invoke<string>("launch_app", { serial, package: pkg }),

  // ── Files ───────────────────────────────────────────────────────
  listFiles: (serial: string, path: string) =>
    invoke<FileInfo[]>("list_files", { serial, path }),

  pullFile: (serial: string, remote: string, local: string, totalSize: number, downloadId?: string) =>
    invoke<string>("pull_file", { serial, remote, local, totalSize, downloadId }),

  cancelPull: (downloadId: string) =>
    invoke<string>("cancel_pull", { downloadId }),

  pushFile: (serial: string, local: string, remote: string) =>
    invoke<string>("push_file", { serial, local, remote }),

  deleteFile: (serial: string, path: string) =>
    invoke<string>("delete_file", { serial, path }),

  createDirectory: (serial: string, path: string) =>
    invoke<string>("create_directory", { serial, path }),

  // ── System ──────────────────────────────────────────────────────
  tcpipConnect: (ip: string, port: string) =>
    invoke<string>("tcpip_connect", { ip, port }),

  tcpipDisconnect: (target: string) =>
    invoke<string>("tcpip_disconnect", { target }),

  enableTcpip: (serial: string) =>
    invoke<string>("enable_tcpip", { serial }),

  adbPair: (ip: string, port: string, code: string) =>
    invoke<string>("adb_pair", { ip, port, code }),

  adbMdnsDiscover: () =>
    invoke<{ name: string; service_type: string; address: string }[]>("adb_mdns_discover"),

  setAdbServer: (host: string, port: string) =>
    invoke<string>("set_adb_server", { host, port }),

  getAdbServer: () =>
    invoke<[string, string]>("get_adb_server"),

  rebootDevice: (serial: string, mode: string) =>
    invoke<string>("reboot_device", { serial, mode }),

  shellRun: (serial: string, command: string) =>
    invoke<ShellResult>("shell_run", { serial, command }),

  startLogcat: (serial: string) =>
    invoke<void>("start_logcat", { serial }),
  
  stopLogcat: (serial: string) =>
    invoke<void>("stop_logcat", { serial }),

  startShell: (serial: string) =>
    invoke<void>("start_shell", { serial }),

  stopShell: (serial: string) =>
    invoke<void>("stop_shell", { serial }),

  writeToShell: (serial: string, data: string) =>
    invoke<void>("write_to_shell", { serial, data }),

  getAppLogs: () =>
    invoke<string[]>("get_app_logs"),

  getShellHistory: (serial: string) =>
    invoke<string[]>("get_shell_history", { serial }),

  // ── Clipboard ──────────────────────────────────────────────────
  startClipboardSync: (serial: string) =>
    invoke<string>("start_clipboard_sync", { serial }),

  stopClipboardSync: (serial: string) =>
    invoke<string>("stop_clipboard_sync", { serial }),

  getClipboardSyncStatus: (serial: string) =>
    invoke<boolean>("get_clipboard_sync_status", { serial }),

  // ── Drivers ────────────────────────────────────────────────────
  checkAdbDrivers: () =>
    invoke<{ found_problem: boolean; message: string; devices: string[] }>("check_adb_drivers"),

  installAdbDrivers: () =>
    invoke<string>("install_adb_drivers"),

  getAdbStatus: () =>
    invoke<{ found: boolean; path: string; os: string; distro: string | null; bundled: boolean }>("get_adb_status"),

  downloadPlatformTools: () =>
    invoke<string>("download_platform_tools"),

  // ── Mi Unlock ──────────────────────────────────────────────────
  getFastbootDeviceInfo: () =>
    invoke<FastbootDeviceInfo>("get_fastboot_device_info"),

  execMiUnlock: (session: MiUnlockSession, product: string, token: string, region: string) =>
    invoke<UnlockResult>("exec_mi_unlock", { session, product, token, region }),

  fastbootUnlock: (encryptDataHex: string) =>
    invoke<string>("fastboot_unlock", { encrypt_data_hex: encryptDataHex }),

  openMiLogin: () =>
    invoke<void>("open_mi_login"),
};
