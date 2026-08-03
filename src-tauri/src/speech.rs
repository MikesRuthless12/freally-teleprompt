//! Dictation (FT-32 / FT-33) — speech to text, into the script editor.
//!
//! Recognises free speech with `freally-speech` (Vosk) and emits each completed
//! utterance for the UI to insert. The recogniser links a native library and
//! needs a model, so the whole loop is behind the `vosk` feature; without it
//! (the default build and CI) the app reports dictation **unavailable** and the
//! loop does not exist.
//!
//! It is **opt-in** — the microphone opens only when the operator presses record
//! — and honest: the capability check gates the UI, so a build without the
//! engine, or a machine without the model, says so rather than failing when
//! pressed. Audio capture and resampling come from `freally-voice`.
//!
//! The grammar is deliberately FREE here. `freally-speech` can constrain the
//! vocabulary to a window of the script, which is far more accurate for reading
//! aloud — but dictation exists to write words the script does not contain yet,
//! so constraining it would defeat the purpose.

use std::path::PathBuf;
use std::sync::atomic::AtomicBool;
use std::sync::Arc;

use serde::Serialize;
use tauri::{AppHandle, Manager, State};

/// The Vosk model directory.
///
/// Two locations, in this order and deliberately:
///
/// 1. **The user's data directory**, beside settings. Nothing writes this — it
///    is the escape hatch for dropping in a
///    different or larger model without rebuilding the app, and it wins so that
///    a deliberate choice is never overridden by the shipped default.
/// 2. **The bundled model**, in the app's resource directory (FT-33).
///
/// Falling through to (2) with no bundle present yields a path that does not
/// exist, which is exactly what the capability check reports on.
///
/// ⚠️ (1) is taken only when it holds a model that can actually START, which is
/// the SAME question `capability` asks — not merely "is there a directory of
/// that name?". They have to agree, and when they did not, the weaker test here
/// silently disabled the feature: an empty or half-copied `vosk-model-en` in
/// the data directory was selected, the completeness check then failed on it,
/// and dictation reported itself unavailable **on an installed build carrying a
/// perfectly good bundled model**, with nothing on screen naming the stray
/// folder as the cause. An escape hatch that is not a usable model is not a
/// choice to respect; it is something to fall through.
fn model_dir(app: &AppHandle) -> PathBuf {
    let user = crate::settings::project_dirs().map(|dirs| dirs.data_dir().join("vosk-model-en"));
    if let Some(dir) = user.filter(|dir| freally_speech::model_is_installed(dir)) {
        return dir;
    }
    app.path()
        .resource_dir()
        .map(|res| res.join("vosk-model-en"))
        .unwrap_or_else(|_| PathBuf::from("vosk-model-en"))
}

/// The model path as a string a C library will accept.
///
/// ⚠️ On Windows this MUST strip the `\\?\` extended-length prefix.
/// `resource_dir()` hands back a canonicalised path, and Rust canonicalisation
/// on Windows always produces the verbatim `\\?\C:\…` form. Rust's own file
/// APIs understand it — which is exactly what makes this so easy to miss, since
/// `Path::exists()` returns true and the capability check happily reports the
/// model as present — but **libvosk is a C library** opening the model with
/// plain file calls, and those reject the prefix outright.
///
/// The result was a build that offered the record button and then failed the
/// moment it was pressed, with "could not load the Vosk model at \\?\C:\…".
/// Only a real installed build shows this: in a dev run the path comes from the
/// manifest directory and carries no prefix.
///
/// Its only caller is the `vosk`-gated loop, but it stays compiled either way so
/// the test below runs in the default build too — this is pure string logic and
/// needs no engine to be worth checking.
#[cfg_attr(not(feature = "vosk"), allow(dead_code))]
fn model_path_for_ffi(dir: &std::path::Path) -> String {
    let text = dir.to_string_lossy().into_owned();
    let Some(rest) = text.strip_prefix(r"\\?\") else {
        return text;
    };
    // A UNC verbatim path (`\\?\UNC\server\share`) needs the real UNC form
    // back, not a bare `UNC\…` which names nothing.
    //
    // Matched case-INSENSITIVELY, like the volume arm below. Windows accepts
    // `\\?\unc\…`, and a case-sensitive test drops it through both arms and
    // hands libvosk `unc\server\share\…` — a relative path, the exact failure
    // both arms exist to prevent.
    if rest
        .get(..4)
        .is_some_and(|head| head.eq_ignore_ascii_case("UNC\\"))
    {
        return format!(r"\\{}", &rest[4..]);
    }
    // A VOLUME GUID path (`\\?\Volume{…}\…`) is what canonicalisation returns
    // for an install under a drive-letterless mounted folder, and it is the one
    // verbatim form with NO plain equivalent: the prefix is the only thing
    // making it absolute. Stripped, `Volume{…}\…` is a RELATIVE path that
    // resolves against the working directory and names nothing anywhere — so
    // this is the one case where the prefix must survive.
    //
    // That may still not be a path libvosk can open. It is the honest failure
    // either way: it is the same path the capability check agreed exists, and a
    // "could not load the model at \\?\Volume{…}" says what is wrong, where a
    // silently-relative path would send the reader hunting in the wrong place.
    if rest
        .get(..7)
        .is_some_and(|head| head.eq_ignore_ascii_case("Volume{"))
    {
        return text;
    }
    rest.to_string()
}

