//! Minimize to the system tray.
//!
//! Off by default. The tray icon exists **only while the window is actually
//! hidden** — not merely because the setting is on. Minimising creates it and
//! hides the window; restoring shows the window and destroys it again, so the
//! app lives in the taskbar OR in the tray, never in both at once. An icon
//! sitting in the tray next to a visible window is clutter in the one part of
//! the desktop people curate most carefully.
//!
//! # Why the labels arrive from the UI
//!
//! The tray menu is the one piece of app text Rust owns, and Rust has no
//! Fluent catalogs — the 18 locales live in the UI. Rather than ship an English
//! menu to every user, or duplicate the catalogs, the UI hands over the two
//! strings it has already resolved and this module keeps them for whenever the
//! icon is next needed. That also means the menu re-localises when the language
//! changes, which a Rust-side copy never would.

use std::sync::Mutex;

use tauri::menu::{Menu, MenuEvent, MenuItem};
use tauri::tray::{TrayIcon, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Manager};

/// The menu-item ids, matched in the event handler.
const SHOW: &str = "tray-show";
const QUIT: &str = "tray-quit";

/// Managed state: the tray icon while one exists, plus the localised labels to
/// build it from when it is next needed.
pub struct TrayState {
    icon: Mutex<Option<TrayIcon>>,
    labels: Mutex<(String, String)>,
}

impl Default for TrayState {
    fn default() -> Self {
        Self {
            icon: Mutex::new(None),
            // English only until the UI reports the user's language — which it
            // does on load, long before any minimise can happen.
            labels: Mutex::new(("Show Freally Teleprompt".into(), "Quit".into())),
        }
    }
}

fn lock<T>(mutex: &Mutex<T>) -> std::sync::MutexGuard<'_, T> {
    mutex
        .lock()
        .unwrap_or_else(std::sync::PoisonError::into_inner)
}

/// Drop the tray icon, if there is one.
///
/// Scheduled onto the main thread rather than run inline, because both callers
/// are the icon's OWN event handlers: dropping a tray icon from inside its own
/// click callback is asking the platform to free something it is mid-way
/// through using. Deferring by one turn of the event loop costs nothing and
/// side-steps the question entirely.
fn remove_icon(app: &AppHandle) {
    let handle = app.clone();
    let _ = app.run_on_main_thread(move || {
        *lock(&handle.state::<TrayState>().icon) = None;
    });
}

/// Bring the main window back, and take the tray icon away with it.
///
/// `show` before `set_focus` matters: focusing a hidden window is a no-op on
/// every platform, so the order is the difference between "it comes back" and
/// "nothing happens and the user clicks the tray icon again".
fn reveal(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
    remove_icon(app);
}

fn build(app: &AppHandle, show_label: &str, quit_label: &str) -> tauri::Result<TrayIcon> {
    let show = MenuItem::with_id(app, SHOW, show_label, true, None::<&str>)?;
    let quit = MenuItem::with_id(app, QUIT, quit_label, true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show, &quit])?;

    let mut builder = TrayIconBuilder::with_id("main-tray")
        .tooltip("Freally Teleprompt")
        .menu(&menu)
        // The menu belongs on a right-click; a LEFT click should just bring the
        // window back, which is what everyone expects and what the
        // `on_tray_icon_event` handler below does.
        .show_menu_on_left_click(false)
        .on_menu_event(|app: &AppHandle, event: MenuEvent| match event.id().as_ref() {
            SHOW => reveal(app),
            QUIT => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click { .. } = event {
                reveal(tray.app_handle());
            }
        });
    // Reuse the app's own icon rather than shipping a second image that would
    // then need its own regeneration step in `scripts/make-icons.py`.
    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }
    builder.build(app)
}

// -- commands -----------------------------------------------------------------

/// Store the localised tray-menu labels, and rescue the window if the user has
/// just turned the feature off while it was hidden.
///
/// Called when settings first load and after every Apply. It deliberately does
/// NOT create an icon: the icon's whole lifetime is "while the window is
/// hidden", which only [`window_minimize`] can begin.
#[tauri::command]
pub fn tray_sync(app: AppHandle, show_label: String, quit_label: String) {
    let state = app.state::<TrayState>();
    *lock(&state.labels) = (show_label, quit_label);

    let enabled = app
        .state::<crate::settings::SettingsStore>()
        .get()
        .minimize_to_tray;
    // Turning the setting off while the window is in the tray would otherwise
    // strand it there with nothing left to click.
    if !enabled && lock(&state.icon).is_some() {
        reveal(&app);
    }
}

/// Minimise the main window — into the tray if the user asked for that,
/// otherwise to the taskbar.
///
/// The decision lives here rather than in the title bar because the setting
/// lives here. A UI that had to remember the rule would be one more place for it
/// to be forgotten, and the title bar is deliberately dumb.
#[tauri::command]
pub fn window_minimize(app: AppHandle) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };
    if app
        .state::<crate::settings::SettingsStore>()
        .get()
        .minimize_to_tray
    {
        let state = app.state::<TrayState>();
        let (show_label, quit_label) = lock(&state.labels).clone();
        match build(&app, &show_label, &quit_label) {
            Ok(icon) => {
                *lock(&state.icon) = Some(icon);
                let _ = window.hide();
                return;
            }
            // No tray icon means no way back, which is indistinguishable from a
            // crash — so fall through to an ordinary minimise instead.
            Err(err) => eprintln!("tray: could not create the tray icon ({err}) — minimising"),
        }
    }
    let _ = window.minimize();
}
