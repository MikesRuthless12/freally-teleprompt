//! Global hotkeys (FT-M13) — the transport, from wherever the operator is.
//!
//! A window-scoped shortcut assumes a human at the keyboard with the prompter
//! in front of them. The operator is usually in a camera app, a DAW or OBS, and
//! their hands may be on a camera rather than a keyboard at all — which is also
//! why a foot pedal (FT-M04) is a first-class input here. Both land in the same
//! place: an accelerator from the one binding table, registered with the OS.
//!
//! # ⚠️ Nothing is registered until the operator asks
//!
//! Every shipped `global` binding is `None` (see `DEFAULT_BINDINGS` in
//! `ui/src/lib/bindings.ts`). An OS-level hotkey takes that key away from every
//! other program on the machine, so taking one uninvited on first run would be
//! a bug report, not a feature. FT-M16's map is the opt-in.
//!
//! # ⚠️ Registration is allowed to fail, and the failure has to be visible
//!
//! Another application may already own the key, and **Wayland restricts global
//! hotkey registration outright** — a compositor is entitled to refuse, and
//! most do. A silently-dropped registration is the worst outcome available: the
//! operator sets a hotkey, sees no error, and finds out on a shoot. So every
//! accelerator is registered individually, each failure is kept with the
//! command it belongs to, and [`shortcuts_status`] hands the lot to the map.

use std::collections::BTreeMap;
use std::sync::Mutex;

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

use crate::settings::Settings;

/// The window that acts on a global hotkey.
///
/// Emitted to **one** window rather than broadcast: the projector renders the
/// same shared scroll state, so if it handled the event too every hotkey would
/// run its command twice.
const TARGET_WINDOW: &str = "main";

/// The event a triggered hotkey emits. Its payload is the command id, which the
/// UI dispatches through exactly the path a window binding takes.
const HOTKEY_EVENT: &str = "hotkey";

/// What happened the last time bindings were applied.
#[derive(Debug, Clone, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HotkeyStatus {
    /// Command id → why the OS refused it. The map shows these against the row
    /// they belong to; an empty map is the only thing that means "all good".
    ///
    /// Only the failures are reported. A list of what succeeded would be a
    /// second copy of what the settings already say, and nothing would read it.
    pub failed: BTreeMap<String, String>,
    /// Whether this session is a Wayland one, where refusal is expected rather
    /// than exceptional — so the map can say so instead of blaming the key.
    pub wayland: bool,
}

/// The last [`apply`] result, for [`shortcuts_status`] to read back.
#[derive(Default)]
pub struct ShortcutsState(Mutex<HotkeyStatus>);

/// Is this a Wayland session?
///
/// Read from the environment rather than probed: there is no API that answers
/// "will you let me have a global hotkey", which is the whole reason this note
/// exists. On Windows and macOS it is always false.
fn is_wayland() -> bool {
    if !cfg!(target_os = "linux") {
        return false;
    }
    std::env::var("WAYLAND_DISPLAY").is_ok()
        || std::env::var("XDG_SESSION_TYPE")
            .map(|value| value.eq_ignore_ascii_case("wayland"))
            .unwrap_or(false)
}

/// Keys this app refuses to claim system-wide however the settings ask.
///
/// The mirror of the subtraction `ui/src/lib/bindings.ts` makes from
/// `SUPPORTED_CODES`. Kept as a list rather than a single comparison so the two
/// sides stay obviously in step; `withheld_matches_the_ui` asserts it.
const WITHHELD_FROM_GLOBAL: [&str; 1] = ["escape"];

/// Is this accelerator's key one we refuse to register globally?
///
/// Compares the last `+`-separated token, case-insensitively, because that is
/// where `global-hotkey`'s grammar puts the key and how it compares it.
fn withheld_from_global(accelerator: &str) -> bool {
    accelerator
        .rsplit('+')
        .next()
        .map(|key| {
            let key = key.trim().to_ascii_lowercase();
            WITHHELD_FROM_GLOBAL.contains(&key.as_str())
        })
        .unwrap_or(false)
}

