//! Persisted user settings (FT-03) — the draft/apply pattern's server half.
//!
//! The UI edits a private **draft** and only sends it here on Apply, so
//! cancelling a dialog restores exactly what the user had. This side owns the
//! on-disk file: one JSON document under the per-OS config directory, written
//! atomically (temp file + rename) so a crash mid-write cannot leave a
//! truncated settings file that fails to parse on the next launch.
//!
//! # The one rule that keeps biting
//!
//! [`Settings::accepted_eula_version`] is a **machine-level fact**, not a user
//! preference, and is deliberately NOT replaceable through [`SettingsStore::set`].
//! A settings dialog opened before acceptance carries the pre-acceptance value
//! in its snapshot; letting `set` write it would silently reset acceptance and
//! re-show the EULA gate on the next launch. That exact bug shipped in Freally
//! Capture. [`SettingsStore::accept_eula`] is the only writer, and
//! `set_preserves_eula_acceptance` below is the regression test.

use std::fs;
use std::io;
use std::path::PathBuf;
use std::sync::Mutex;

use serde::{Deserialize, Serialize};

/// The engine's own clamps, imported rather than re-declared: a hand-edited
/// settings file must not be able to push the engine outside the range it
/// enforces anyway, and two copies of these numbers would drift silently.
use crate::teleprompter::{
    CAESURA_MAX_DEFAULT as CAESURA_MAX, CAESURA_MIN_DEFAULT as CAESURA_MIN, COUNTDOWN_MAX,
    MAX_FONT, MAX_SPEED, MIN_FONT, MIN_SPEED,
};

/// Persisted in `language` to mean "follow the operating system". The UI's
/// `AUTO_LOCALE` sentinel — a word, not an empty string, so `validate` can tell
/// "follow the OS" apart from a corrupted empty tag.
const AUTO_LANGUAGE: &str = "auto";

fn default_language() -> String {
    AUTO_LANGUAGE.to_string()
}

fn default_theme() -> String {
    "dark".to_string()
}

fn default_speed() -> f32 {
    12.0
}

fn default_font_size() -> f32 {
    48.0
}

fn default_caesura_secs() -> f32 {
    0.75
}

/// Every persisted preference. `#[serde(default)]` on each field means an older
/// settings file missing a newly-added key loads with that key's default rather
/// than failing to parse — settings written by any past version stay readable.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    /// BCP-47 tag, or `"auto"` to follow the OS.
    #[serde(default = "default_language")]
    pub language: String,
    /// `"dark"` or `"light"`.
    #[serde(default = "default_theme")]
    pub theme: String,
    /// Scroll speed in visible characters per second.
    #[serde(default = "default_speed")]
    pub speed: f32,
    /// Reading font size in px.
    #[serde(default = "default_font_size")]
    pub font_size: f32,
    /// The default pause (seconds) a bare ` -- ` caesura uses.
    #[serde(default = "default_caesura_secs")]
    pub caesura_secs: f32,
    /// Start-countdown pre-roll (seconds) before scrolling; 0 = off.
    #[serde(default)]
    pub countdown_secs: f32,
    /// Mirror the projector horizontally (beam-splitter glass).
    #[serde(default)]
    pub mirror: bool,
    /// The EULA version the user accepted, if any.
    ///
    /// NOT user-editable — see the module docs. [`SettingsStore::accept_eula`]
    /// is the only writer; [`SettingsStore::set`] preserves whatever is here.
    #[serde(default)]
    pub accepted_eula_version: Option<String>,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            language: default_language(),
            theme: default_theme(),
            speed: default_speed(),
            font_size: default_font_size(),
            caesura_secs: default_caesura_secs(),
            countdown_secs: 0.0,
            mirror: false,
            accepted_eula_version: None,
        }
    }
}