/// Dictation availability for the UI — a serialisable mirror of
/// `freally_speech::SpeechCapability` (that crate stays dependency-free, so the
/// serde lives here).
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SpeechCapabilityDto {
    available: bool,
    engine: String,
    detail: String,
}

impl From<freally_speech::SpeechCapability> for SpeechCapabilityDto {
    fn from(cap: freally_speech::SpeechCapability) -> Self {
        Self {
            available: cap.available,
            engine: cap.engine,
            detail: cap.detail,
        }
    }
}

/// Report whether dictation can run: the `vosk` engine must be built in AND the
/// model installed. The UI hides the record button and shows `detail` otherwise.
#[tauri::command]
pub fn speech_capability(app: AppHandle) -> SpeechCapabilityDto {
    freally_speech::capability(Some(&model_dir(&app))).into()
}

/// Managed state for dictation.
#[derive(Default)]
pub struct DictationState {
    session: crate::session::BackgroundSession,
}

/// Start dictating into the script editor.
///
/// Emits `voice:dictation` with each completed utterance for the UI to insert.
#[tauri::command]
pub fn dictation_start(
    app: AppHandle,
    window: tauri::Window,
    state: State<'_, DictationState>,
) -> Result<(), String> {
    // App commands registered with `generate_handler!` are NOT covered by the
    // capability files, so `projector.json` being deliberately narrow does not
    // stop the projector webview from invoking this. Nothing today can reach it
    // — the CSP is `default-src 'self'` with no inline script, and no component
    // injects HTML — but "opens the microphone" is the one command worth an
    // explicit window check rather than an argument about reachability.
    if window.label() != "main" {
        return Err("dictation can only be started from the main window".into());
    }
    // Resolved ONCE and moved into the thread. `model_dir` stats the data
    // directory and asks Tauri for the resource directory (which on Windows
    // means `current_exe()` plus canonicalisation); doing that again inside the
    // loop would be the same answer for more syscalls.
    let dir = model_dir(&app);
    let cap = freally_speech::capability(Some(&dir));
    if !cap.available {
        return Err(cap.detail);
    }
    state
        .session
        .start(move |stop| std::thread::spawn(move || run_dictation(app, dir, stop)));
    Ok(())
}

/// Stop dictating and release the microphone.
#[tauri::command]
pub fn dictation_stop(state: State<'_, DictationState>) {
    state.session.stop();
}

/// The dictation loop — recognise freely and emit the text.
#[cfg(feature = "vosk")]
fn run_dictation(app: AppHandle, model: PathBuf, stop: Arc<AtomicBool>) {
    use std::sync::atomic::Ordering;

    use freally_speech::{SpeechRecognizer, VoskRecognizer};
    use freally_voice::{AudioSource, CpalSource, Resampler, CANONICAL_SAMPLE_RATE};
    use tauri::Emitter;

    const RATE: u32 = CANONICAL_SAMPLE_RATE;
    let mut recognizer = match VoskRecognizer::new(&model_path_for_ffi(&model), RATE as f32) {
        Ok(recognizer) => recognizer,
        Err(err) => {
            let _ = app.emit("voice:error", err);
            return;
        }
    };
    let mut source = match CpalSource::new() {
        Ok(source) => source,
        Err(err) => {
            let _ = app.emit("voice:error", err);
            return;
        }
    };
    let mut resampler = Resampler::new(source.sample_rate(), RATE);

    // An EMPTY window frees the vocabulary. `freally-speech` can constrain it
    // to a window of the script, but that would let dictation type only words
    // already written — the opposite of the point.
    recognizer.set_grammar(&[]);

    let _ = app.emit("voice:dictating", true);
    let mut block = Vec::new();
    while !stop.load(Ordering::Relaxed) {
        block.clear();
        if !source.read(&mut block) {
            break;
        }
        let resampled = resampler.process(&block);
        if let Some(hypothesis) = recognizer.accept(&resampled) {
            // Silence endpoints as an empty result; emitting it would insert
            // stray spaces into the operator's script.
            let text = hypothesis.text.trim();
            if !text.is_empty() {
                let _ = app.emit("voice:dictation", text.to_string());
            }
        }
    }
    let _ = app.emit("voice:dictating", false);
}