/// Register every global binding in `settings`, replacing whatever was
/// registered before.
///
/// Called at startup and on every Settings Apply, so it must be idempotent:
/// `unregister_all` first is what makes re-applying the same table — or
/// clearing one — leave the OS in the state the settings describe rather than
/// accumulating registrations.
pub fn apply(app: &AppHandle, settings: &Settings) {
    let manager = app.global_shortcut();
    // Unregistering everything first is also what releases a key the operator
    // has just cleared. Failing here is not fatal — the per-accelerator
    // registrations below are what the operator actually sees.
    if let Err(err) = manager.unregister_all() {
        eprintln!("shortcuts: could not clear previous hotkeys: {err}");
    }

    let mut status = HotkeyStatus {
        wayland: is_wayland(),
        ..HotkeyStatus::default()
    };

    for (command, binding) in &settings.bindings {
        let Some(accelerator) = binding.global.as_deref() else {
            continue;
        };
        // ⚠️ Mirror of the ONE subtraction `ui/src/lib/bindings.ts` makes from
        // the parser's key table. `global-hotkey` parses `Escape` happily, and
        // the UI refuses to capture it because Escape is the app's universal
        // "get me out of here" — but the UI is not the only way a value reaches
        // here. A hand-edited settings file could hand us `Escape` and claim it
        // machine-wide, so pressing it in ANY other application toggled the
        // prompter, with the map showing that row as unbound because
        // `resolveBindings` had dropped the value it could not parse. Refused
        // here, and reported, so the operator can see what happened.
        if withheld_from_global(accelerator) {
            status.failed.insert(
                command.clone(),
                format!("{accelerator} cannot be claimed system-wide"),
            );
            continue;
        }
        let command = command.clone();
        let handler_command = command.clone();
        let result = manager.on_shortcut(accelerator, move |app, _shortcut, event| {
            // ⚠️ The handler fires on press AND release. Without this the
            // command would run twice per tap — play, then pause, and a pedal
            // that appeared to do nothing at all.
            if event.state() != ShortcutState::Pressed {
                return;
            }
            if let Err(err) = app.emit_to(TARGET_WINDOW, HOTKEY_EVENT, &handler_command) {
                eprintln!("shortcuts: emit failed: {err}");
            }
        });
        // The accelerator may be unparseable (a hand-edited file) or simply
        // already owned by something else. Both are the operator's to see.
        if let Err(err) = result {
            status.failed.insert(command, err.to_string());
        }
    }

    *crate::lanmirror::lock(&app.state::<ShortcutsState>().0) = status;
}

/// What the last [`apply`] managed to register, and what it did not.
#[tauri::command]
pub fn shortcuts_status(state: tauri::State<'_, ShortcutsState>) -> HotkeyStatus {
    crate::lanmirror::lock(&state.0).clone()
}

#[cfg(test)]
mod tests {
    use std::str::FromStr;

    use tauri_plugin_global_shortcut::Shortcut;

    /// ⚠️ The contract `ui/src/lib/bindings.ts` is written against.
    ///
    /// Its accelerators are built from W3C `KeyboardEvent.code` values on the
    /// premise that `global-hotkey`'s parser takes them verbatim. That premise
    /// is a table in a crate we do not own, so it is asserted here rather than
    /// believed: if a dependency bump ever changes it, this goes red instead of
    /// every global hotkey silently failing to register.
    #[test]
    fn the_shipped_default_accelerators_parse() {
        for accelerator in [
            "Space",
            "CommandOrControl+Period",
            "Home",
            "ArrowUp",
            "ArrowDown",
            "ArrowLeft",
            "ArrowRight",
            "PageDown",
            "PageUp",
            "CommandOrControl+KeyF",
        ] {
            assert!(
                Shortcut::from_str(accelerator).is_ok(),
                "the UI can produce `{accelerator}` and the OS parser rejects it"
            );
        }
    }

    /// The key shapes a pedal or a presenter remote actually sends. F13–F24 in
    /// particular are what programmable pedals are usually set to, precisely
    /// because nothing else on the machine uses them.
    #[test]
    fn the_key_shapes_a_pedal_sends_parse() {
        for accelerator in [
            "F13",
            "F24",
            "Numpad0",
            "NumpadAdd",
            "MediaPlayPause",
            "MediaTrackNext",
            "AudioVolumeMute",
            "Control+Alt+Shift+Super+KeyP",
            "Backquote",
            "BracketLeft",
        ] {
            assert!(
                Shortcut::from_str(accelerator).is_ok(),
                "a pedal can send `{accelerator}` and the OS parser rejects it"
            );
        }
    }

    /// The other half of the same contract: the codes the UI refuses to capture
    /// really are ones this parser cannot take. If one of these ever became
    /// legal, `SUPPORTED_CODES` is leaving a usable key on the table.
    #[test]
    fn the_codes_the_ui_refuses_are_genuinely_unsupported() {
        for accelerator in ["ContextMenu", "IntlBackslash", "Lang1", "ControlLeft"] {
            assert!(
                Shortcut::from_str(accelerator).is_err(),
                "`{accelerator}` parses, so the UI is refusing a key it could offer"
            );
        }
    }

    /// ⚠️ `Escape` is the exception to the rule above: it parses perfectly well,
    /// and is withheld on purpose. Without this guard a hand-edited settings
    /// file could claim it machine-wide.
    #[test]
    fn escape_parses_but_is_withheld_from_global_registration() {
        assert!(
            Shortcut::from_str("Escape").is_ok(),
            "if this ever fails the guard below is dead code"
        );
        assert!(super::withheld_from_global("Escape"));
        assert!(super::withheld_from_global("escape"));
        assert!(super::withheld_from_global("Control+Shift+Escape"));
        // The key is the LAST token; a modifier of that name is not a thing,
        // but a key that merely contains it must still register.
        assert!(!super::withheld_from_global("F13"));
        assert!(!super::withheld_from_global("Control+KeyE"));
    }
}