impl Settings {
    /// Clamp every numeric field into range and normalise the enum-ish strings.
    ///
    /// Applied on load AND on `set`, because both take input we don't control:
    /// the file may have been hand-edited, and the UI may be a build ahead or
    /// behind. Out-of-range values are corrected, never rejected — refusing to
    /// start because one number is wrong would be worse than fixing it.
    pub fn validate(&mut self) {
        if self.language.trim().is_empty() {
            self.language = default_language();
        }
        if self.theme != "dark" && self.theme != "light" {
            self.theme = default_theme();
        }
        // A NaN survives `clamp` in Rust, so replace non-finite values outright.
        self.speed = clamp_finite(self.speed, MIN_SPEED, MAX_SPEED, default_speed());
        self.font_size = clamp_finite(self.font_size, MIN_FONT, MAX_FONT, default_font_size());
        self.caesura_secs = clamp_finite(
            self.caesura_secs,
            CAESURA_MIN,
            CAESURA_MAX,
            default_caesura_secs(),
        );
        self.countdown_secs = clamp_finite(self.countdown_secs, 0.0, COUNTDOWN_MAX, 0.0);
    }
}

/// `value.clamp(lo, hi)`, but a NaN/infinity falls back to `fallback` instead of
/// propagating — `f32::clamp` returns NaN for a NaN input, which would then be
/// serialised as `null` and fail to parse on the next load.
fn clamp_finite(value: f32, lo: f32, hi: f32, fallback: f32) -> f32 {
    if value.is_finite() {
        value.clamp(lo, hi)
    } else {
        fallback
    }
}

/// The app's on-disk identity, in one place.
///
/// This triple decides where **everything** the app persists lives — settings
/// here, crash reports in `bugreport.rs`. Written out twice it would be two
/// literals that must agree forever; getting one wrong on a rename orphans
/// either the settings file or every crash report, silently and only for users
/// who upgrade.
pub(crate) fn project_dirs() -> Option<directories::ProjectDirs> {
    directories::ProjectDirs::from("com", "Freally", "Freally Teleprompt")
}

/// The settings file, plus the in-memory copy every command reads.
pub struct SettingsStore {
    inner: Mutex<Settings>,
    path: PathBuf,
}

impl SettingsStore {
    /// Load from disk, or start from defaults when there is no file yet (first
    /// run) or the file is unreadable/corrupt.
    ///
    /// A corrupt file is reported and replaced by defaults rather than being
    /// fatal: the app must still start. The one thing that costs is EULA
    /// re-acceptance, which is the safe direction to fail.
    pub fn load(path: PathBuf) -> Self {
        let settings = match fs::read_to_string(&path) {
            Ok(text) => match serde_json::from_str::<Settings>(&text) {
                Ok(mut settings) => {
                    settings.validate();
                    settings
                }
                Err(err) => {
                    eprintln!(
                        "settings: {} is not valid JSON ({err}) — using defaults",
                        path.display()
                    );
                    Settings::default()
                }
            },
            // Not-found is the normal first-run path and not worth a message.
            Err(err) if err.kind() == io::ErrorKind::NotFound => Settings::default(),
            Err(err) => {
                eprintln!(
                    "settings: could not read {} ({err}) — using defaults",
                    path.display()
                );
                Settings::default()
            }
        };
        Self {
            inner: Mutex::new(settings),
            path,
        }
    }

    /// The conventional per-OS config path, e.g. `%APPDATA%\Freally
    /// Teleprompt\settings.json`. Falls back to the current directory only if
    /// the OS has no config dir to offer.
    pub fn default_path() -> PathBuf {
        project_dirs()
            .map(|dirs| dirs.config_dir().join("settings.json"))
            .unwrap_or_else(|| PathBuf::from("settings.json"))
    }

