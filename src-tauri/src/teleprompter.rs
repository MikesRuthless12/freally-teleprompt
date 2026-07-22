//! The character-based teleprompter engine, ported verbatim from Freally
//! Capture (FT-02).
//!
//! One session-scoped state holds the script, scroll speed, font size, and
//! mirror flag, plus a **lazily computed** scroll offset — `base_offset` at the
//! last control change, advanced by `speed × elapsed` while playing (an
//! `Instant`, so no timer thread and pause reads the exact position). Every
//! surface — the operator preview, the talent projector, and the LAN mirror —
//! reads the same state and animates locally between control changes,
//! resyncing whenever a `teleprompter` event fires.
//!
//! Offset is a fractional **visible-character** index (newlines not counted)
//! and speed is characters/second — a real reading pace that stays sane when a
//! long line wraps to many on-screen rows, and stays in sync across surfaces
//! at different font sizes (a char index is layout-independent).
//!
//! # Invariant
//!
//! [`Inner::offset`] and the TypeScript `liveOffset` in `ui/src/lib/caesura.ts`
//! are the same function — same constants, same piecewise caesura math. That is
//! why the preview and the projector never drift. **Any change to one must
//! change the other**, and both test suites must be re-run.

use std::sync::Mutex;
use std::time::Instant;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager, Runtime};

/// A script this big is almost certainly a paste error — cap the allocation.
const MAX_SCRIPT: usize = 200_000;
/// Scroll speed is in **characters per second** (a real reading pace) so a long
/// wrapped paragraph reads sanely.
pub(crate) const MIN_SPEED: f32 = 1.0;
pub(crate) const MAX_SPEED: f32 = 60.0;
pub(crate) const MIN_FONT: f32 = 12.0;
pub(crate) const MAX_FONT: f32 = 240.0;
/// Multiplier applied by the faster/slower control steps.
const SPEED_STEP: f32 = 1.25;
/// Characters jumped by a single rewind/forward step ("a little bit at a time").
const STEP_CHARS: f32 = 5.0;
/// A ` -- ` caesura pauses the scroll this long by default (seconds).
const CAESURA_DEFAULT_SECS: f32 = 0.75;
/// Cap one caesura pause so a paste error can't wedge the scroll.
const CAESURA_MAX_SECS: f32 = 30.0;
/// Longest numeric field a ` --N ` caesura may carry. Mirrored in `caesura.ts`
/// — see `parse_caesuras` for why the bound is load-bearing, not cosmetic.
const MAX_CAESURA_NUM_CHARS: usize = 8;
/// The user-settable default-pause range for a bare ` -- ` (the operator slider).
pub(crate) const CAESURA_MIN_DEFAULT: f32 = 0.75;
pub(crate) const CAESURA_MAX_DEFAULT: f32 = 2.0;
/// Max start-countdown pre-roll (seconds) before scrolling begins.
pub(crate) const COUNTDOWN_MAX: f32 = 10.0;

// -- appearance (FT-15) -------------------------------------------------------
//
// These ride in the engine rather than staying UI-local because the projector
// and the LAN mirror are separate surfaces that must look identical to the
// preview. One broadcast, one appearance.

/// The reading typefaces the operator may choose, as stable **ids**. The UI maps
/// each id to a CSS font stack; Rust only validates membership, so an unknown id
/// (a hand-edited settings file, a UI from a future build) falls back rather
/// than reaching the DOM as an arbitrary string.
pub(crate) const FONT_FAMILIES: [&str; 6] = ["system", "sans", "serif", "mono", "rounded", "slab"];
/// The default reading typeface — the OS UI font, which is what Phase 0 shipped.
pub(crate) const FONT_FAMILY_DEFAULT: &str = "system";
pub(crate) const MIN_WEIGHT: u16 = 300;
pub(crate) const MAX_WEIGHT: u16 = 900;
/// Horizontal margin as a percentage of the reading stage's width, per side.
pub(crate) const MIN_MARGIN_PCT: f32 = 0.0;
pub(crate) const MAX_MARGIN_PCT: f32 = 25.0;
pub(crate) const MIN_LINE_HEIGHT: f32 = 1.0;
pub(crate) const MAX_LINE_HEIGHT: f32 = 2.5;
/// Reading-guide position, as a percentage down the reading surface. Capped
/// well short of the bottom: a guide below the halfway line leaves almost no
/// upcoming script visible, which defeats the point of a prompter.
pub(crate) const MIN_GUIDE_PCT: f32 = 5.0;
pub(crate) const MAX_GUIDE_PCT: f32 = 50.0;
/// Reading text colour, as `#rrggbb`. White on black is the prompter default.
pub(crate) const TEXT_COLOR_DEFAULT: &str = "#ffffff";

/// Whether `value` is a `#rrggbb` colour. Deliberately strict — the value is
/// handed to the webview as a colour, and "anything the browser might accept"
/// is a much larger surface than six hex digits.
pub(crate) fn is_hex_color(value: &str) -> bool {
    value.len() == 7 && value.starts_with('#') && value[1..].chars().all(|c| c.is_ascii_hexdigit())
}

