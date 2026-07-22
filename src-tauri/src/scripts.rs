//! The script library (FT-10) — `.ftscript` files on disk.
//!
//! A script is a **plain UTF-8 text file** with a `.ftscript` extension, living
//! in one flat folder under the per-OS data directory. Plain text on purpose:
//! caesuras are inline ` -- ` tokens in the script itself, so there is nothing
//! else to store, and a script stays readable, diffable, and recoverable with
//! any text editor if this app ever goes away.
//!
//! # The name is the whole security surface
//!
//! Every command here takes a user-supplied **name**, and the only thing
//! standing between that name and the filesystem is [`is_valid_name`]. A name
//! is not a path: it may not contain a separator, a drive letter, a `..`, a
//! control character, or a Windows reserved device name. Names are validated
//! **before** they are joined to the library directory, never sanitised after —
//! rejecting is the one behaviour that cannot be partially correct.
//!
//! Writes go through a temp file + rename, exactly like `settings.rs`, so a
//! crash mid-save leaves either the old script or the new one.

use std::fs;
use std::io;
use std::path::{Path, PathBuf};

use serde::Serialize;
use tauri::Manager;

use crate::settings::SettingsStore;

/// The extension every script file carries.
const EXT: &str = "ftscript";
/// Longest script name we accept. Long enough for a real title, short enough
/// that `name + ".ftscript" + the library path` cannot approach a path limit.
const MAX_NAME_CHARS: usize = 64;
/// Hard cap on a script file, in bytes. The engine truncates at 200 000 *chars*;
/// this is the on-disk guard that stops a runaway save or a hostile file from
/// being read into memory in the first place.
const MAX_BYTES: usize = 1_000_000;

/// Characters that are a path or a wildcard on some OS we ship to. Rejected
/// wholesale rather than per-platform: a script written on Linux should stay
/// openable when the folder is synced to Windows.
const FORBIDDEN: [char; 9] = ['/', '\\', ':', '*', '?', '"', '<', '>', '|'];

/// Windows treats these as devices no matter the extension, so `CON.ftscript`
/// is not a file — opening it talks to the console. Compared case-insensitively.
const RESERVED: [&str; 22] = [
    "CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8",
    "COM9", "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
];

/// Whether `name` may be joined to the library directory.
///
/// Public because `settings.rs` re-checks the persisted recent list with it: a
/// hand-edited settings file must not be able to put a path into the library UI.
pub fn is_valid_name(name: &str) -> bool {
    let chars: Vec<char> = name.chars().collect();
    if chars.is_empty() || chars.len() > MAX_NAME_CHARS {
        return false;
    }
    // Leading/trailing whitespace is invisible in a list and makes two scripts
    // look identical; a trailing dot is silently stripped by Windows, so
    // "notes." and "notes" would resolve to the same file under two names.
    if name.trim() != name || name.ends_with('.') {
        return false;
    }
    if chars
        .iter()
        .any(|&c| c.is_control() || FORBIDDEN.contains(&c))
    {
        return false;
    }
    // "." and ".." are directory entries, not names.
    if name.chars().all(|c| c == '.') {
        return false;
    }
    // A device name is reserved with or without an extension, so compare the
    // stem — `CON`, `con.ftscript`, and `CoN.txt` are all the console.
    let stem = name.split('.').next().unwrap_or(name);
    !RESERVED.iter().any(|r| r.eq_ignore_ascii_case(stem))
}

/// The library folder, e.g. `%APPDATA%\Freally\Freally Teleprompt\data\scripts`.
/// Falls back to a local folder only when the OS offers no data directory.
pub fn scripts_dir() -> PathBuf {
    crate::settings::project_dirs()
        .map(|dirs| dirs.data_dir().join("scripts"))
        .unwrap_or_else(|| PathBuf::from("scripts"))
}

/// The path a valid name maps to inside `dir`. `Err` for any name that is not
/// valid — the single choke point, so no caller can build a path another way.
///
/// Taking the directory as a parameter is what makes every operation below
/// testable against a temp folder instead of the user's real library.
fn path_in(dir: &Path, name: &str) -> Result<PathBuf, String> {
    if !is_valid_name(name) {
        return Err(format!("not a usable script name: {name}"));
    }
    Ok(dir.join(format!("{name}.{EXT}")))
}