    fn lock(&self) -> std::sync::MutexGuard<'_, Settings> {
        self.inner
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
    }

    /// A copy of the current settings.
    pub fn get(&self) -> Settings {
        self.lock().clone()
    }

    /// Replace the settings and persist them atomically.
    ///
    /// `accepted_eula_version` is deliberately **not** replaceable through here
    /// — see the module docs. Everything else is the user's to change.
    pub fn set(&self, next: Settings) -> io::Result<()> {
        {
            let mut guard = self.lock();
            let accepted = guard.accepted_eula_version.clone();
            *guard = next;
            guard.accepted_eula_version = accepted;
            guard.validate();
        }
        self.persist()
    }

    /// Record acceptance of `version` and persist. The only writer of
    /// `accepted_eula_version`. Idempotent.
    pub fn accept_eula(&self, version: &str) -> io::Result<()> {
        {
            let mut guard = self.lock();
            guard.accepted_eula_version = Some(version.to_owned());
        }
        self.persist()
    }

    /// Write the current settings to disk atomically: serialise to a sibling
    /// temp file, then rename over the real one. A crash can then leave either
    /// the old file or the new one, never a half-written document.
    fn persist(&self) -> io::Result<()> {
        let text = serde_json::to_string_pretty(&*self.lock())
            .map_err(|err| io::Error::new(io::ErrorKind::InvalidData, err))?;
        if let Some(parent) = self.path.parent() {
            fs::create_dir_all(parent)?;
        }
        let temp = self.path.with_extension("json.tmp");
        fs::write(&temp, text)?;
        // `fs::rename` replaces an existing destination on Windows too — std
        // uses MoveFileEx with replace semantics, so this really is atomic.
        //
        // An earlier version deleted the destination first, on the false premise
        // that Windows refuses to rename onto an existing file. That delete was
        // the ONLY thing making this write non-atomic: it opened a window with
        // no settings file at all, so a crash — or a rename that failed because
        // a virus scanner had the temp file open — left the user with nothing.
        // `load()` would then take the silent first-run branch and reset every
        // preference AND re-show the EULA gate, with a perfectly good document
        // sitting next to it in `settings.json.tmp`. Do not reintroduce it.
        fs::rename(&temp, &self.path)
    }
}

// -- commands -----------------------------------------------------------------

/// The current settings (the UI's initial read; it drafts from this copy).
#[tauri::command]
pub fn settings_get(store: tauri::State<'_, SettingsStore>) -> Settings {
    store.get()
}