/// A parsed caesura: a spot where the scroll crawls slowly (pausing), lighting
/// the two dashes one at a time. Positions are in the same `offset` unit the
/// scroll uses -- a GLOBAL visible-character index -- so the timing is one
/// uniform piecewise function that survives line wrapping.
#[derive(Debug, Clone, Copy)]
struct Caesura {
    /// Scroll offset (visible-char index) where the pause begins.
    pos: f32,
    /// Token width in characters (the two dashes we crawl across).
    width: f32,
    /// Pause length in seconds.
    dur: f32,
}

/// Find inline ` -- ` caesuras: exactly two dashes fenced by a space, a newline,
/// or the text edge on each side, with an optional trailing pause length in
/// seconds (` -- ` uses the default; ` --2 ` / ` --0.5 ` set their own). Positions
/// are GLOBAL visible-char indices -- newlines are NOT counted, matching the UI's
/// per-character `data-ch` spans exactly.
fn parse_caesuras(script: &str, default_secs: f32) -> Vec<Caesura> {
    let chars: Vec<char> = script.chars().collect();
    let n = chars.len();
    // Newline as a char value (10), written without a `\n` literal on purpose.
    let is_nl = |c: char| c as u32 == 10;
    let mut out = Vec::new();
    let mut vis = 0usize; // visible-char index (newlines excluded)
    let mut i = 0;
    while i < n {
        if is_nl(chars[i]) {
            i += 1;
            continue;
        }
        let fenced_before = i == 0 || chars[i - 1] == ' ' || is_nl(chars[i - 1]);
        if fenced_before && chars[i] == '-' && i + 1 < n && chars[i + 1] == '-' {
            let mut j = i;
            while j < n && chars[j] == '-' {
                j += 1;
            }
            if j - i == 2 {
                let num_start = j;
                // At most ONE dot, and at most MAX_CAESURA_NUM_CHARS of it.
                // Both bounds exist to keep this parser and its TypeScript twin
                // byte-identical in behaviour: without them the scanner could
                // hand each side a string they read DIFFERENTLY.
                //   `--2.5.3` — Rust's parser rejects it (default 0.75);
                //               JS `parseFloat` prefix-parses it as 2.5.
                //   41 digits — f32 saturates to inf and falls back to 0.75;
                //               f64 stays finite and clamps to 30.
                // Either way the two surfaces dwell for different lengths and
                // drift apart, which is the exact failure the twin exists to
                // prevent. Bounded here, neither side ever sees such a string:
                // the token simply isn't a caesura.
                let mut dots = 0;
                while j < n && (chars[j].is_ascii_digit() || (chars[j] == '.' && dots == 0)) {
                    if chars[j] == '.' {
                        dots += 1;
                    }
                    j += 1;
                }
                let fenced_after = j >= n || chars[j] == ' ' || is_nl(chars[j]);
                if fenced_after && j - num_start <= MAX_CAESURA_NUM_CHARS {
                    let num: String = chars[num_start..j].iter().collect();
                    let dur = num
                        .parse::<f32>()
                        .ok()
                        .filter(|v| v.is_finite())
                        .map(|v| v.clamp(0.0, CAESURA_MAX_SECS))
                        .unwrap_or(default_secs);
                    out.push(Caesura {
                        pos: vis as f32,
                        width: 2.0,
                        dur,
                    });
                    vis += j - i; // consumed dashes + digits are all visible chars
                    i = j;
                    continue;
                }
            }
        }
        vis += 1;
        i += 1;
    }
    out
}

/// The reading appearance (FT-15), kept together so it can be validated,
/// carried, and broadcast as one value instead of six loose parameters.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Look {
    /// A [`FONT_FAMILIES`] id; the UI maps it to a CSS stack.
    pub font_family: String,
    pub font_weight: u16,
    /// `#rrggbb` — the colour of script text that has not been read yet.
    pub text_color: String,
    /// Horizontal margin per side, as a percentage of the stage width.
    pub margin_pct: f32,
    pub line_height: f32,
    /// Reading-guide position, as a percentage down the reading surface.
    pub guide_pct: f32,
}

impl Default for Look {
    fn default() -> Self {
        Self {
            font_family: FONT_FAMILY_DEFAULT.to_string(),
            font_weight: 500,
            text_color: TEXT_COLOR_DEFAULT.to_string(),
            margin_pct: 8.0,
            line_height: 1.5,
            guide_pct: 12.0,
        }
    }
}

