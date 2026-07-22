//! Native text-to-speech — the Linux half of read-aloud (FT-16).
//!
//! Windows and macOS speak from the UI through the WebView's `speechSynthesis`,
//! which is a front end for the OS voices already installed (Windows
//! OneCore/SAPI, macOS AVSpeechSynthesis). Linux WebKitGTK usually ships with
//! no speech backend at all, so there the UI falls back to these commands,
//! which shell out to the user's own Speech Dispatcher (`spd-say`) or
//! `espeak-ng`.
//!
//! We deliberately do **not** bundle those engines: they are GPL, and this app
//! is proprietary. Calling the daemon the user already installed keeps the
//! licence boundary at the process edge, where it belongs.

/// Speak `text` at `rate` (a Web-Speech-style multiplier, 1.0 = normal pace).
///
/// Linux only. Everywhere else this returns an error on purpose, so a caller
/// that reached here by mistake falls back to `speechSynthesis` instead of
/// silently going quiet.
#[tauri::command]
pub fn tts_speak(text: String, rate: f32) -> Result<(), String> {
    #[cfg(target_os = "linux")]
    {
        use std::process::Command;
        // Clear anything already queued so a new read replaces the old one
        // rather than being spoken after it.
        let _ = Command::new("spd-say").arg("-C").status();
        // speech-dispatcher's rate is -100..=100; map the multiplier around 1.0.
        let spd_rate = (((rate - 1.0) * 50.0).round() as i32).clamp(-100, 100);
        // `--` terminates the option list, so a script that begins with a dash
        // is spoken rather than parsed as a flag.
        if Command::new("spd-say")
            .args(["-r", &spd_rate.to_string(), "--", &text])
            .spawn()
            .is_ok()
        {
            return Ok(());
        }
        // Fall back to espeak-ng (words per minute ≈ rate × 175).
        let wpm = ((rate * 175.0).round() as i32).clamp(80, 500);
        Command::new("espeak-ng")
            .args(["-s", &wpm.to_string(), "--", &text])
            .spawn()
            .map(|_| ())
            .map_err(|err| {
                format!(
                    "no Linux speech engine found (install speech-dispatcher or espeak-ng): {err}"
                )
            })
    }
    #[cfg(not(target_os = "linux"))]
    {
        let _ = (text, rate);
        Err("native speech is the Linux fallback only; use the WebView speechSynthesis here".into())
    }
}

/// Stop any in-progress native speech (Linux Speech Dispatcher).
#[tauri::command]
pub fn tts_stop() {
    #[cfg(target_os = "linux")]
    {
        let _ = std::process::Command::new("spd-say").arg("-C").status();
    }
}
