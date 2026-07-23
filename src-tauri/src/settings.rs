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
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use serde::{Deserialize, Serialize};

/// The engine's own clamps, imported rather than re-declared: a hand-edited
/// settings file must not be able to push the engine outside the range it
/// enforces anyway, and two copies of these numbers would drift silently.
use crate::teleprompter::{
    clamp_finite, Look, CAESURA_MAX_DEFAULT as CAESURA_MAX, CAESURA_MIN_DEFAULT as CAESURA_MIN,
    COUNTDOWN_MAX, MAX_FONT, MAX_SPEED, MIN_FONT, MIN_SPEED,
};

/// How many script names the "recent" list remembers (FT-10).
pub(crate) const MAX_RECENTS: usize = 10;
/// The LAN mirror's default port (FT-12). Nothing is listening on it until the
/// mirror is switched on, which it is not by default.
pub(crate) const DEFAULT_LAN_PORT: u16 = 7346;

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

fn default_lan_port() -> u16 {
    DEFAULT_LAN_PORT
}

fn default_autocomplete() -> bool {
    true
}

fn default_autocomplete_language() -> String {
    AUTO_LANGUAGE.to_string()
}

/// Push-to-talk is the safer default of the two voice modes: the mic attends to
/// nothing until the operator deliberately holds the talk key.
const VOICE_MODE_PUSH_TO_TALK: &str = "push_to_talk";
const VOICE_MODE_ALWAYS: &str = "always";