impl Look {
    /// Force every field into range. Applied wherever a `Look` arrives from
    /// outside (a settings file, the UI), so no surface can be handed a weight
    /// of 40 000 or a colour that is really a CSS expression.
    pub fn clamp(&mut self) {
        if !FONT_FAMILIES.contains(&self.font_family.as_str()) {
            self.font_family = FONT_FAMILY_DEFAULT.to_string();
        }
        if !is_hex_color(&self.text_color) {
            self.text_color = TEXT_COLOR_DEFAULT.to_string();
        }
        self.font_weight = self.font_weight.clamp(MIN_WEIGHT, MAX_WEIGHT);
        let d = Look::default();
        self.margin_pct = clamp_finite(
            self.margin_pct,
            MIN_MARGIN_PCT,
            MAX_MARGIN_PCT,
            d.margin_pct,
        );
        self.line_height = clamp_finite(
            self.line_height,
            MIN_LINE_HEIGHT,
            MAX_LINE_HEIGHT,
            d.line_height,
        );
        self.guide_pct = clamp_finite(self.guide_pct, MIN_GUIDE_PCT, MAX_GUIDE_PCT, d.guide_pct);
    }
}

/// `value.clamp(lo, hi)`, but a NaN/infinity falls back to `fallback` — Rust's
/// `f32::clamp` propagates NaN, which would then cross the IPC boundary as
/// `null` and break the surface that reads it.
pub(crate) fn clamp_finite(value: f32, lo: f32, hi: f32, fallback: f32) -> f32 {
    if value.is_finite() {
        value.clamp(lo, hi)
    } else {
        fallback
    }
}

struct Inner {
    script: String,
    /// Scroll speed in visible characters per second.
    speed: f32,
    /// Reading font size in px (the reference the preview/projector scale from).
    font_size: f32,
    /// Reading appearance (FT-15) — shared so every surface looks alike.
    look: Look,
    /// Mirror horizontally (for a beam-splitter teleprompter glass).
    mirror: bool,
    /// Scroll offset (visible chars) at the last control change.
    base_offset: f32,
    /// `Some(play-start instant)` while playing; `None` when paused.
    play_started: Option<Instant>,
    /// The default pause (seconds) a bare ` -- ` uses — operator-settable.
    caesura_default: f32,
    /// Caesuras parsed from the current script (sorted by position), where the
    /// scroll crawls slowly to make a pause. Recomputed on script/default change.
    caesuras: Vec<Caesura>,
    /// Total visible characters (newlines excluded); the scroll caps here so the
    /// offset stops at the last line instead of counting past the end.
    total_chars: f32,
    /// Start-countdown pre-roll (seconds) before scrolling begins; 0 = off.
    countdown_secs: f32,
    /// Countdown remaining baked into the CURRENT play session (seconds): the
    /// scroll clock ignores its first `lead_in` seconds, so every surface shows
    /// the same pre-roll and then begins scrolling in sync.
    lead_in: f32,
}

impl Inner {
    /// The current scroll offset (visible chars): the base plus what has
    /// scrolled since play began, or just the base while paused. Caesuras insert
    /// flat crawls: scrolling proceeds at `speed`, but each caesura region (its
    /// two dashes) is traversed over its `dur` seconds instead — a fixed-time
    /// pause regardless of speed, during which the sweep lights the dashes one
    /// at a time. The UI mirrors this exact function so every surface animates
    /// in step.
    fn offset(&self) -> f32 {
        let Some(started) = self.play_started else {
            return self.base_offset.min(self.total_chars);
        };
        let s = self.speed.max(1e-4);
        let mut off = self.base_offset;
        // The scroll clock ignores the first `lead_in` seconds — the pre-roll
        // countdown — so scrolling holds at `base_offset` until it elapses.
        let mut rem = (started.elapsed().as_secs_f32() - self.lead_in).max(0.0);
        // Nothing has elapsed: return the base untouched, matching the TS twin's
        // `if (elapsedSec <= 0) return base`. Without this, a zero-duration
        // caesura sitting exactly at the current offset advanced `off` past it
        // (its crawl costs no time), so the two sides disagreed by 2 characters.
        if rem <= 0.0 {
            return self.base_offset.min(self.total_chars);
        }
        for c in &self.caesuras {
            let end = c.pos + c.width;
            if end <= off {
                continue; // already scrolled past this caesura
            }
            // Scroll normally up to the caesura start (when we're before it).
            if c.pos > off {
                let t = (c.pos - off) / s;
                if rem < t {
                    return off + rem * s;
                }
                rem -= t;
                off = c.pos;
            }
            // Crawl across the remaining part of the region over `dur` seconds.
            let w = c.width.max(1e-6);
            let crawl_time = c.dur * ((end - off) / w);
            if rem < crawl_time {
                return off + (w / c.dur.max(1e-6)) * rem;
            }
            rem -= crawl_time;
            off = end;
        }
        (off + rem * s).min(self.total_chars)
    }

    /// Freeze the current offset into `base_offset` and restart the play clock,
    /// so a change to `speed` (or a resume) is continuous.
    fn rebase(&mut self) {
        self.base_offset = self.offset().max(0.0);
        if let Some(started) = self.play_started {
            // Preserve the remaining pre-roll across a mid-countdown change.
            self.lead_in = (self.lead_in - started.elapsed().as_secs_f32()).max(0.0);
            self.play_started = Some(Instant::now());
        }
    }

