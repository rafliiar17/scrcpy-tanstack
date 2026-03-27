// ── Central Frontend Configuration ──────────────────────────────
// All defaults, constraints, event names, query timings, and UI constants.
// No magic numbers or strings in components or hooks.

// ── Types ────────────────────────────────────────────────────────

export interface DeviceInfo {
  serial: string;
  model: string;
  status: string;
  connection_type: string;
}

export interface DeviceDetails {
  model: string;
  manufacturer: string;
  android_version: string;
  sdk_version: string;
  resolution: string;
  battery: string;
}

export interface MirrorOptions {
  device: string;
  bitrate: number;
  max_fps: number;
  resolution: string;
  codec: string;
  rotation: string;
  no_audio: boolean;
  fullscreen: boolean;
  borderless: boolean;
  always_on_top: boolean;
  stay_awake: boolean;
  turn_screen_off: boolean;
  no_control: boolean;
  sync_clipboard: boolean;
  window_title: string;
  custom_args: string;
  audio_source: string;
  audio_bit_rate?: number;
  audio_codec?: string;
  video_source?: "display" | "camera";
  camera_id?: string;
  camera_facing?: string;
  camera_size?: string;
}

export interface CameraInfo {
  id: string;
  facing: string;
  size: string;
}

export interface MirrorStatus {
  running: boolean;
  device: string;
  pid: number | null;
}

export interface AppInfo {
  package: string;
  is_system: boolean;
}

export interface FileInfo {
  name: string;
  size: number;
  is_dir: boolean;
  modified: string;
}

export interface ShellResult {
  stdout: string;
  stderr: string;
  exit_code: number;
}

import appConfig from "../../app.json";

// ── App Metadata ─────────────────────────────────────────────────

export const APP_NAME = appConfig.productName;
export const APP_VERSION = appConfig.version;

// ── Mirror ───────────────────────────────────────────────────────

export const MIRROR_DEFAULTS = {
  bitrate: 8,
  fps: 60,
  codec: "h265" as const,
  fullscreen: false,
  alwaysOnTop: false,
  stayAwake: true,
  screenOff: false,
  audio: true,
  clipboard: true,
} as const;

export const MIRROR_CONSTRAINTS = {
  bitrate: { min: 1, max: 100 },
  fps: { min: 1, max: 120 },
  codecs: ["h264", "h265", "av1"] as const,
} as const;

// ── Livestream ───────────────────────────────────────────────────

export const LIVESTREAM_DEFAULTS = {
  platform: "YouTube",
  bitrate: "3000k",
  resolution: "1280x720",
  fps: "60",
} as const;

export const LIVESTREAM_PLATFORMS = ["YouTube", "Custom"] as const;

// ── Camera ───────────────────────────────────────────────────────

export const CAMERA_DEFAULTS = {
  facing: "auto",
  size: "auto",
  fps: "auto",
  bitrate: "auto",
  rotation: "0",
} as const;

export const CAMERA_SENSORS = [
  { value: "auto", label: "Auto" },
  { value: "back", label: "Back Camera" },
  { value: "front", label: "Front Camera" },
  { value: "external", label: "External / OTG" },
] as const;

export const CAMERA_RESOLUTIONS = [
  { value: "auto", label: "Auto" },
  { value: "1920x1080", label: "1920×1080" },
  { value: "1280x720", label: "1280×720" },
  { value: "640x480", label: "640×480" },
] as const;

export const CAMERA_FPS = [
  { value: "auto", label: "Auto" },
  { value: "60", label: "60 FPS" },
  { value: "30", label: "30 FPS" },
  { value: "15", label: "15 FPS" },
] as const;

export const CAMERA_BITRATES = [
  { value: "auto", label: "Auto" },
  { value: "64M", label: "64 Mbps" },
  { value: "32M", label: "32 Mbps" },
  { value: "24M", label: "24 Mbps" },
  { value: "20M", label: "20 Mbps" },
  { value: "16M", label: "16 Mbps" },
  { value: "12M", label: "12 Mbps" },
  { value: "8M", label: "8 Mbps" },
  { value: "4M", label: "4 Mbps" },
  { value: "2M", label: "2 Mbps" },
] as const;

export const CAMERA_ROTATIONS = [
  { value: "0", label: "0°" },
  { value: "90", label: "90°" },
  { value: "180", label: "180°" },
  { value: "270", label: "270°" },
] as const;

// ── TCP/IP ───────────────────────────────────────────────────────

export const TCPIP_DEFAULT_PORT = 5555;
export const TCPIP_SCAN_TIMEOUT_MS = 3_000;

// ── Logcat ───────────────────────────────────────────────────────

export const LOGCAT_MAX_LINES = 10_000;
export const LOGCAT_VIRTUAL_ITEM_HEIGHT = 20;

// ── TanStack Query Timings ───────────────────────────────────────

export const QUERY_STALE_TIME = {
  devices: 5_000,
  packages: 30_000,
  files: 15_000,
  deviceInfo: 10_000,
} as const;

export const QUERY_RETRY = 2;
export const QUERY_RETRY_DELAY_MS = 1_000;

// ── Tauri Events (must match Rust config.rs) ─────────────────────

export const TAURI_EVENTS = {
  deviceStats: "device:stats",
  logcatPrefix: "logcat",
  deviceConnected: "device:connected",
  deviceDisconnected: "device:disconnected",
  transferProgress: "transfer:progress",
  log: "log",
  processExit: "process:exit",
} as const;

export function logcatEvent(deviceId: string): string {
  return `${TAURI_EVENTS.logcatPrefix}:${deviceId}`;
}

export function deviceStatsEvent(deviceId: string): string {
  return `${TAURI_EVENTS.deviceStats}:${deviceId}`;
}

// ── Monitor ──────────────────────────────────────────────────────

export const MONITOR_CHART_MAX_POINTS = 60;

// ── UI / Sidebar-08 ──────────────────────────────────────────────

export const UI = {
  sidebarWidth: 220,
  sidebarCollapsedWidth: 48,
  toastDuration: 4_000,
  confirmDialogDelay: 300,
  tablePageSize: 50,
} as const;

// ── Keyboard Shortcuts ───────────────────────────────────────────

export const SHORTCUTS = {
  toggleMirror: { key: "Enter", ctrl: true },
  saveSettings: { key: "s", ctrl: true },
  toggleSidebar: { key: "b", ctrl: true },
} as const;

// ── Files ────────────────────────────────────────────────────────

export const FILES = {
  defaultRemotePath: "/sdcard/",
  allowedApkExtension: ".apk",
} as const;
