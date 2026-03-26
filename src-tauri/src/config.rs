// ── Central App Configuration ────────────────────────────────────
// All constants, default values, validation limits, and Tauri event names
// are defined here. No magic numbers or strings in command files.

use lazy_static::lazy_static;
use tokio::sync::broadcast;

lazy_static! {
    pub static ref APP_LOG_TX: broadcast::Sender<String> = broadcast::channel(1024).0;
}

// ── Binary Paths ─────────────────────────────────────────────────
pub const ADB_BIN: &str = "adb";
pub const SCRCPY_BIN: &str = "scrcpy";
pub const FFMPEG_BIN: &str = "ffmpeg";

// ── Mirror Defaults ──────────────────────────────────────────────
pub const MIRROR_DEFAULT_BITRATE_MBPS: u32 = 8;
pub const MIRROR_DEFAULT_FPS: u32 = 60;
pub const MIRROR_DEFAULT_CODEC: &str = "h265";
pub const MIRROR_MIN_BITRATE: u32 = 1;
pub const MIRROR_MAX_BITRATE: u32 = 100;
pub const MIRROR_MIN_FPS: u32 = 1;
pub const MIRROR_MAX_FPS: u32 = 120;

// ── TCP/IP ───────────────────────────────────────────────────────
pub const TCPIP_DEFAULT_PORT: u16 = 5555;
pub const TCPIP_SCAN_TIMEOUT_MS: u64 = 3_000;

// ── Monitor ──────────────────────────────────────────────────────
pub const MONITOR_POLL_INTERVAL_MS: u64 = 1_000;

// ── Logcat ───────────────────────────────────────────────────────
pub const LOGCAT_MAX_BUFFER_LINES: usize = 10_000;

// ── Shell Security ───────────────────────────────────────────────
pub const SHELL_ALLOWED_COMMANDS: &[&str] = &[
    "getprop",
    "dumpsys",
    "settings",
    "wm",
    "am",
    "pm",
    "input",
    "screencap",
    "screenrecord",
    "service",
    "cat",
    "ls",
    "top",
    "uname",
    "uptime",
    "ip",
];

pub const SHELL_FORBIDDEN_CHARS: &[char] = &[
    ';', '|', '&', '$', '`', '>', '<', '\n', '\r',
];

// ── Input Validation ─────────────────────────────────────────────
pub const DEVICE_ID_ALLOWED_CHARS: &str =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789._:-";
pub const PACKAGE_NAME_ALLOWED_CHARS: &str =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789._";

// ── Tauri Event Names ────────────────────────────────────────────
pub const EVENT_DEVICE_STATS: &str = "device:stats";
pub const EVENT_LOGCAT_PREFIX: &str = "logcat";
pub const EVENT_DEVICE_CONNECTED: &str = "device:connected";
pub const EVENT_DEVICE_DISCONNECTED: &str = "device:disconnected";
pub const EVENT_TRANSFER_PROGRESS: &str = "transfer:progress";
pub const EVENT_LOG: &str = "log";
pub const EVENT_PROCESS_EXIT: &str = "process:exit";

// ── Event Helpers ────────────────────────────────────────────────
pub fn logcat_event(device_id: &str) -> String {
    format!("{}:{}", EVENT_LOGCAT_PREFIX, device_id)
}

pub fn device_stats_event(device_id: &str) -> String {
    format!("{}:{}", EVENT_DEVICE_STATS, device_id)
}

// ── Logging ──────────────────────────────────────────────────────
pub const LOG_FILTER_DEV: &str = "scrcpygui_pro=debug,scrcpygui_pro_lib=debug";
pub const LOG_FILTER_PROD: &str = "scrcpygui_pro=info,scrcpygui_pro_lib=info";