    /// Seconds left in the current start-countdown pre-roll (0 when not counting).
    fn countdown_remaining(&self) -> f32 {
        match self.play_started {
            Some(started) => (self.lead_in - started.elapsed().as_secs_f32()).max(0.0),
            None => 0.0,
        }
    }

    /// Stop scrolling, freezing the exact current position.
    fn pause(&mut self) {
        if self.play_started.is_some() {
            self.base_offset = self.offset().max(0.0);
            self.play_started = None;
        }
    }

    /// Start scrolling from the current position (continuous from a pause).
    fn resume(&mut self) {
        if self.play_started.is_none() {
            self.rebase();
            // A start countdown runs only when beginning a take from the top.
            self.lead_in = if self.base_offset <= 0.0 {
                self.countdown_secs
            } else {
                0.0
            };
            self.play_started = Some(Instant::now());
        }
    }

    /// Jump back to the top, keeping the play/pause state.
    fn rewind(&mut self) {
        self.base_offset = 0.0;
        if self.play_started.is_some() {
            // Restate the pre-roll rather than inheriting whatever the take
            // happened to leave behind. `lead_in` is only ever set by `resume`
            // and decremented by `rebase`, so without this line "back to top"
            // replayed leftover state: a full countdown, a partial one, or none
            // at all, for the same click. `resume` already recomputes it for the
            // paused case; this is the playing half of the same rule, and it
            // matches `seek`, which deliberately zeroes it.
            self.lead_in = self.countdown_secs;
            self.play_started = Some(Instant::now());
        }
    }
}

/// Managed state: the shared teleprompter every surface renders.
pub struct TeleprompterState {
    inner: Mutex<Inner>,
}

/// The teleprompter snapshot every surface renders (emitted on every change).
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TeleprompterDto {
    pub script: String,
    pub speed: f32,
    pub font_size: f32,
    /// The shared reading appearance (FT-15).
    pub look: Look,
    pub mirror: bool,
    /// Current scroll offset in visible characters.
    pub offset: f32,
    pub playing: bool,
    /// The default pause (seconds) a bare ` -- ` caesura uses.
    pub caesura_secs: f32,
    /// Start-countdown pre-roll (seconds) before scrolling; 0 = off.
    pub countdown_secs: f32,
    /// Seconds remaining in the current start countdown (0 when not counting).
    pub countdown_remaining: f32,
}

impl TeleprompterState {
    pub fn new() -> Self {
        Self {
            inner: Mutex::new(Inner {
                script: String::new(),
                speed: 12.0,
                font_size: 48.0,
                look: Look::default(),
                mirror: false,
                base_offset: 0.0,
                play_started: None,
                caesura_default: CAESURA_DEFAULT_SECS,
                caesuras: Vec::new(),
                total_chars: 0.0,
                countdown_secs: 0.0,
                lead_in: 0.0,
            }),
        }
    }

    /// Adopt the reading preferences from a settings snapshot.
    ///
    /// The single point where persisted preferences reach the live engine —
    /// called once at startup and again on every `settings_set`. Keeping it here
    /// (rather than fanning the IPC calls out of the UI) means no surface can
    /// forget the wiring: the projector and the LAN mirror read the same state,
    /// and a settings apply reaches all of them through one broadcast.
    ///
    /// Every value is re-clamped by the setters below, so a hand-edited
    /// settings file cannot push the engine out of range.
    pub fn adopt_settings(&self, settings: &crate::settings::Settings) {
        self.set_speed(settings.speed);
        self.set_font(settings.font_size);
        self.set_caesura_secs(settings.caesura_secs);
        self.set_countdown(settings.countdown_secs);
        self.set_mirror(settings.mirror);
        self.set_look(settings.look.clone());
    }