/// One entry in the library list.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScriptInfo {
    pub name: String,
    /// Size on disk in bytes (not characters — this is a file listing).
    pub bytes: u64,
    /// Last-modified time in milliseconds since the Unix epoch, or 0 when the
    /// platform does not report one. The UI sorts on it.
    pub modified_ms: u64,
}

fn modified_ms(meta: &fs::Metadata) -> u64 {
    meta.modified()
        .ok()
        .and_then(|time| time.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_millis().min(u64::MAX as u128) as u64)
        .unwrap_or(0)
}

/// Every `.ftscript` in `dir`, newest first.
///
/// A missing folder is an empty library, not an error: that is simply the state
/// before the first script is saved.
fn list_in(dir: &Path) -> Result<Vec<ScriptInfo>, String> {
    let entries = match fs::read_dir(dir) {
        Ok(entries) => entries,
        Err(err) if err.kind() == io::ErrorKind::NotFound => return Ok(Vec::new()),
        Err(err) => return Err(format!("could not read the script folder: {err}")),
    };
    let mut out = Vec::new();
    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) != Some(EXT) {
            continue;
        }
        let Some(name) = path.file_stem().and_then(|s| s.to_str()) else {
            continue;
        };
        // A file dropped in by hand under an unusable name is listed by nobody:
        // the UI could not open it without going through `path_for` anyway.
        if !is_valid_name(name) {
            continue;
        }
        let Ok(meta) = entry.metadata() else { continue };
        if !meta.is_file() {
            continue;
        }
        out.push(ScriptInfo {
            name: name.to_owned(),
            bytes: meta.len(),
            modified_ms: modified_ms(&meta),
        });
    }
    // Newest first, then by name so the order is stable when timestamps tie
    // (a folder restored from a backup can carry identical mtimes).
    out.sort_by(|a, b| {
        b.modified_ms
            .cmp(&a.modified_ms)
            .then_with(|| a.name.cmp(&b.name))
    });
    Ok(out)
}

/// Read a script from the real library — the startup path that restores
/// whatever was open last time.
pub fn read_current(name: &str) -> Result<String, String> {
    read_in(&scripts_dir(), name)
}

/// Read a script's text.
fn read_in(dir: &Path, name: &str) -> Result<String, String> {
    let path = path_in(dir, name)?;
    let meta = fs::metadata(&path).map_err(|err| format!("could not open {name}: {err}"))?;
    if meta.len() as usize > MAX_BYTES {
        return Err(format!("{name} is too large to open"));
    }
    fs::read_to_string(&path).map_err(|err| format!("could not read {name}: {err}"))
}

/// Write a script's text atomically (temp file + rename).
fn write_in(dir: &Path, name: &str, text: &str) -> Result<(), String> {
    if text.len() > MAX_BYTES {
        return Err(format!("{name} is too large to save"));
    }
    let path = path_in(dir, name)?;
    fs::create_dir_all(dir).map_err(|err| format!("could not create the script folder: {err}"))?;
    let temp = path.with_extension("ftscript.tmp");
    fs::write(&temp, text).map_err(|err| format!("could not save {name}: {err}"))?;
    // `fs::rename` replaces the destination on Windows too (MoveFileEx with
    // replace semantics), so this is genuinely atomic — see `settings.rs` for
    // the delete-first mistake this deliberately avoids.
    fs::rename(&temp, &path).map_err(|err| format!("could not save {name}: {err}"))
}

/// Create an empty script. Refuses to overwrite an existing one — "New" must
/// never be a silent way to erase yesterday's take.
fn create_in(dir: &Path, name: &str) -> Result<(), String> {
    let path = path_in(dir, name)?;
    if path.exists() {
        return Err(format!("a script called {name} already exists"));
    }
    write_in(dir, name, "")
}

/// Rename a script. Refuses if the destination already exists.
fn rename_in(dir: &Path, from: &str, to: &str) -> Result<(), String> {
    let source = path_in(dir, from)?;
    let dest = path_in(dir, to)?;
    if source == dest {
        return Ok(());
    }
    if dest.exists() {
        return Err(format!("a script called {to} already exists"));
    }
    fs::rename(&source, &dest).map_err(|err| format!("could not rename {from}: {err}"))
}

