//! The talent projector window (FT-12).
//!
//! The projector is a second in-app window (`WebviewUrl::App`) showing the same
//! script, big, on whichever monitor the beam-splitter rig is fed from. It runs
//! off the **same** [`crate::teleprompter::TeleprompterState`] as the operator
//! preview — it does not get its own copy of anything — so the two can never
//! disagree about where the read is.
//!
//! What the window shows is decided by its **label**: the UI checks
//! `getCurrentWindow().label` and renders the projector surface for
//! [`PROJECTOR_LABEL`] instead of the operator shell. No extra IPC is needed to
//! tell the new window what it is.

use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

/// The projector window's label. The UI routes on it; nothing else may use it.
pub const PROJECTOR_LABEL: &str = "projector";

/// One connected display, for the "open on…" picker.
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DisplayInfo {
    pub index: usize,
    pub name: String,
    pub width: u32,
    pub height: u32,
    pub primary: bool,
}

/// Enumerate the connected monitors, queried through the main window.
#[tauri::command]
pub fn list_displays(app: AppHandle) -> Result<Vec<DisplayInfo>, String> {
    let main = app
        .get_webview_window("main")
        .ok_or("the main window is not available")?;
    let monitors = main.available_monitors().map_err(|err| err.to_string())?;
    let primary_name = main
        .primary_monitor()
        .ok()
        .flatten()
        .and_then(|monitor| monitor.name().cloned());
    Ok(monitors
        .iter()
        .enumerate()
        .map(|(index, monitor)| {
            let size = monitor.size();
            let name = monitor.name().cloned();
            DisplayInfo {
                index,
                primary: name.is_some() && name == primary_name,
                name: name.unwrap_or_else(|| format!("Display {}", index + 1)),
                width: size.width,
                height: size.height,
            }
        })
        .collect())
}

/// Open (or focus) the projector.
///
/// `display` is an index into [`list_displays`]; `None` leaves it as a floating
/// window on the current screen. `fill` covers that monitor edge to edge.
///
/// # Why this is `async`
///
/// Tauri runs an `async` command **off** the main thread. Building a webview
/// that loads our app — which calls `teleprompter_get` on mount — from a
/// synchronous command deadlocks: the new webview's IPC cannot be serviced
/// while the main thread is blocked inside `build()`, so the app freezes with a
/// blank projector and a dead close button. Freally Capture shipped exactly
/// that bug. Do not make this synchronous.
#[tauri::command]
pub async fn projector_open(
    app: AppHandle,
    title: String,
    display: Option<usize>,
    fill: bool,
) -> Result<(), String> {
    if let Some(existing) = app.get_webview_window(PROJECTOR_LABEL) {
        let _ = existing.set_focus();
        return Ok(());
    }
    let main = app
        .get_webview_window("main")
        .ok_or("the main window is not available")?;
    let monitors = main.available_monitors().map_err(|err| err.to_string())?;
    let target = display.and_then(|index| monitors.get(index));

    let title = if title.trim().is_empty() {
        "Freally Teleprompt"
    } else {
        title.as_str()
    };
    // "Fill the display" is a **borderless window sized to that monitor**, never
    // OS exclusive fullscreen. Asking wry/tao to enter exclusive fullscreen
    // during window creation deadlocks the Windows event loop mid mode-switch —
    // in Capture that froze the whole desktop and needed Task Manager to clear.
    // A borderless monitor-filling window is what a "fullscreen projector"
    // actually is everywhere else, triggers no DWM mode change, and stays
    // escapable (Esc, Alt+F4 and the taskbar all keep working).
    let mut builder =
        WebviewWindowBuilder::new(&app, PROJECTOR_LABEL, WebviewUrl::App("index.html".into()))
            .title(title)
            .inner_size(960.0, 540.0)
            .decorations(!fill);
    if let Some(monitor) = target {
        let position = monitor.position();
        builder = builder.position(position.x as f64, position.y as f64);
    }
    let window = builder
        .build()
        .map_err(|err| format!("could not open the projector: {err}"))?;
    // Physical units, so a HiDPI display is covered edge to edge rather than
    // being handed logical pixels that the scale factor then shrinks.
    if fill {
        if let Some(monitor) = target {
            let _ = window.set_position(*monitor.position());
            let _ = window.set_size(*monitor.size());
        }
    }
    Ok(())
}