    fn lock(&self) -> std::sync::MutexGuard<'_, Inner> {
        self.inner
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
    }

    /// The current snapshot for a surface to render.
    pub fn dto(&self) -> TeleprompterDto {
        let inner = self.lock();
        TeleprompterDto {
            script: inner.script.clone(),
            speed: inner.speed,
            font_size: inner.font_size,
            look: inner.look.clone(),
            mirror: inner.mirror,
            offset: inner.offset().max(0.0),
            playing: inner.play_started.is_some(),
            caesura_secs: inner.caesura_default,
            countdown_secs: inner.countdown_secs,
            countdown_remaining: inner.countdown_remaining(),
        }
    }

    /// Replace the script (truncated to the cap) and rewind to the top.
    pub fn set_script(&self, text: String) {
        let mut inner = self.lock();
        inner.script = if text.len() > MAX_SCRIPT {
            text.chars().take(MAX_SCRIPT).collect()
        } else {
            text
        };
        inner.caesuras = parse_caesuras(&inner.script, inner.caesura_default);
        inner.total_chars = inner.script.chars().filter(|&c| c as u32 != 10).count() as f32;
        inner.rewind();
    }

    /// Set the default pause (seconds) a bare ` -- ` uses (clamped to the slider
    /// range) and re-parse so existing bare caesuras adopt the new length.
    pub fn set_caesura_secs(&self, secs: f32) {
        let mut inner = self.lock();
        // Freeze the current position first so re-timing the caesuras mid-play is
        // continuous (no visible jump), mirroring set_speed.
        inner.rebase();
        inner.caesura_default = secs.clamp(CAESURA_MIN_DEFAULT, CAESURA_MAX_DEFAULT);
        inner.caesuras = parse_caesuras(&inner.script, inner.caesura_default);
    }

    /// Set the start-countdown pre-roll (seconds) before scrolling; 0 disables it.
    /// Takes effect on the next play from the top (an in-progress take is
    /// unaffected).
    pub fn set_countdown(&self, secs: f32) {
        self.lock().countdown_secs = secs.clamp(0.0, COUNTDOWN_MAX);
    }

    pub fn set_speed(&self, speed: f32) {
        let mut inner = self.lock();
        inner.rebase();
        inner.speed = speed.clamp(MIN_SPEED, MAX_SPEED);
    }

    pub fn set_font(&self, font_size: f32) {
        self.lock().font_size = font_size.clamp(MIN_FONT, MAX_FONT);
    }

    /// Replace the reading appearance (FT-15), clamped — the caller may be a
    /// hand-edited settings file or a UI from another build.
    pub fn set_look(&self, mut look: Look) {
        look.clamp();
        self.lock().look = look;
    }

    pub fn set_mirror(&self, mirror: bool) {
        self.lock().mirror = mirror;
    }

    /// Apply a control action (play / pause / toggle / faster / slower / top).
    /// `value` is the target speed for `setSpeed`.
    pub fn apply(&self, action: &str, value: Option<f32>) -> Result<(), String> {
        let mut inner = self.lock();
        match action {
            "play" | "start" => inner.resume(),
            "pause" | "stop" => inner.pause(),
            "toggle" => {
                if inner.play_started.is_some() {
                    inner.pause();
                } else {
                    inner.resume();
                }
            }
            "faster" => {
                inner.rebase();
                inner.speed = (inner.speed * SPEED_STEP).clamp(MIN_SPEED, MAX_SPEED);
            }
            "slower" => {
                inner.rebase();
                inner.speed = (inner.speed / SPEED_STEP).clamp(MIN_SPEED, MAX_SPEED);
            }
            "setSpeed" => {
                let v = value.ok_or("setSpeed needs a value")?;
                inner.rebase();
                inner.speed = v.clamp(MIN_SPEED, MAX_SPEED);
            }
            // Nudge the reading position a little without changing play state
            // (rewind/fast-forward "a little bit at a time"). `value` overrides
            // the default step (chars); negative steps back.
            "stepBack" => {
                inner.rebase();
                inner.base_offset =
                    (inner.base_offset - value.unwrap_or(STEP_CHARS).abs()).max(0.0);
            }
            "stepForward" => {
                inner.rebase();
                inner.base_offset =
                    (inner.base_offset + value.unwrap_or(STEP_CHARS).abs()).min(inner.total_chars);
            }
            // Jump to an absolute scroll position (visible chars from the top) —
            // the seek bar's scrubber. Keeps the play/pause state; a playing
            // scroll continues from where it was dropped.
            "seek" => {
                let v = value.ok_or("seek needs a value")?;
                inner.base_offset = v.clamp(0.0, inner.total_chars);
                // Scrubbing cancels any remaining start-countdown pre-roll, so the
                // scroll resumes from the seeked position instead of re-holding and
                // flashing the countdown again.
                inner.lead_in = 0.0;
                if inner.play_started.is_some() {
                    inner.play_started = Some(Instant::now());
                }
            }
            "top" | "reset" | "rewind" => inner.rewind(),
            other => return Err(format!("unknown teleprompter action: {other}")),
        }
        Ok(())
    }
}

impl Default for TeleprompterState {
    fn default() -> Self {
        Self::new()
    }
}

/// Emit the current snapshot so every surface resyncs.
pub(crate) fn broadcast<R: Runtime>(app: &AppHandle<R>) {
    let dto = app.state::<TeleprompterState>().dto();
    if let Err(err) = app.emit("teleprompter", dto) {
        eprintln!("teleprompter: emit failed: {err}");
    }
}

/// Push a settings snapshot into the live engine and resync every surface.
///
/// The one path from persisted preferences to the running teleprompter. Called
/// at startup (so the app opens at the user's speed and font) and by
/// `settings_set` (so Apply takes effect immediately, everywhere).
pub fn apply_settings<R: Runtime>(app: &AppHandle<R>, settings: &crate::settings::Settings) {
    app.state::<TeleprompterState>().adopt_settings(settings);
    broadcast(app);
}

/// The control entry point shared by the UI transport, hotkeys, and the LAN
/// mirror. Applies the action and broadcasts.
pub fn control<R: Runtime>(
    app: &AppHandle<R>,
    action: &str,
    value: Option<f32>,
) -> Result<(), String> {
    app.state::<TeleprompterState>().apply(action, value)?;
    broadcast(app);
    Ok(())
}

// -- commands -----------------------------------------------------------------

