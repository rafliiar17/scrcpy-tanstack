// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

struct TauriEventLayer;

impl<S: tracing::Subscriber> tracing_subscriber::Layer<S> for TauriEventLayer {
    fn on_event(
        &self,
        event: &tracing::Event<'_>,
        _ctx: tracing_subscriber::layer::Context<'_, S>,
    ) {
        let mut visitor = StringVisitor::new();
        event.record(&mut visitor);
        let msg = format!("[{}] {}", event.metadata().level(), visitor.0);
        let _ = scrcpygui_pro_lib::config::APP_LOG_TX.send(msg);
    }
}

struct StringVisitor(String);
impl StringVisitor { fn new() -> Self { Self(String::new()) } }
impl tracing::field::Visit for StringVisitor {
    fn record_debug(&mut self, field: &tracing::field::Field, value: &dyn std::fmt::Debug) {
        if field.name() == "message" {
            self.0 = format!("{:?}", value).trim_matches('"').to_string();
        } else {
            self.0.push_str(&format!(" {}={:?}", field.name(), value));
        }
    }
}

fn main() {
    let filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| {
        if cfg!(debug_assertions) {
            EnvFilter::new(scrcpygui_pro_lib::config::LOG_FILTER_DEV)
        } else {
            EnvFilter::new(scrcpygui_pro_lib::config::LOG_FILTER_PROD)
        }
    });

    tracing_subscriber::registry()
        .with(filter)
        .with(tracing_subscriber::fmt::layer().with_target(true))
        .with(TauriEventLayer)
        .init();

    tracing::info!("ScrcpyGUI Pro starting...");

    scrcpygui_pro_lib::run();
}