fn default_voice_mode() -> String {
    VOICE_MODE_PUSH_TO_TALK.to_string()
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
    /// Reading appearance (FT-15) — typeface, weight, colour, margins, line
    /// height, and where the reading guide sits.
    #[serde(default)]
    pub look: Look,
    /// Minimise to the system tray instead of the taskbar. Off by default, and
    /// while it is off no tray icon is created at all.
    #[serde(default)]
    pub minimize_to_tray: bool,
    /// Serve the read-only LAN mirror (FT-12). **Off by default**: while it is
    /// off no socket is opened at all.
    #[serde(default)]
    pub lan_enabled: bool,
    /// Bind the mirror to every interface instead of loopback only. Loopback is
    /// the default even once the mirror is on, so turning it on and turning it
    /// *outward* are two separate, deliberate acts.
    #[serde(default)]
    pub lan_all_interfaces: bool,
    /// The mirror's TCP port.
    #[serde(default = "default_lan_port")]
    pub lan_port: u16,
    /// Offer ghost-text autocomplete while editing a script (FT-20/FT-21). On by
    /// default: it is a prefix lookup against tables bundled in the installer,
    /// so it costs no network and cannot leak what the operator is writing.
    #[serde(default = "default_autocomplete")]
    pub autocomplete: bool,
    /// Which language's table the editor completes against: a BCP-47 tag, or
    /// `"auto"` to follow the UI language.
    ///
    /// Separate from `language` on purpose — an operator often runs the app in
    /// one language and writes the script in another, and completing English
    /// prose against a Japanese table suggests nothing at all.
    #[serde(default = "default_autocomplete_language")]
    pub autocomplete_language: String,
    /// Hands-free voice commands (FT-31). **Off by default**: the microphone is
    /// opened only when this is on and listening is started, audio never leaves
    /// the device, and nothing is ever written to disk.
    #[serde(default)]
    pub voice_enabled: bool,
    /// How the listener decides when to attend to the mic: `"push_to_talk"`
    /// (only while the talk key is held) or `"always"` (continuously).
    #[serde(default = "default_voice_mode")]
    pub voice_mode: String,
    /// Recently-opened scripts (FT-10), most recent first; the first entry is
    /// the script currently open.
    ///
    /// NOT user-editable — like `accepted_eula_version` this is a record of what
    /// happened, not a preference, and [`SettingsStore::set`] preserves it.
    /// [`SettingsStore::touch_recent`] and [`SettingsStore::forget_recent`] are
    /// the only writers.
    #[serde(default)]
    pub recent_scripts: Vec<String>,
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
            look: Look::default(),
            minimize_to_tray: false,
            lan_enabled: false,
            lan_all_interfaces: false,
            lan_port: default_lan_port(),
            autocomplete: default_autocomplete(),
            autocomplete_language: default_autocomplete_language(),
            voice_enabled: false,
            voice_mode: default_voice_mode(),
            recent_scripts: Vec::new(),
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
        self.look.clamp();
        // Port 0 means "any free port" to the OS, which would hand the mirror a
        // different address every launch and make the printed URL a lie; the
        // ports below 1024 need privileges we do not have and should not want.
        if self.lan_port < 1024 {
            self.lan_port = default_lan_port();
        }
        // Same rule as `language`: a blank tag is meaningless, and the UI's
        // "auto" sentinel is a word precisely so an empty string never has to
        // mean anything. An unshipped-but-non-blank tag is kept and resolved in
        // the UI, which falls back to the UI language when it ships no table.
        if self.autocomplete_language.trim().is_empty() {
            self.autocomplete_language = default_autocomplete_language();
        }
        // Only the two known voice modes; anything else (a hand-edited file, a UI
        // from another version) falls back to the safe push-to-talk default.
        if self.voice_mode != VOICE_MODE_PUSH_TO_TALK && self.voice_mode != VOICE_MODE_ALWAYS {
            self.voice_mode = default_voice_mode();
        }
        // A recents list is a record, but it is still read back off disk: cap it
        // and drop anything that is no longer a legal script name, so a
        // hand-edited file cannot smuggle a path into the library UI.
        self.recent_scripts
            .retain(|name| crate::scripts::is_valid_name(name));
        self.recent_scripts.truncate(MAX_RECENTS);
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

/// Write `bytes` to `path` atomically: a sibling temp file, then a rename over
/// the destination.
///
/// The rename is the point. `fs::rename` replaces an existing destination on
/// Windows too (`MoveFileEx` with replace semantics), so a crash — or a rename
/// that fails because a scanner has the temp open — leaves either the old file
/// or the new one, never a half-written document.
///
/// An earlier version deleted the destination first, on the false premise that
/// Windows refuses to rename onto an existing file. That delete was the ONLY
/// thing making the write non-atomic: it opened a window with no file at all, so
/// a crash left the user with nothing, and the next `load()` took the silent
/// first-run branch — resetting every preference AND re-showing the EULA gate —
/// with a perfectly good document sitting beside it in the `.tmp`. Do not
/// reintroduce a delete-first.
///
/// (`scripts::write_in` keeps its own copy: it layers a size limit and
/// per-script error messages on top. Consolidating that one is a separate cleanup.)
pub(crate) fn atomic_write(path: &Path, bytes: &[u8]) -> io::Result<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let mut temp = path.as_os_str().to_owned();
    temp.push(".tmp");
    let temp = PathBuf::from(temp);
    fs::write(&temp, bytes)?;
    fs::rename(&temp, path)
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
    /// `accepted_eula_version` and `recent_scripts` are deliberately **not**
    /// replaceable through here — see the module docs and the fields' own. Both
    /// are records of what happened rather than preferences, and a Settings
    /// dialog opened before either changed carries a stale copy in its draft.
    /// Everything else is the user's to change.
    pub fn set(&self, next: Settings) -> io::Result<()> {
        {
            let mut guard = self.lock();
            let accepted = guard.accepted_eula_version.clone();
            let recents = std::mem::take(&mut guard.recent_scripts);
            *guard = next;
            guard.accepted_eula_version = accepted;
            guard.recent_scripts = recents;
            guard.validate();
        }
        self.persist()
    }

    /// Move `name` to the front of the recent list (FT-10) and persist.
    ///
    /// The front entry is also "the script that is open", so this runs on every
    /// open, create, and rename — one call, one meaning.
    pub fn touch_recent(&self, name: &str) -> io::Result<()> {
        {
            let mut guard = self.lock();
            guard.recent_scripts.retain(|entry| entry != name);
            guard.recent_scripts.insert(0, name.to_owned());
            guard.recent_scripts.truncate(MAX_RECENTS);
        }
        self.persist()
    }

    /// Drop `name` from the recent list (FT-10) — a script that was deleted or
    /// renamed away. Persists even when nothing matched, which costs one write
    /// and keeps the caller free of "did it change?" bookkeeping.
    pub fn forget_recent(&self, name: &str) -> io::Result<()> {
        self.lock().recent_scripts.retain(|entry| entry != name);
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
        atomic_write(&self.path, text.as_bytes())
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
/// Returns the settings **as stored**, which is not always what was sent:
/// `validate` clamps every numeric field and normalises the enum-ish ones. The
/// UI adopts the return value rather than its own draft, so a value Rust
/// rewrote — a port of 80 becoming 7346, a line height of 9 becoming 2.5 — is
/// visible immediately instead of only after a restart. Without this the dialog
/// went on displaying the number the user typed while the app behaved
/// differently, which is the worst way for a clamp to fail.
#[tauri::command]
pub fn settings_set(
    app: tauri::AppHandle,
    store: tauri::State<'_, SettingsStore>,
    next: Settings,
) -> Result<Settings, String> {
    store
        .set(next)
        .map_err(|err| format!("could not save settings: {err}"))?;

    // Read back through the store, so the engine adopts the *validated* values
    // rather than whatever the UI happened to send.
    let applied = store.get();
    crate::teleprompter::apply_settings(&app, &applied);
    // The LAN mirror is settings-driven too (on/off, interface, port), and it
    // is reconciled from the same one place for the same reason: a panel that
    // had to remember to restart it would eventually forget.
    crate::lanmirror::apply_settings(&app, &applied);
    Ok(applied)
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

    /// The recent list is the second field with the EULA's shape: a record of
    /// what happened, carried in every Settings draft, and therefore trivially
    /// clobbered by an Apply from a dialog that was opened before the last
    /// script was touched. Same rule, same test.
    #[test]
    fn set_preserves_the_recent_scripts() {
        let store = temp_store("preserves-recents");
        let stale = store.get(); // a draft taken before any script was opened
        assert!(stale.recent_scripts.is_empty());

        store.touch_recent("Take 1").unwrap();
        store.touch_recent("Take 2").unwrap();
        assert_eq!(store.get().recent_scripts, vec!["Take 2", "Take 1"]);

        let mut next = stale.clone();
        next.theme = "light".to_string();
        // An outright attempt to write the field is refused too, not merely
        // ignored when absent.
        next.recent_scripts = vec!["forged".to_string()];
        store.set(next).unwrap();
        assert_eq!(store.get().theme, "light", "the preference did apply");
        assert_eq!(
            store.get().recent_scripts,
            vec!["Take 2", "Take 1"],
            "saving settings must never rewrite the recent list"
        );
    }

    /// Touching an existing entry moves it to the front rather than duplicating
    /// it, and the list is capped — a year of takes must not grow without end.
    #[test]
    fn recents_deduplicate_and_cap() {
        let store = temp_store("recents-cap");
        for i in 0..(MAX_RECENTS + 5) {
            store.touch_recent(&format!("script {i}")).unwrap();
        }
        let recents = store.get().recent_scripts;
        assert_eq!(recents.len(), MAX_RECENTS);
        assert_eq!(recents[0], format!("script {}", MAX_RECENTS + 4));

        store.touch_recent("script 12").unwrap();
        let recents = store.get().recent_scripts;
        assert_eq!(recents[0], "script 12");
        assert_eq!(
            recents.iter().filter(|n| *n == "script 12").count(),
            1,
            "re-opening a script moves it, it does not duplicate it"
        );

        store.forget_recent("script 12").unwrap();
        assert!(!store
            .get()
            .recent_scripts
            .contains(&"script 12".to_string()));
    }

    /// The recent list is read back off disk, so a hand-edited file is one more
    /// place a path could try to enter the script library.
    #[test]
    fn validate_drops_recent_entries_that_are_not_script_names() {
        let mut s = Settings {
            recent_scripts: vec![
                "fine".to_string(),
                "../../etc/passwd".to_string(),
                "C:\\Windows\\System32".to_string(),
                "also fine".to_string(),
            ],
            ..Settings::default()
        };
        s.validate();
        assert_eq!(s.recent_scripts, vec!["fine", "also fine"]);
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

    /// Voice control is off by default, and an unknown voice mode falls back to
    /// the safe push-to-talk default rather than being trusted.
    #[test]
    fn validate_normalises_voice_settings() {
        assert!(!Settings::default().voice_enabled);
        assert_eq!(Settings::default().voice_mode, VOICE_MODE_PUSH_TO_TALK);

        let mut s = Settings {
            voice_mode: "listen-to-everything".to_string(),
            ..Settings::default()
        };
        s.validate();
        assert_eq!(s.voice_mode, VOICE_MODE_PUSH_TO_TALK);

        // A legitimate value is kept.
        let mut always = Settings {
            voice_mode: VOICE_MODE_ALWAYS.to_string(),
            ..Settings::default()
        };
        always.validate();
        assert_eq!(always.voice_mode, VOICE_MODE_ALWAYS);
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