/// The current teleprompter snapshot (a surface's initial read).
#[tauri::command]
pub fn teleprompter_get(state: tauri::State<'_, TeleprompterState>) -> TeleprompterDto {
    state.dto()
}

#[tauri::command]
pub fn teleprompter_set_script(
    app: AppHandle,
    state: tauri::State<'_, TeleprompterState>,
    text: String,
) {
    state.set_script(text);
    broadcast(&app);
}

#[tauri::command]
pub fn teleprompter_set_speed(
    app: AppHandle,
    state: tauri::State<'_, TeleprompterState>,
    speed: f32,
) {
    state.set_speed(speed);
    broadcast(&app);
}

#[tauri::command]
pub fn teleprompter_set_font(
    app: AppHandle,
    state: tauri::State<'_, TeleprompterState>,
    size: f32,
) {
    state.set_font(size);
    broadcast(&app);
}

#[tauri::command]
pub fn teleprompter_set_mirror(
    app: AppHandle,
    state: tauri::State<'_, TeleprompterState>,
    mirror: bool,
) {
    state.set_mirror(mirror);
    broadcast(&app);
}

#[tauri::command]
pub fn teleprompter_set_caesura(
    app: AppHandle,
    state: tauri::State<'_, TeleprompterState>,
    secs: f32,
) {
    state.set_caesura_secs(secs);
    broadcast(&app);
}

#[tauri::command]
pub fn teleprompter_set_countdown(
    app: AppHandle,
    state: tauri::State<'_, TeleprompterState>,
    secs: f32,
) {
    state.set_countdown(secs);
    broadcast(&app);
}

