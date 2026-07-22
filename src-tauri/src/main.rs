// Windows: no console window behind the app in release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

//! Freally Teleprompt — the Tauri v2 app shell (FT-00 / FT-03).
//!
//! A local-first teleprompter. This crate owns the authoritative scroll state
//! ([`teleprompter`]), the persisted preferences ([`settings`]), the first-run
//! agreement gate ([`eula`]), and the opt-in problem reporter ([`bugreport`]);
//! the React UI in `../ui` renders them.
//!
//! No network client lives here. The only outbound traffic the app makes is the
//! updater's release check, which the Tauri plugin owns — the problem reporter
//! sends nothing itself, it only hands a pre-filled URL to the OS.

mod bugreport;
mod eula;
mod settings;
mod teleprompter;

use tauri::Manager;

use settings::SettingsStore;
use teleprompter::TeleprompterState;

fn main() {
    // `--crash-notice <pid>`: we are the tiny helper a dying app spawned, not
    // the app. Show the native error window, relaunch if the user says yes, and
    // leave. This MUST come before the Tauri app is built — the helper is not a
    // second copy of the prompter and must never open a window of its own.
    let args: Vec<String> = std::env::args().collect();
    if bugreport::run_crash_notice(&args) {
        return;
    }
    // `--test-crash`: drill the crash loop on the shipped exe. Deliberately a
    // launch flag with no button and no IPC command behind it.
    bugreport::arm_test_crash(&args);
    // Opt-in problem reporting: a panic writes a SCRUBBED report to a local
    // file so the next launch can offer to send it. Nothing is ever sent
    // automatically (charter: no telemetry) — this only writes a local file.
    bugreport::install_panic_hook();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        // Settings are loaded before the window exists, so the UI's very first
        // read already has the user's language and theme — no English flash.
        .manage(SettingsStore::load(SettingsStore::default_path()))
        .manage(TeleprompterState::new())
        // Seed the engine from the persisted preferences, so the app opens at
        // the user's own speed, font, and pause length rather than the built-in
        // defaults. `settings_set` runs the same push on every Apply.
        .setup(|app| {
            let settings = app.state::<SettingsStore>().get();
            teleprompter::apply_settings(app.handle(), &settings);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            settings::settings_get,
            settings::settings_set,
            eula::eula_status,
            eula::eula_accept,
            teleprompter::teleprompter_get,
            teleprompter::teleprompter_set_script,
            teleprompter::teleprompter_set_speed,
            teleprompter::teleprompter_set_font,
            teleprompter::teleprompter_set_mirror,
            teleprompter::teleprompter_set_caesura,
            teleprompter::teleprompter_set_countdown,
            teleprompter::teleprompter_control,
            bugreport::bug_report_pending,
            bugreport::bug_report_build,
            bugreport::bug_report_clear_crash,
            bugreport::open_url,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Freally Teleprompt");
}