/// Delete a script.
fn delete_in(dir: &Path, name: &str) -> Result<(), String> {
    let path = path_in(dir, name)?;
    fs::remove_file(&path).map_err(|err| format!("could not delete {name}: {err}"))
}

// -- commands -----------------------------------------------------------------

#[tauri::command]
pub fn scripts_list() -> Result<Vec<ScriptInfo>, String> {
    list_in(&scripts_dir())
}

/// Open a script: read it, load it into the live engine, and mark it as the
/// current one.
///
/// Deliberately **one** command rather than a read plus a `teleprompter_set_script`
/// plus a recents update. Those three have to happen together — a UI that did
/// them separately could load a script the library then disagrees about — and
/// doing them here means the projector and the LAN mirror get the new script
/// from the same broadcast every other change uses.
///
/// Returns nothing on purpose: the text reaches every surface through that
/// broadcast, so handing it back would clone the whole script and serialise it
/// across the IPC boundary a second time for a caller that discards it.
#[tauri::command]
pub fn scripts_open(app: tauri::AppHandle, name: String) -> Result<(), String> {
    let text = read_in(&scripts_dir(), &name)?;
    app.state::<crate::teleprompter::TeleprompterState>()
        .set_script(text);
    crate::teleprompter::broadcast(&app);
    app.state::<SettingsStore>()
        .touch_recent(&name)
        .map_err(|err| format!("could not update the recent list: {err}"))
}

/// Save text into a script file (the editor's autosave).
///
/// Does not touch the recent list: autosave fires while typing, and rewriting
/// the settings file on every keystroke burst would be a lot of disk for a list
/// whose front entry is already this script.
#[tauri::command]
pub fn scripts_save(name: String, text: String) -> Result<(), String> {
    write_in(&scripts_dir(), &name, &text)
}

#[tauri::command]
pub fn scripts_create(app: tauri::AppHandle, name: String) -> Result<(), String> {
    create_in(&scripts_dir(), &name)?;
    app.state::<SettingsStore>()
        .touch_recent(&name)
        .map_err(|err| format!("could not update the recent list: {err}"))
}

#[tauri::command]
pub fn scripts_rename(app: tauri::AppHandle, from: String, to: String) -> Result<(), String> {
    rename_in(&scripts_dir(), &from, &to)?;
    let store = app.state::<SettingsStore>();
    // Order matters: forget the old name first, so a rename that lands on a name
    // already in the list leaves ONE entry rather than two.
    store
        .forget_recent(&from)
        .and_then(|()| store.touch_recent(&to))
        .map_err(|err| format!("could not update the recent list: {err}"))
}