/// Without the `vosk` feature there is no recogniser — `dictation_start` already
/// refuses via the capability check, so this is never reached.
#[cfg(not(feature = "vosk"))]
fn run_dictation(_app: AppHandle, _model: PathBuf, _stop: Arc<AtomicBool>) {}

#[cfg(test)]
mod tests {
    use super::*;

    /// The `\\?\` prefix must not reach libvosk. This shipped once: the
    /// capability check passed (Rust's `exists()` accepts the prefix), the
    /// record button appeared, and pressing it failed with "could not load the
    /// Vosk model at \\?\C:\…" — a path that was, in every other sense, correct.
    ///
    /// "Must not" rather than "never", because of the volume-GUID case below:
    /// there the prefix is the only thing making the path absolute, so dropping
    /// it turns a path that names the model into one that names nothing.
    #[test]
    fn the_ffi_path_is_one_a_c_library_can_open() {
        assert_eq!(
            model_path_for_ffi(std::path::Path::new(
                r"\\?\C:\Program Files\App\vosk-model-en"
            )),
            r"C:\Program Files\App\vosk-model-en",
        );
        // A verbatim UNC path has to come back as a real UNC path, not `UNC\…`
        // — in either case, because Windows accepts either.
        for verbatim in [r"\\?\UNC\server\share\model", r"\\?\unc\server\share\model"] {
            assert_eq!(
                model_path_for_ffi(std::path::Path::new(verbatim)),
                r"\\server\share\model",
            );
        }
        // ...but a volume GUID path KEEPS its prefix: there is no plain form of
        // one, and stripping it leaves a relative path naming nothing. This is
        // an install under a drive-letterless mounted folder.
        for verbatim in [
            r"\\?\Volume{b75e2c83-0000-0000-0000-602f00000000}\Apps\vosk-model-en",
            r"\\?\volume{b75e2c83-0000-0000-0000-602f00000000}\Apps\vosk-model-en",
        ] {
            assert_eq!(model_path_for_ffi(std::path::Path::new(verbatim)), verbatim);
        }
        // Anything already plain is left exactly as it is.
        for plain in [
            r"C:\Apps\model",
            "/usr/share/model",
            r"\\server\share\model",
        ] {
            assert_eq!(model_path_for_ffi(std::path::Path::new(plain)), plain);
        }
    }

    /// The capability CONTRACT — unavailable without a model, in both the `vosk`
    /// and the default build — is tested in `freally-speech`, which owns it and
    /// needs no Tauri app to do it. What this module owns is the SHAPE the UI
    /// reads, and the only part of that with a real contract is the key naming:
    /// `#[serde(rename_all = "camelCase")]` is what makes the payload match
    /// `SpeechCapability` in `ui/src/api/types.ts`. Drop that attribute and the
    /// UI silently reads `undefined` for every field — the record button would
    /// simply never appear, with nothing logged anywhere.
    ///
    /// (Asserting the three fields survive a three-field move proved nothing;
    /// that version could only fail if someone deliberately mis-wired it.)
    #[test]
    fn the_capability_serialises_with_the_key_names_the_ui_reads() {
        let dto: SpeechCapabilityDto = freally_speech::SpeechCapability {
            available: true,
            engine: "vosk".into(),
            detail: "ready".into(),
        }
        .into();

        let json = serde_json::to_value(&dto).expect("the DTO is plain data");
        let object = json.as_object().expect("serialises to an object");
        let mut keys: Vec<&str> = object.keys().map(String::as_str).collect();
        keys.sort_unstable();
        assert_eq!(keys, ["available", "detail", "engine"]);
        assert_eq!(object["available"], serde_json::json!(true));
        assert_eq!(object["engine"], serde_json::json!("vosk"));
        assert_eq!(object["detail"], serde_json::json!("ready"));
    }
}