/// Play / pause / toggle / faster / slower / top — also reachable from hotkeys
/// and the LAN mirror.
#[tauri::command]
pub fn teleprompter_control(
    app: AppHandle,
    action: String,
    value: Option<f32>,
) -> Result<(), String> {
    control(&app, &action, value)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn play_advances_and_pause_freezes() {
        let s = TeleprompterState::new();
        s.set_script("a".repeat(100));
        s.set_speed(10.0);
        assert_eq!(s.dto().offset, 0.0);
        s.apply("play", None).unwrap();
        std::thread::sleep(std::time::Duration::from_millis(50));
        let mid = s.dto().offset;
        assert!(mid > 0.0, "playing advances the offset");
        s.apply("pause", None).unwrap();
        let paused = s.dto().offset;
        std::thread::sleep(std::time::Duration::from_millis(30));
        assert_eq!(s.dto().offset, paused, "paused offset is frozen");
        assert!(paused >= mid);
    }

    #[test]
    fn top_rewinds_and_toggle_flips() {
        let s = TeleprompterState::new();
        s.apply("play", None).unwrap();
        assert!(s.dto().playing);
        s.apply("toggle", None).unwrap();
        assert!(!s.dto().playing, "toggle pauses");
        s.apply("top", None).unwrap();
        assert_eq!(s.dto().offset, 0.0);
    }

    #[test]
    fn speed_steps_stay_bounded_and_continuous() {
        let s = TeleprompterState::new();
        for _ in 0..40 {
            s.apply("faster", None).unwrap();
        }
        assert!(s.dto().speed <= MAX_SPEED);
        for _ in 0..80 {
            s.apply("slower", None).unwrap();
        }
        assert!(s.dto().speed >= MIN_SPEED);
    }

    #[test]
    fn set_script_caps_length_and_rewinds() {
        let s = TeleprompterState::new();
        s.set_script("a".repeat(500));
        // Scroll a little, then pause at a nonzero offset.
        s.apply("play", None).unwrap();
        std::thread::sleep(std::time::Duration::from_millis(30));
        s.apply("pause", None).unwrap();
        assert!(s.dto().offset > 0.0, "scrolled to a nonzero offset");
        // A new script rewinds to the top — checked while paused, so the
        // assertion is exact and free of any scheduling-timing dependency.
        s.set_script("x".repeat(MAX_SCRIPT + 1000));
        assert_eq!(s.dto().script.len(), MAX_SCRIPT);
        assert_eq!(s.dto().offset, 0.0, "a new script rewinds to the top");
    }

    #[test]
    fn step_nudges_position_and_clamps_at_top() {
        let s = TeleprompterState::new();
        s.set_script("a".repeat(100));
        // Forward twice, then back once — net one step forward.
        s.apply("stepForward", None).unwrap();
        s.apply("stepForward", None).unwrap();
        let after_two = s.dto().offset;
        assert!(after_two > 0.0, "stepForward advances the offset");
        s.apply("stepBack", None).unwrap();
        assert!(s.dto().offset < after_two, "stepBack retreats the offset");
        // Stepping back past the top clamps at 0, never negative.
        for _ in 0..10 {
            s.apply("stepBack", None).unwrap();
        }
        assert_eq!(s.dto().offset, 0.0, "stepBack clamps at the top");
    }

    #[test]
    fn parses_inline_caesuras() {
        let d = CAESURA_DEFAULT_SECS;
        // Default duration; position = dash column / line length.
        let cs = parse_caesuras("aaaaa -- bbbbb", d);
        assert_eq!(cs.len(), 1);
        // "aaaaa " = 6 visible chars, so the first dash is at visible index 6.
        assert!((cs[0].pos - 6.0).abs() < 1e-4);
        assert!((cs[0].dur - d).abs() < 1e-6);

        // Custom seconds override the default.
        assert!((parse_caesuras("go --2 stop", d)[0].dur - 2.0).abs() < 1e-6);
        assert!((parse_caesuras("go --0.5 stop", d)[0].dur - 0.5).abs() < 1e-6);

        // A bare caesura adopts whatever default it's given.
        assert!((parse_caesuras("a -- b", 1.5)[0].dur - 1.5).abs() < 1e-6);

        // NOT caesuras: bullets, hyphenated words, three dashes, unfenced.
        assert!(parse_caesuras("- a bullet line", d).is_empty());
        assert!(parse_caesuras("well-known term", d).is_empty());
        assert!(parse_caesuras("a --- b", d).is_empty());
        assert!(parse_caesuras("a--b", d).is_empty());

        // Nor a multi-dot number, nor an over-long one. These used to be read
        // DIFFERENTLY by the two twins — JS `parseFloat` prefix-parses "2.5.3"
        // as 2.5 where Rust rejects it, and f64 keeps a 41-digit number finite
        // where f32 saturates to inf — so the surfaces dwelled for different
        // lengths and drifted. Excluded on both sides now; the matching TS
        // cases live in `caesura.test.ts`.
        assert!(parse_caesuras("a --2.5.3 b", d).is_empty());
        assert!(parse_caesuras("a --1..2 b", d).is_empty());
        assert!(parse_caesuras("a --0.5. b", d).is_empty());
        assert!(parse_caesuras(&format!("a --{} b", "9".repeat(41)), d).is_empty());
        // Exactly at the shared cap is still a caesura; one over is not.
        assert_eq!(parse_caesuras("a --12345678 b", d).len(), 1);
        assert!((parse_caesuras("a --12345678 b", d)[0].dur - CAESURA_MAX_SECS).abs() < 1e-6);
        assert!(parse_caesuras("a --123456789 b", d).is_empty());

        // Line edges count as a fence; the second line indexes correctly.
        let cs = parse_caesuras("-- first\nlast --", d);
        assert_eq!(cs.len(), 2);
        // Global visible-char indices (the newline is not counted): "-- first" is
        // 8 visible chars (0..7), then "last " → the second "--" starts at 13.
        assert_eq!(cs[0].pos.floor() as i32, 0);
        assert_eq!(cs[1].pos.floor() as i32, 13);
    }

    #[test]
    fn caesura_makes_the_end_take_longer() {
        // The same text reaches the end later when it contains a caesura pause.
        let plain = TeleprompterState::new();
        plain.set_speed(40.0);
        plain.set_script("aaaaaaaa bbbbbbbb".to_string());
        let cae = TeleprompterState::new();
        cae.set_speed(40.0);
        cae.set_script("aaaaaaaa --2 bbbbbbbb".to_string());
        // Advance both a fixed wall-time; the caesura one should lag (it dwells).
        plain.apply("play", None).unwrap();
        cae.apply("play", None).unwrap();
        std::thread::sleep(std::time::Duration::from_millis(300));
        assert!(
            cae.dto().offset < plain.dto().offset,
            "the caesura scroll dwells and falls behind"
        );
    }

    #[test]
    fn unknown_action_is_refused() {
        let s = TeleprompterState::new();
        assert!(s.apply("explode", None).is_err());
    }

    #[test]
    fn countdown_holds_the_scroll_then_releases_it() {
        let s = TeleprompterState::new();
        s.set_script("a".repeat(200));
        s.set_speed(40.0);
        s.set_countdown(0.2); // 200ms pre-roll
        s.apply("play", None).unwrap();
        // Right after play: counting down, no scroll yet.
        assert_eq!(s.dto().offset, 0.0, "no scroll during the countdown");
        assert!(s.dto().playing, "the take is engaged during the countdown");
        assert!(
            s.dto().countdown_remaining > 0.0,
            "the countdown is ticking down"
        );
        // After the pre-roll elapses, scrolling begins and the countdown is done.
        std::thread::sleep(std::time::Duration::from_millis(320));
        assert!(s.dto().offset > 0.0, "scrolls once the countdown elapses");
        assert_eq!(s.dto().countdown_remaining, 0.0, "countdown finished");
    }

    /// Persisted preferences must actually reach the engine. Before this
    /// existed, `settings_set` wrote the file and stopped: the speed/font/
    /// mirror/caesura/countdown sliders edited a document nothing read, so
    /// Apply appeared to do nothing at all.
    #[test]
    fn adopt_settings_moves_prefs_into_the_engine() {
        let s = TeleprompterState::new();
        s.set_script("a".repeat(400));
        let before = s.dto();
        assert_eq!(before.speed, 12.0, "the built-in default");

        s.adopt_settings(&crate::settings::Settings {
            speed: 30.0,
            font_size: 96.0,
            caesura_secs: 1.5,
            countdown_secs: 3.0,
            mirror: true,
            look: Look {
                font_family: "serif".to_string(),
                font_weight: 700,
                text_color: "#ffcc00".to_string(),
                margin_pct: 4.0,
                line_height: 1.8,
                guide_pct: 30.0,
            },
            ..Default::default()
        });

        let after = s.dto();
        assert_eq!(after.speed, 30.0);
        assert_eq!(after.font_size, 96.0);
        assert_eq!(after.caesura_secs, 1.5);
        assert_eq!(after.countdown_secs, 3.0);
        assert!(after.mirror);
        // FT-15: the appearance rides along, or the projector and the LAN
        // mirror would keep rendering the previous look.
        assert_eq!(after.look.font_family, "serif");
        assert_eq!(after.look.font_weight, 700);
        assert_eq!(after.look.text_color, "#ffcc00");
        assert_eq!(after.look.guide_pct, 30.0);
    }

    /// The engine re-clamps whatever it is handed, so a hand-edited settings
    /// file cannot drive it out of range even though `Settings::validate`
    /// already ran.
    #[test]
    fn adopt_settings_clamps_out_of_range_values() {
        let s = TeleprompterState::new();
        s.adopt_settings(&crate::settings::Settings {
            speed: 9_000.0,
            font_size: 1.0,
            caesura_secs: 99.0,
            countdown_secs: 900.0,
            mirror: false,
            look: Look {
                // A CSS expression, not a colour; a font nobody offers; a
                // weight no renderer has — each must fall back, not pass through.
                font_family: "url(https://evil.example/x)".to_string(),
                font_weight: 40_000,
                text_color: "red; background: url(x)".to_string(),
                margin_pct: f32::NAN,
                line_height: 99.0,
                guide_pct: 0.0,
            },
            ..Default::default()
        });

        let dto = s.dto();
        assert_eq!(dto.speed, MAX_SPEED);
        assert_eq!(dto.font_size, MIN_FONT);
        assert_eq!(dto.caesura_secs, CAESURA_MAX_DEFAULT);
        assert_eq!(dto.countdown_secs, COUNTDOWN_MAX);
        assert_eq!(dto.look.font_family, FONT_FAMILY_DEFAULT);
        assert_eq!(dto.look.font_weight, MAX_WEIGHT);
        assert_eq!(dto.look.text_color, TEXT_COLOR_DEFAULT);
        assert_eq!(dto.look.margin_pct, Look::default().margin_pct);
        assert_eq!(dto.look.line_height, MAX_LINE_HEIGHT);
        assert_eq!(dto.look.guide_pct, MIN_GUIDE_PCT);
    }

    /// Only `#rrggbb` is a colour. Everything else — a named colour, a shorthand
    /// hex, a CSS function — falls back, because the value is handed straight to
    /// the webview as the reading text colour.
    #[test]
    fn only_six_digit_hex_is_accepted_as_a_colour() {
        assert!(is_hex_color("#ffffff"));
        assert!(is_hex_color("#0A1b2C"));
        assert!(!is_hex_color("#fff"));
        assert!(!is_hex_color("ffffff"));
        assert!(!is_hex_color("#gggggg"));
        assert!(!is_hex_color("red"));
        assert!(!is_hex_color("rgb(1,2,3)"));
        assert!(!is_hex_color(""));
    }

    /// "Back to top" must restate the pre-roll, not inherit leftover state.
    /// Before this, the same Restart click could replay a full countdown, a
    /// partial one, or none at all, depending on what the take left behind.
    #[test]
    fn rewind_restates_the_countdown_instead_of_inheriting_it() {
        let s = TeleprompterState::new();
        s.set_script("a".repeat(400));
        s.set_speed(40.0);
        s.set_countdown(5.0);

        // Play from the top and let the whole pre-roll elapse, so `lead_in`
        // is spent and the scroll is genuinely running.
        s.apply("play", None).unwrap();
        std::thread::sleep(std::time::Duration::from_millis(60));
        // A speed change mid-take rebases, which is what used to zero `lead_in`
        // and leave Restart with no pre-roll at all.
        s.apply("faster", None).unwrap();

        s.apply("top", None).unwrap();
        let dto = s.dto();
        assert_eq!(dto.offset, 0.0, "back at the top");
        assert!(
            (dto.countdown_remaining - 5.0).abs() < 0.2,
            "the full pre-roll is restated, not inherited: got {}",
            dto.countdown_remaining
        );
    }

    #[test]
    fn countdown_only_runs_from_the_top() {
        let s = TeleprompterState::new();
        s.set_script("a".repeat(200));
        s.set_speed(40.0);
        s.set_countdown(5.0);
        // Nudge off the top, then play: no pre-roll when resuming mid-script.
        s.apply("stepForward", None).unwrap();
        s.apply("play", None).unwrap();
        assert_eq!(
            s.dto().countdown_remaining,
            0.0,
            "resuming mid-script skips the countdown"
        );
    }
}