#[tauri::command]
pub fn scripts_delete(app: tauri::AppHandle, name: String) -> Result<(), String> {
    delete_in(&scripts_dir(), &name)?;
    app.state::<SettingsStore>()
        .forget_recent(&name)
        .map_err(|err| format!("could not update the recent list: {err}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    /// The whole security surface of this module, exercised on the shapes that
    /// actually get people: separators, traversal, devices, and control bytes.
    #[test]
    fn names_that_are_really_paths_are_refused() {
        assert!(is_valid_name("My Script"));
        assert!(is_valid_name("take-2_final"));
        assert!(is_valid_name("スクリプト"));
        assert!(is_valid_name("a.b"), "an interior dot is just a character");

        assert!(!is_valid_name(""));
        assert!(!is_valid_name("."));
        assert!(!is_valid_name(".."));
        assert!(!is_valid_name("../../etc/passwd"));
        assert!(!is_valid_name("..\\..\\Windows\\System32"));
        assert!(!is_valid_name("nested/name"));
        assert!(!is_valid_name("C:evil"));
        assert!(!is_valid_name("star*"));
        assert!(!is_valid_name("pipe|"));
        assert!(!is_valid_name("quote\""));
        assert!(!is_valid_name("nul\u{0}byte"));
        assert!(!is_valid_name("newline\nname"));
        assert!(!is_valid_name(" leading"));
        assert!(!is_valid_name("trailing "));
        assert!(!is_valid_name("trailing."));
        assert!(!is_valid_name(&"x".repeat(MAX_NAME_CHARS + 1)));
        assert!(is_valid_name(&"x".repeat(MAX_NAME_CHARS)));
    }

    /// Windows device names are reserved whatever extension follows, so the
    /// check has to look at the stem, not the whole string.
    #[test]
    fn windows_device_names_are_refused() {
        for name in ["CON", "con", "NUL", "com1", "LPT9", "Aux"] {
            assert!(!is_valid_name(name), "{name} is a device, not a file");
        }
        for name in ["CON.ftscript", "nul.txt", "com1.notes"] {
            assert!(!is_valid_name(name), "{name} still resolves to the device");
        }
        // Not devices — the stem only *starts* like one.
        assert!(is_valid_name("CONTENTS"));
        assert!(is_valid_name("com10"));
    }

    /// Every path this module builds goes through `path_in`, so an invalid
    /// name can never reach the filesystem at all.
    #[test]
    fn path_in_refuses_anything_is_valid_name_refuses() {
        let dir = Path::new("lib");
        assert!(path_in(dir, "ok").is_ok());
        assert!(path_in(dir, "../escape").is_err());
        assert!(path_in(dir, "").is_err());
        // And a valid one lands inside the library folder, with the extension.
        let path = path_in(dir, "take-1").unwrap();
        assert_eq!(path.parent(), Some(dir));
        assert_eq!(path.extension().and_then(|e| e.to_str()), Some(EXT));
    }

    /// A unique, empty library folder per test, cleaned up on the way in so a
    /// previous run cannot leak into this one.
    fn temp_lib(name: &str) -> PathBuf {
        let dir = std::env::temp_dir()
            .join("freally-teleprompt-tests")
            .join(format!("scripts-{name}"));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn create_open_rename_delete_round_trip() {
        let dir = temp_lib("round-trip");
        assert!(list_in(&dir).unwrap().is_empty(), "a new library is empty");

        create_in(&dir, "Take 1").unwrap();
        assert_eq!(read_in(&dir, "Take 1").unwrap(), "");
        // Creating over an existing script must refuse, not silently erase it.
        write_in(&dir, "Take 1", "hello -- world").unwrap();
        assert!(create_in(&dir, "Take 1").is_err());
        assert_eq!(read_in(&dir, "Take 1").unwrap(), "hello -- world");

        rename_in(&dir, "Take 1", "Take 2").unwrap();
        assert!(read_in(&dir, "Take 1").is_err(), "the old name is gone");
        assert_eq!(read_in(&dir, "Take 2").unwrap(), "hello -- world");

        // A rename onto an existing script refuses too.
        create_in(&dir, "Other").unwrap();
        assert!(rename_in(&dir, "Take 2", "Other").is_err());
        assert_eq!(read_in(&dir, "Take 2").unwrap(), "hello -- world");

        let names: Vec<String> = list_in(&dir).unwrap().into_iter().map(|s| s.name).collect();
        assert_eq!(names.len(), 2);
        assert!(names.contains(&"Take 2".to_string()));
        assert!(names.contains(&"Other".to_string()));

        delete_in(&dir, "Other").unwrap();
        assert_eq!(list_in(&dir).unwrap().len(), 1);
    }

    /// The library folder does not exist until something is saved, and an app
    /// that treated that as an error would show a failure on every first run.
    #[test]
    fn a_missing_library_folder_lists_as_empty() {
        let dir = temp_lib("missing").join("not-created-yet");
        assert_eq!(list_in(&dir).unwrap(), Vec::new());
    }

    /// Files that are not `.ftscript`, and files whose name we would refuse to
    /// open, are not listed — the list must only ever offer what can be opened.
    #[test]
    fn listing_ignores_foreign_files() {
        let dir = temp_lib("foreign");
        write_in(&dir, "real", "x").unwrap();
        fs::write(dir.join("notes.txt"), "not a script").unwrap();
        fs::write(dir.join("half-written.ftscript.tmp"), "interrupted").unwrap();
        fs::create_dir_all(dir.join("a-folder.ftscript")).unwrap();

        let names: Vec<String> = list_in(&dir).unwrap().into_iter().map(|s| s.name).collect();
        assert_eq!(names, vec!["real".to_string()]);
    }

    /// An oversized script is refused rather than truncated: silently saving
    /// half of someone's script is worse than saying no.
    #[test]
    fn oversized_scripts_are_refused() {
        let dir = temp_lib("oversized");
        let huge = "a".repeat(MAX_BYTES + 1);
        assert!(write_in(&dir, "huge", &huge).is_err());
        assert!(read_in(&dir, "huge").is_err(), "nothing was written");
    }
}