/// Apply a settings draft. `accepted_eula_version` in `next` is ignored.
///
/// Persisting is only half the job: the reading preferences must also reach the
/// **live engine**, or the sliders silently edit a file nobody reads. That push
/// happens here rather than in the UI so every surface — preview, projector,
/// LAN mirror — picks it up from one broadcast, and no future panel can forget
/// to fan the calls out itself.
#[tauri::command]
pub fn settings_set(
    app: tauri::AppHandle,
    store: tauri::State<'_, SettingsStore>,
    next: Settings,
) -> Result<(), String> {
    store
        .set(next)
        .map_err(|err| format!("could not save settings: {err}"))?;

    // Read back through the store, so the engine adopts the *validated* values
    // rather than whatever the UI happened to send.
    let applied = store.get();
    crate::teleprompter::apply_settings(&app, &applied);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    /// A store backed by a unique temp path, cleaned up by the OS.
    fn temp_store(name: &str) -> SettingsStore {
        let path = std::env::temp_dir()
            .join("freally-teleprompt-tests")
            .join(format!("{name}.json"));
        let _ = fs::remove_file(&path);
        SettingsStore::load(path)
    }

    /// The bug this whole module is shaped around: applying a settings draft
    /// taken BEFORE acceptance must not wipe the acceptance.
    #[test]
    fn set_preserves_eula_acceptance() {
        let store = temp_store("preserves-eula");
        // A snapshot the UI took before the user accepted.
        let stale = store.get();
        assert_eq!(stale.accepted_eula_version, None);

        store.accept_eula("2026-07-21").unwrap();
        assert_eq!(
            store.get().accepted_eula_version.as_deref(),
            Some("2026-07-21")
        );

        // Applying the stale draft changes preferences but NOT the acceptance.
        let mut next = stale.clone();
        next.theme = "light".to_string();
        store.set(next).unwrap();
        assert_eq!(store.get().theme, "light", "the preference did apply");
        assert_eq!(
            store.get().accepted_eula_version.as_deref(),
            Some("2026-07-21"),
            "saving settings must never wipe EULA acceptance"
        );

        // And it survives a reload from disk, not just in memory.
        let reloaded = SettingsStore::load(store.path.clone());
        assert_eq!(
            reloaded.get().accepted_eula_version.as_deref(),
            Some("2026-07-21"),
            "acceptance persisted across a restart"
        );
    }

    /// Even an explicit attempt to write the field through `set` is refused.
    #[test]
    fn set_cannot_forge_eula_acceptance() {
        let store = temp_store("cannot-forge");
        let mut next = store.get();
        next.accepted_eula_version = Some("forged".to_string());
        store.set(next).unwrap();
        assert_eq!(
            store.get().accepted_eula_version,
            None,
            "set() is not a path to accepting the EULA"
        );
    }

    #[test]
    fn validate_clamps_out_of_range_values() {
        let mut s = Settings {
            speed: 9_000.0,
            font_size: 1.0,
            caesura_secs: 99.0,
            countdown_secs: -5.0,
            theme: "chartreuse".to_string(),
            language: "  ".to_string(),
            ..Settings::default()
        };
        s.validate();
        assert_eq!(s.speed, MAX_SPEED);
        assert_eq!(s.font_size, MIN_FONT);
        assert_eq!(s.caesura_secs, CAESURA_MAX);
        assert_eq!(s.countdown_secs, 0.0);
        assert_eq!(s.theme, "dark", "an unknown theme falls back");
        assert_eq!(s.language, AUTO_LANGUAGE, "a blank tag falls back to auto");
    }

    /// `f32::clamp` propagates NaN, which would serialise as `null` and then
    /// fail to parse on the next launch. A non-finite value carries no usable
    /// intent, so every one of them falls back to that field's default rather
    /// than being clamped to an end of the range.
    #[test]
    fn validate_replaces_non_finite_values() {
        let mut s = Settings {
            speed: f32::NAN,
            font_size: f32::INFINITY,
            caesura_secs: f32::NEG_INFINITY,
            ..Settings::default()
        };
        s.validate();
        assert_eq!(s.speed, default_speed());
        assert_eq!(s.font_size, default_font_size());
        assert_eq!(s.caesura_secs, default_caesura_secs());
        // The whole point: the result must survive a JSON round-trip. A NaN
        // would serialise as `null` and then fail to parse back into f32.
        // (`acceptedEulaVersion` is legitimately null here — it's an Option.)
        let text = serde_json::to_string(&s).unwrap();
        for field in ["speed", "fontSize", "caesuraSecs", "countdownSecs"] {
            assert!(
                !text.contains(&format!("\"{field}\":null")),
                "{field} serialised as null: {text}"
            );
        }
        assert_eq!(serde_json::from_str::<Settings>(&text).unwrap(), s);
    }

    /// A settings file from an older build is missing newer keys; it must load
    /// with those keys defaulted rather than failing to parse.
    #[test]
    fn partial_file_loads_with_defaults() {
        let parsed: Settings = serde_json::from_str(r#"{"theme":"light"}"#).unwrap();
        assert_eq!(parsed.theme, "light");
        assert_eq!(parsed.speed, default_speed());
        assert_eq!(parsed.language, default_language());
    }

    /// A corrupt file must not stop the app from starting.
    #[test]
    fn corrupt_file_falls_back_to_defaults() {
        let path = std::env::temp_dir()
            .join("freally-teleprompt-tests")
            .join("corrupt.json");
        fs::create_dir_all(path.parent().unwrap()).unwrap();
        fs::write(&path, "{ this is not json").unwrap();
        let store = SettingsStore::load(path);
        assert_eq!(store.get(), Settings::default());
    }

    #[test]
    fn round_trips_through_disk() {
        let store = temp_store("round-trip");
        let mut next = store.get();
        next.speed = 20.0;
        next.font_size = 64.0;
        next.mirror = true;
        next.language = "ja".to_string();
        store.set(next.clone()).unwrap();

        let reloaded = SettingsStore::load(store.path.clone());
        assert_eq!(reloaded.get(), next);
    }
}
