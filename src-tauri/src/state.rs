use std::collections::{HashMap, VecDeque};
use std::sync::Arc;
use tokio::process::Child;
use tokio::sync::Mutex;
use tokio::task::JoinHandle;

#[derive(Default)]
pub struct ProcessRegistry {
    pub mirror: HashMap<String, Child>,
    pub logcat: HashMap<String, Child>,
    pub livestream: HashMap<String, Child>,
    pub camera: HashMap<String, Child>,
    pub monitor: HashMap<String, JoinHandle<()>>,
    pub shell: HashMap<String, Child>,
    pub shell_stdin: HashMap<String, tokio::process::ChildStdin>,
    pub clipboard_sync: HashMap<String, Child>,
}

/// Global application state managed by Tauri.
pub struct AppState {
    pub processes: Arc<Mutex<ProcessRegistry>>,
    pub shell_history: Arc<Mutex<HashMap<String, VecDeque<String>>>>,
    pub app_logs: Arc<Mutex<VecDeque<String>>>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            processes: Arc::new(Mutex::new(ProcessRegistry::default())),
            shell_history: Arc::new(Mutex::new(HashMap::new())),
            app_logs: Arc::new(Mutex::new(VecDeque::with_capacity(1000))),
        }
    }
}
