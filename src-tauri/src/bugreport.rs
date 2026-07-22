//! Opt-in, anonymous problem reporting (FT-06) — **nothing auto-sends, no
//! telemetry, no server we run, no credentials shipped.**
//!
//! Implements `../../HAVOC-STANDARD-bug-report-and-updater.md`, which is
//! normative for all seven Freally apps. A panic hook captures a **scrubbed**
//! crash report to a local file; the next launch offers to report it. The
//! "Report a problem" dialog shows the user the **exact** text that will be
//! sent and lets them submit it as a pre-filled **GitHub issue**, a **Gmail**
//! draft, or a **`mailto:`** to their own client — all three are explicit
//! clicks on a pre-filled window the user still has to send. Diagnostics carry
//! the app version + OS/arch and (when there was one) a crash excerpt with the
//! home path and username redacted; never script text, file paths, or anything
//! the user typed that they have not read here first.
//!
//! One deliberate exception to "no personal identifiers": a crash excerpt is
//! stamped with **when** it happened, in the machine's local time (with its UTC
//! offset) and in UTC. The offset narrows the reporter to a timezone, which is
//! weakly identifying — it is included because a crash reported days later is
//! otherwise impossible to order or correlate, and because the user reads the
//! exact text before anything is sent. Nothing finer (locale, hostname, IP) is
//! collected.
//!
//! # The crash loop
//!
//! A dying app cannot show its own error window — the webview goes away with the
//! process. So the panic hook spawns **this same executable** as a tiny
//! Tauri-free helper (`--crash-notice <pid>`) and lets the process die. The
//! helper shows a native "stopped unexpectedly" box, waits for the crashed
//! process to actually leave the process table, and relaunches. The relaunched
//! app finds the crash file and opens the report dialog (see `ui/src/App.tsx`).
//!
//! [`run_crash_notice`] must be called from `main` **before** the Tauri app is
//! built: the helper is not the app, and building a second app would fight the
//! first over the window, the settings file, and the single-instance lock.
//!
//! The notice fires **only when a panic is guaranteed to be fatal** — release
//! profiles set `panic = "abort"`. Under `unwind` (debug) a worker-thread panic
//! leaves the app running and a "restart?" box would be a lie; there the hook
//! keeps its other behaviour of writing the file and nothing else.
//!
//! To drill the loop on demand, launch with `--test-crash` (see
//! [`arm_test_crash`]): it exits explicitly, so it behaves identically in both
//! profiles. There is deliberately **no button and no IPC command** for it — a
//! "crash the app" control has no business shipping in a live prompter.

use std::path::PathBuf;
use std::time::Duration;

use serde::Serialize;

/// This app's name — in the subject line and the body, so a report that lands in
/// the shared inbox is instantly attributable to the right Havoc app.
const APP_NAME: &str = "Freally Teleprompt";
/// The project's issue tracker (a pre-filled URL the user submits — no token).
const GITHUB_NEW_ISSUE: &str = "https://github.com/MikesRuthless12/freally-teleprompt/issues/new";
/// Where an emailed report goes (the user's own mail client sends it).
const REPORT_EMAIL: &str = "mythodikalone@gmail.com";
/// Gmail's web compose window. Plain https — no API key, no token, and nothing
/// is sent until the user clicks Send. A signed-out user meets Google's login
/// screen and is returned to the pre-filled draft. Offered *alongside*
/// `mailto:`, which stays the path for anyone not using Gmail.
const GMAIL_COMPOSE: &str = "https://mail.google.com/mail/?view=cm&fs=1";
/// Bounds on the **percent-encoded** body. A character cap cannot bound a URL:
/// one 3-byte character (`—`, `“`) encodes to nine. Browsers take ~32 k, so the
/// https targets are generous; `mailto:` rides Windows' ShellExecute, which in
/// practice truncates near 2048 characters and then opens nothing at all — a
/// blank window, no error. "Copy report" always carries the untruncated text.
const MAX_GITHUB_ENCODED: usize = 6000;
const MAX_GMAIL_ENCODED: usize = 6000;
/// The whole `mailto:` URL — scheme, address, subject and body together — stays
/// under this. ShellExecute practically dies near 2048; leave a margin.
const MAX_MAILTO_URL: usize = 1900;
/// …of which the subject may claim at most this much, so a pathological subject
/// can never starve the body of every byte.
const MAX_MAILTO_SUBJECT_ENCODED: usize = 300;
/// Argv flag that turns this executable into the post-crash notice helper:
/// `freally-teleprompt --crash-notice <pid-of-the-process-that-died>`.
const CRASH_NOTICE_FLAG: &str = "--crash-notice";
/// Argv flag that crashes the app on purpose a few seconds after launch, to
/// drill the crash loop. Deliberately not a button and not an IPC command.
const TEST_CRASH_FLAG: &str = "--test-crash";
/// How long the helper waits for the crashed process to leave the process table
/// before relaunching anyway. Relaunching over a corpse that still holds the
/// settings file open is how a "restart" ends up with no app at all.
const EXIT_WAIT: Duration = Duration::from_millis(250);
const EXIT_WAIT_TRIES: u32 = 40; // ≤ 10 s, then relaunch regardless

/// Where crash reports are written: a `crash-reports` folder under the same
/// per-OS app directory `settings.rs` uses, so one uninstall clears both.
fn crash_dir() -> Option<PathBuf> {
    // Shares `settings.rs`'s identity helper on purpose: same app directory, so
    // one uninstall clears both — enforced by the call rather than by comment.
    crate::settings::project_dirs().map(|dirs| dirs.data_dir().join("crash-reports"))
}

/// Redact the OS user's home path and bare username from `text`, so a report
/// carries no personal identifiers. The report is always shown to the user
/// before it can be sent, so over-redaction is safe and under-redaction visible.
pub fn scrub(text: &str) -> String {
    let mut out = text.to_string();
    if let Some(dirs) = directories::UserDirs::new() {
        let home = dirs.home_dir().to_string_lossy().to_string();
        // `/` is a real home for some service accounts and containers.
        // Replacing it would rewrite every slash in the report
        // ("Panic at src<home>bugreport.rs"), so skip anything that short.
        if home.len() > 1 {
            out = out.replace(&home, "<home>");
            if let Some(name) = std::path::Path::new(&home)
                .file_name()
                .and_then(|n| n.to_str())
            {
                if name.len() >= 3 {
                    out = replace_whole_word(&out, name, "<user>");
                }
            }
        }
    }
    out
}

/// `str::replace`, but only where `needle` is not glued to an alphanumeric
/// neighbour on either side.
///
/// A plain `replace` shreds the payload the report exists to carry: a user
/// called `max` turned `core::cmp::max` into `core::cmp::<user>`,
/// `max_offset` into `<user>_offset`, and the panic message "maximum speed
/// exceeded" into "<user>imum speed exceeded" — invisibly, in exactly the text
/// a developer needs to read. Short usernames are common, so this is the
/// normal case, not an edge one.
fn replace_whole_word(haystack: &str, needle: &str, with: &str) -> String {
    // Spelled as a match rather than `is_none_or`, which is newer than the
    // workspace MSRV (1.80). A string edge counts as a boundary.
    let bounded = |c: Option<char>| match c {
        None => true,
        Some(c) => !c.is_alphanumeric() && c != '_',
    };
    let mut out = String::with_capacity(haystack.len());
    let mut rest = haystack;
    while let Some(hit) = rest.find(needle) {
        let before = rest[..hit].chars().next_back();
        let after = rest[hit + needle.len()..].chars().next();
        out.push_str(&rest[..hit]);
        if bounded(before) && bounded(after) {
            out.push_str(with);
        } else {
            out.push_str(needle);
        }
        rest = &rest[hit + needle.len()..];
    }
    out.push_str(rest);
    out
}

/// The always-anonymous system line (no personal data).
pub fn diagnostics() -> String {
    format!(
        "App: {APP_NAME} {}\nOS: {} / {}\n",
        env!("CARGO_PKG_VERSION"),
        std::env::consts::OS,
        std::env::consts::ARCH,
    )
}

/// Install the panic hook (call once from `main`): a panic writes a scrubbed
/// crash report to the local crash-reports folder, then the previous hook runs.
pub fn install_panic_hook() {
    let previous = std::panic::take_hook();
    // The closure's `info` type is inferred rather than named, so this compiles
    // on the 1.80 MSRV — `PanicHookInfo` only stabilized in 1.81.
    std::panic::set_hook(Box::new(move |info| {
        let location = info
            .location()
            .map(|loc| format!("{}:{}", loc.file(), loc.line()))
            .unwrap_or_else(|| "unknown".to_string());
        let message = info
            .payload()
            .downcast_ref::<&str>()
            .map(|s| (*s).to_string())
            .or_else(|| info.payload().downcast_ref::<String>().cloned())
            .unwrap_or_else(|| "(no message)".to_string());
        let backtrace = std::backtrace::Backtrace::force_capture();
        let raw = format!("Panic at {location}\nMessage: {message}\n\nBacktrace:\n{backtrace}\n");
        write_crash(&scrub(&raw));
        // Only when this panic is certain to kill the process. Release profiles
        // set `panic = "abort"`; under unwind a worker thread can panic while
        // the app keeps running, and an error box offering to restart would be
        // a lie. `--test-crash` exits by hand, so the drill still works in debug.
        if cfg!(panic = "abort") {
            spawn_crash_notice();
        }
        previous(info);
    }));
}

/// Spawn this same executable as the `--crash-notice` helper and hand it our
/// pid. It outlives us: it waits for this process to disappear, then relaunches
/// the app. Best-effort — a failure here just means no error window, and the
/// crash report is still on disk for the next manual launch.
///
/// At most once per process. `panic = "abort"` does not stop the world
/// instantly, so two threads can panic closely enough to run the hook twice —
/// which would put **two** "stopped unexpectedly" dialogs on screen for one
/// crash. The atomic swap is what makes the second one a no-op.
fn spawn_crash_notice() {
    static SPAWNED: std::sync::atomic::AtomicBool = std::sync::atomic::AtomicBool::new(false);
    if SPAWNED.swap(true, std::sync::atomic::Ordering::SeqCst) {
        return;
    }
    let Ok(exe) = std::env::current_exe() else {
        return;
    };
    let _ = std::process::Command::new(exe)
        .arg(CRASH_NOTICE_FLAG)
        .arg(std::process::id().to_string())
        .spawn();
}

/// `SYNCHRONIZE` — the only access right needed to wait on a process handle.
/// windows-sys files this constant under `Win32::Storage::FileSystem` (typed as
/// a `FILE_ACCESS_RIGHTS`), so importing it would mean compiling a whole
/// filesystem module for one integer. Its value is fixed by the Win32 ABI.
#[cfg(windows)]
const SYNCHRONIZE: u32 = 0x0010_0000;

/// Is `pid` still in the process table?
///
/// A handle is the right question to ask on Windows: `OpenProcess` still
/// succeeds for a process that has *exited* while someone holds a handle to it,
/// so existence alone would read a corpse as alive forever. The handle is
/// signalled exactly when the process has ended, and holding it pins the pid so
/// this cannot be answered about a recycled one.
#[cfg(windows)]
fn process_alive(pid: u32) -> bool {
    use windows_sys::Win32::Foundation::{CloseHandle, WAIT_OBJECT_0};
    use windows_sys::Win32::System::Threading::{OpenProcess, WaitForSingleObject};

    // SAFETY: `OpenProcess` only reads `pid` and returns a null handle on
    // failure, which is checked before the handle is used; every path that
    // obtains a handle closes it.
    unsafe {
        let handle = OpenProcess(SYNCHRONIZE, 0, pid);
        if handle.is_null() {
            // Already reaped (or never ours to wait on) — either way there is
            // nothing left to wait for.
            return false;
        }
        let signalled = WaitForSingleObject(handle, 0) == WAIT_OBJECT_0;
        CloseHandle(handle);
        !signalled
    }
}

/// Is `pid` still in the process table?
///
/// Signal 0 runs `kill`'s existence and permission checks without delivering
/// anything. Identity is the raw pid, so a pid the OS has already recycled onto
/// an unrelated process reads as "still alive"; the cost is bounded and benign,
/// because [`wait_for_exit`] relaunches once its timeout is spent either way.
#[cfg(unix)]
fn process_alive(pid: u32) -> bool {
    // SAFETY: `kill` takes two integers by value and touches no memory of ours.
    if unsafe { libc::kill(pid as libc::pid_t, 0) } == 0 {
        return true;
    }
    // `EPERM` means the process is there but not ours to signal. Only `ESRCH`
    // ("no such process") means the corpse has actually been reaped.
    std::io::Error::last_os_error().raw_os_error() == Some(libc::EPERM)
}

/// Block until the crashed process is gone (bounded — we relaunch regardless
/// rather than strand the user with no app).
fn wait_for_exit(pid: u32) {
    for _ in 0..EXIT_WAIT_TRIES {
        if !process_alive(pid) {
            return;
        }
        std::thread::sleep(EXIT_WAIT);
    }
}

/// With no pid to watch there is nothing to poll, so wait a fixed interval
/// instead of relaunching immediately. "No pid" must never mean "no wait": that
/// is the exact race this helper exists to lose gracefully.
fn wait_blind() {
    std::thread::sleep(EXIT_WAIT * 8);
}

/// If argv says we are the `--crash-notice <pid>` helper, run that whole flow
/// and return `true` so `main` returns without ever building a Tauri app.
/// Otherwise return `false` and let the app boot normally.
pub fn run_crash_notice(args: &[String]) -> bool {
    let Some(flag_at) = args.iter().position(|arg| arg == CRASH_NOTICE_FLAG) else {
        return false;
    };
    let dead_pid = args
        .get(flag_at + 1)
        .and_then(|arg| arg.parse::<u32>().ok());

    // Native on every OS: `MessageBoxW` on Windows, `NSAlert` on macOS, GTK3 on
    // Linux. If the dialog cannot open at all, `rfd` reports `Cancel` —
    // indistinguishable from the user declining — so the app simply stays
    // closed. The crash report is on disk either way and the next launch
    // surfaces it, making the worst case the old manual-relaunch behaviour.
    let answer = rfd::MessageDialog::new()
        .set_level(rfd::MessageLevel::Error)
        .set_title("Freally Teleprompt stopped unexpectedly")
        .set_description(
            "The prompter hit an unexpected error and had to close.\n\n\
             A crash report was saved on this machine. Nothing has been sent \
             anywhere. If you restart, you can read the exact report and choose \
             to send it as a GitHub issue or by email.\n\n\
             Restart Freally Teleprompt now?",
        )
        .set_buttons(rfd::MessageButtons::YesNo)
        .show();

    if answer != rfd::MessageDialogResult::Yes {
        return true;
    }

    // The corpse still holds the settings file and its window; relaunching over
    // it is how a "restart" ends with no app at all.
    match dead_pid {
        Some(pid) => wait_for_exit(pid),
        // A malformed or absent pid must not mean "skip the wait".
        None => wait_blind(),
    }
    if let Ok(exe) = std::env::current_exe() {
        let _ = std::process::Command::new(exe).spawn();
    }
    true
}

/// When the crash happened, written into the report itself — the file's own
/// mtime does not survive being pasted into an issue or an email, and a crash
/// is often reported days later.
///
/// Both clocks are given: the user's wall clock (so *they* recognise the
/// moment) and UTC (so reports from anywhere can be ordered without timezone
/// arithmetic). The `%z` offset is the one weakly identifying piece of data in
/// the report — see the note on [`scrub`].
fn crash_time_line() -> String {
    let now = chrono::Local::now();
    format!(
        "Crashed: {} (UTC {})",
        now.format("%Y-%m-%d %H:%M:%S %z"),
        now.with_timezone(&chrono::Utc).format("%Y-%m-%d %H:%M:%S"),
    )
}

fn write_crash(scrubbed: &str) {
    let Some(dir) = crash_dir() else { return };
    if std::fs::create_dir_all(&dir).is_err() {
        return;
    }
    let ts = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    let stamped = format!("{}\n{scrubbed}", crash_time_line());
    // The thread id disambiguates two panics landing in the same millisecond.
    // `write_crash` runs BEFORE the `SPAWNED` guard — both threads must get
    // their report written, only one may show a dialog — so the collision is
    // genuinely reachable. `fs::write` truncates, and two interleaved writes
    // could leave a partial UTF-8 sequence that `read_to_string` then refuses,
    // losing BOTH reports while the file sits there looking fine.
    let tid: String = format!("{:?}", std::thread::current().id())
        .chars()
        .filter(char::is_ascii_alphanumeric)
        .collect();
    let _ = std::fs::write(dir.join(format!("crash-{ts}-{tid}.txt")), stamped);
}

/// The newest pending crash report (already scrubbed), if any.
pub fn pending_crash() -> Option<String> {
    let dir = crash_dir()?;
    // Collect every candidate and try them newest-first, rather than betting
    // everything on the single newest entry: one unreadable file — a
    // subdirectory named `notes.txt`, a file an AV scanner has briefly locked,
    // or a report corrupted by a same-millisecond collision — used to make
    // `pending_crash` return `None` and silently bury a perfectly good older
    // report. The `crash-` prefix and the is-file check keep a stray text file
    // dropped in this folder from being presented to the user AS a crash.
    let mut candidates: Vec<(u128, PathBuf)> = Vec::new();
    for entry in std::fs::read_dir(&dir).ok()?.flatten() {
        if !entry.file_type().map(|t| t.is_file()).unwrap_or(false) {
            continue;
        }
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) != Some("txt") {
            continue;
        }
        if !entry.file_name().to_string_lossy().starts_with("crash-") {
            continue;
        }
        let mtime = entry
            .metadata()
            .ok()
            .and_then(|m| m.modified().ok())
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_millis())
            .unwrap_or(0);
        candidates.push((mtime, path));
    }
    candidates.sort_by_key(|(mtime, _)| std::cmp::Reverse(*mtime));
    candidates
        .into_iter()
        .find_map(|(_, path)| std::fs::read_to_string(path).ok())
}

/// Delete the pending crash reports (the user dismissed or sent them).
pub fn clear_crashes() {
    if let Some(dir) = crash_dir() {
        let _ = std::fs::remove_dir_all(dir);
    }
}

/// Percent-encode a query component (RFC 3986 unreserved characters kept).
fn urlencode(s: &str) -> String {
    let mut out = String::with_capacity(s.len() * 3);
    for byte in s.as_bytes() {
        match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                out.push(*byte as char)
            }
            _ => out.push_str(&format!("%{byte:02X}")),
        }
    }
    out
}

fn truncate_chars(s: &str, max: usize) -> String {
    if s.chars().count() <= max {
        return s.to_string();
    }
    let mut out: String = s.chars().take(max).collect();
    out.push_str("\n… (truncated — use “Copy report” for the full text)");
    out
}

/// Percent-encode `s`, stopping before the **encoded** form outgrows
/// `max_encoded`. Truncating by character count cannot bound a URL, because a
/// single 3-byte character expands to nine encoded ones — an 1800-character
/// crash excerpt reaches ~7800 encoded, well past what `mailto:` survives.
/// Always cuts on a character boundary, never mid-escape.
fn encode_bounded(s: &str, max_encoded: usize) -> String {
    encode_bounded_with(
        s,
        max_encoded,
        "\n… (truncated — use “Copy report” for the full text)",
    )
}

/// [`encode_bounded`] without the truncation note — for fields where a trailing
/// sentence would be absurd, like a subject line.
fn encode_capped(s: &str, max_encoded: usize) -> String {
    encode_bounded_with(s, max_encoded, "")
}

/// Percent-encode `s` so the result never exceeds `max_encoded` bytes, appending
/// `note` (itself encoded, and reserved out of the budget) when anything was
/// cut. Whole encoded characters only — never half of a `%E2%80%94`.
fn encode_bounded_with(s: &str, max_encoded: usize, note: &str) -> String {
    let full = urlencode(s);
    if full.len() <= max_encoded {
        return full;
    }
    let note = urlencode(note);
    let budget = max_encoded.saturating_sub(note.len());
    let mut out = String::with_capacity(max_encoded);
    let mut buf = [0u8; 4];
    for ch in s.chars() {
        let piece = urlencode(ch.encode_utf8(&mut buf));
        if out.len() + piece.len() > budget {
            break;
        }
        out.push_str(&piece);
    }
    out.push_str(&note);
    out
}

/// A pre-filled GitHub "new issue" URL (the user submits it while signed in —
/// no token, no server).
fn github_url(title: &str, body: &str) -> String {
    format!(
        "{GITHUB_NEW_ISSUE}?labels=bug&title={}&body={}",
        urlencode(&truncate_chars(title, 200)),
        encode_bounded(body, MAX_GITHUB_ENCODED),
    )
}

/// A pre-filled `mailto:` URL (the user's own mail client sends it).
///
/// The bound is on the **whole URL**, not on the body alone. Bounding only the
/// body leaves the scheme, the address and the subject uncounted — and a subject
/// is user text: [`error_summary`] caps it at 80 characters, but 80 CJK
/// characters encode to 720 bytes and 80 emoji to 960. A non-English report
/// could therefore still cross the ~2048 mark where Windows' ShellExecute opens
/// a blank window and reports no error, which is the exact failure this bound
/// exists to prevent.
fn mailto_url(subject: &str, body: &str) -> String {
    let head = format!(
        "mailto:{REPORT_EMAIL}?subject={}&body=",
        encode_capped(&truncate_chars(subject, 200), MAX_MAILTO_SUBJECT_ENCODED),
    );
    let budget = MAX_MAILTO_URL.saturating_sub(head.len());
    format!("{head}{}", encode_bounded(body, budget))
}

/// A pre-filled Gmail web-compose URL. Unlike `mailto:` this never depends on a
/// registered mail handler — the browser opens Google's composer with the
/// recipient, subject and body filled in, and Google's login screen first if the
/// user is signed out. Nothing sends without the user's click.
fn gmail_url(subject: &str, body: &str) -> String {
    format!(
        "{GMAIL_COMPOSE}&to={}&su={}&body={}",
        urlencode(REPORT_EMAIL),
        urlencode(&truncate_chars(subject, 200)),
        encode_bounded(body, MAX_GMAIL_ENCODED),
    )
}

/// The scheme allowlist. Only the two shapes this module builds are openable:
/// a `file:` or `javascript:` URL handed to the OS handler is a way out of the
/// webview's sandbox, and a control character is a way to smuggle a second
/// argument past a handler that re-parses the string.
fn vet_url(url: &str) -> Result<(), String> {
    if !(url.starts_with("https://") || url.starts_with("mailto:")) {
        return Err("refusing to open a non-https/mailto URL".into());
    }
    if url.chars().any(char::is_control) {
        return Err("invalid URL".into());
    }
    Ok(())
}

/// Hand a vetted URL to the OS default handler, as a **single argv entry** —
/// never through a shell, so nothing in the URL can be read as a command.
fn open_url_in_os(url: &str) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    let mut command = {
        let mut command = std::process::Command::new("rundll32");
        command.arg("url.dll,FileProtocolHandler");
        command
    };
    #[cfg(target_os = "macos")]
    let mut command = std::process::Command::new("open");
    // Every other desktop target this app builds for is an XDG one.
    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    let mut command = std::process::Command::new("xdg-open");

    command
        .arg(url)
        .spawn()
        .map(|_| ())
        .map_err(|err| format!("could not open the link: {err}"))
}

/// A short one-line summary of the error for the subject: the crash's panic
/// message if there was one, else the first line of the user's description,
/// else a generic label. One line, bounded length.
fn error_summary(crash: Option<&str>, description: &str) -> String {
    let from_crash = crash.and_then(|c| {
        c.lines()
            .find_map(|line| line.strip_prefix("Message: "))
            .map(str::to_string)
    });
    let raw = from_crash
        .filter(|s| !s.trim().is_empty())
        .or_else(|| {
            description
                .lines()
                .map(str::trim)
                .find(|line| !line.is_empty())
                .map(str::to_string)
        })
        .unwrap_or_else(|| {
            if crash.is_some() {
                "crash report".to_string()
            } else {
                "bug report".to_string()
            }
        });
    // One line, bounded — the rest lives in the body.
    let one_line: String = raw.split_whitespace().collect::<Vec<_>>().join(" ");
    if one_line.chars().count() > 80 {
        format!("{}…", one_line.chars().take(80).collect::<String>())
    } else {
        one_line
    }
}

/// The subject line: `[<App>] <error summary>` — which app + what went wrong.
fn subject(crash: Option<&str>, description: &str) -> String {
    format!("[{APP_NAME}] {}", error_summary(crash, description))
}

/// How the report body is rendered. The content is identical either way — only
/// the syntax around it changes.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum BodyStyle {
    /// GitHub renders it: `###` headings and a fenced diagnostics block.
    Markdown,
    /// Mail clients do not — they show `###` and ``` as literal noise.
    Plain,
}

/// Build the full report body from the user's note + diagnostics (+ crash).
fn compose_body(description: &str, crash: Option<&str>, style: BodyStyle) -> String {
    let markdown = style == BodyStyle::Markdown;
    let mut body = String::new();

    body.push_str(if markdown {
        "### What happened\n"
    } else {
        "WHAT HAPPENED\n"
    });
    body.push_str(if description.trim().is_empty() {
        "(no description provided)"
    } else {
        description.trim()
    });

    body.push_str(if markdown {
        "\n\n### Anonymous diagnostics (no personal data)\n```\n"
    } else {
        "\n\nANONYMOUS DIAGNOSTICS (no personal data)\n"
    });
    body.push_str(&format!("From: {APP_NAME}\n"));
    body.push_str(&diagnostics());
    if let Some(crash) = crash {
        body.push_str("\n--- crash excerpt ---\n");
        body.push_str(crash);
    }
    body.push_str(if markdown { "\n```\n" } else { "\n" });

    // Belt-and-suspenders: scrub the whole assembled body once more, since the
    // user's own description can carry a path we have never seen.
    scrub(&body)
}

// -- commands -----------------------------------------------------------------

/// One target's report: the exact text and the pre-filled URL that opens it.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BugReport {
    /// The report as **plain text** — what the dialog shows and what "Copy
    /// report" copies. The GitHub URL carries the same content as Markdown;
    /// same information, different syntax.
    pub text: String,
    /// The pre-filled URL, already bounded for its target. Opening it only
    /// fills a window in — the user still has to press send.
    pub url: String,
}

/// The scrubbed crash report from the previous run, or `null` after a clean
/// one. Reading it sends nothing; it is a local file.
#[tauri::command]
pub fn bug_report_pending() -> Option<String> {
    pending_crash()
}

/// Build the report for `target` (`"github"` | `"gmail"` | `"email"`) from the
/// user's note plus the pending crash excerpt, if there is one. Builds only —
/// opening the returned URL is a second, explicit step ([`open_url`]).
#[tauri::command]
pub fn bug_report_build(target: String, description: String) -> Result<BugReport, String> {
    let crash = pending_crash();
    let crash = crash.as_deref();
    // Scrub the user's note ONCE, up front, before anything derives from it.
    //
    // The subject is built from this text when there is no crash message to
    // summarise, and it rides into `title=` / `subject=` / `su=` on the URL —
    // so without this a note like "crashes when I open
    // C:\Users\mike\Documents\show.ftscript" put the home path and username in
    // the URL unredacted, even though the body shown in the preview was clean.
    // Scrubbing here rather than after capping also matters: capping first can
    // cut a home path in half, and a half path no longer matches.
    let description = scrub(&description);
    // Subject: [Freally Teleprompt] <what went wrong> — the app + the error.
    let subject = subject(crash, &description);
    let text = compose_body(&description, crash, BodyStyle::Plain);
    let url = match target.as_str() {
        "github" => github_url(
            &subject,
            &compose_body(&description, crash, BodyStyle::Markdown),
        ),
        "gmail" => gmail_url(&subject, &text),
        "email" => mailto_url(&subject, &text),
        other => return Err(format!("unknown report target: {other}")),
    };
    Ok(BugReport { text, url })
}

/// Dismiss + delete the pending crash report(s).
#[tauri::command]
pub fn bug_report_clear_crash() {
    clear_crashes();
}

/// Open one of this module's URLs with the OS default handler. This Tauri
/// webview never follows an `<a target="_blank">` out to the system browser, so
/// the UI hands the URL here instead. Allowlisted to `https:`/`mailto:` and
/// passed as a single argv entry — a `file:`/`javascript:` URL is refused.
#[tauri::command]
pub fn open_url(url: String) -> Result<(), String> {
    vet_url(&url)?;
    open_url_in_os(&url)
}

/// `--test-crash`: let the app start normally, then kill it a few seconds in, so
/// the whole crash → error window → restart → report loop can be drilled the way
/// a user would actually meet it. The relaunch carries no arguments, so it comes
/// back clean rather than crashing again.
///
/// This is a **drill hook, not a feature**: no button, no IPC command, nothing a
/// user can reach by clicking. `exit(101)` (a panic-like code) rather than a
/// real `panic!` makes it behave identically under debug's `unwind` and
/// release's `abort`, so the shipped exe drills exactly as it ships.
pub fn arm_test_crash(args: &[String]) {
    if !args.iter().any(|arg| arg == TEST_CRASH_FLAG) {
        return;
    }
    eprintln!("{TEST_CRASH_FLAG}: this process will crash on purpose in 5 seconds");
    std::thread::spawn(|| {
        std::thread::sleep(Duration::from_secs(5));
        write_crash(&scrub(
            "Panic at src/testcrash.rs:1\nMessage: TEST CRASH — triggered by --test-crash; no \
             real fault occurred.\n\nBacktrace:\n(test)\n",
        ));
        spawn_crash_notice();
        std::process::exit(101);
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn scrub_redacts_home_and_username() {
        // Whatever the real home is, scrubbing must remove it.
        let Some(dirs) = directories::UserDirs::new() else {
            return;
        };
        let home = dirs.home_dir().to_string_lossy().to_string();
        if home.is_empty() {
            return;
        }
        let scrubbed = scrub(&format!("error opening {home}/Scripts/pilot.ftscript"));
        assert!(!scrubbed.contains(&home), "home path must be redacted");
        assert!(scrubbed.contains("<home>"), "and replaced by a placeholder");
    }

    /// The bare username leaks through text the home path never covers — a
    /// Windows short path, a library's log line — so it is replaced on its own
    /// too. (Inside a home path it is already gone: that replacement runs first.)
    /// A short username must not shred the payload the report exists to carry.
    /// `str::replace` turned `core::cmp::max` into `core::cmp::<user>` and
    /// "maximum speed exceeded" into "<user>imum speed exceeded" — invisibly.
    #[test]
    fn replace_whole_word_leaves_glued_matches_alone() {
        let f = |s: &str| replace_whole_word(s, "max", "<user>");
        // Genuinely the username: bounded by separators or the string edges.
        assert_eq!(f(r"C:\Users\max\Documents"), r"C:\Users\<user>\Documents");
        assert_eq!(f("max"), "<user>");
        assert_eq!(f("user max here"), "user <user> here");
        // NOT the username — these are the ones that used to be shredded.
        assert_eq!(f("core::cmp::max_offset"), "core::cmp::max_offset");
        assert_eq!(f("maximum speed exceeded"), "maximum speed exceeded");
        assert_eq!(f("climax"), "climax");
        assert_eq!(f("max_offset"), "max_offset");
    }

    #[test]
    fn scrub_redacts_the_bare_username() {
        let Some(dirs) = directories::UserDirs::new() else {
            return;
        };
        let Some(name) = std::path::Path::new(dirs.home_dir())
            .file_name()
            .and_then(|n| n.to_str())
        else {
            return;
        };
        if name.len() < 3 {
            return; // too short to redact without shredding unrelated words
        }
        assert_eq!(scrub(name), "<user>");
    }

    #[test]
    fn urlencode_escapes_unsafe_and_keeps_unreserved() {
        assert_eq!(urlencode("a b&c"), "a%20b%26c");
        assert_eq!(urlencode("Aa0-_.~"), "Aa0-_.~");
        assert_eq!(urlencode("líne\n"), "l%C3%ADne%0A");
    }

    #[test]
    fn github_and_mailto_urls_are_wellformed_and_bounded() {
        let long = "x".repeat(20_000);
        let gh = github_url("Bug report", &long);
        assert!(gh.starts_with("https://github.com/MikesRuthless12/freally-teleprompt/"));
        assert!(gh.contains("labels=bug"));
        assert!(gh.len() < 10_000, "github url must be bounded");

        let mail = mailto_url("Bug report", &long);
        assert!(mail.starts_with("mailto:mythodikalone@gmail.com?"));
        assert!(mail.len() <= MAX_MAILTO_URL, "mailto url must be bounded");
    }

    /// The bound must hold on the *encoded* length. Multi-byte characters expand
    /// 9x, so a character-count cap let a real crash excerpt push the `mailto:`
    /// URL past ~2048 — where Windows silently opens a blank window.
    #[test]
    fn multibyte_bodies_cannot_blow_past_the_mailto_url_limit() {
        // Every char is 3 bytes → 9 encoded chars each. 2000 chars → ~18k.
        let body = "—".repeat(2_000);
        assert!(
            urlencode(&body).len() > 17_000,
            "premise: encoding inflates 9x"
        );

        let mail = mailto_url("Bug report", &body);
        assert!(
            mail.len() < 2_048,
            "mailto url must stay under the ShellExecute limit, was {}",
            mail.len()
        );
    }

    /// The whole URL is bounded, subject included. A subject is user text, and
    /// an 80-character CJK summary encodes to 720 bytes — bounding only the body
    /// let the total cross 2048, where Windows opens a blank window and reports
    /// nothing. The backtrace is the other half of that pathological case.
    #[test]
    fn a_cjk_subject_and_a_full_backtrace_stay_under_the_url_limit() {
        let subject = format!("[{APP_NAME}] {}", "崩壊".repeat(40));
        // A realistic release backtrace: ~120 frames of symbol soup, with a few
        // em dashes and an emoji from the user's own note mixed in.
        let mut body = String::from("WHAT HAPPENED\nプロンプターが落ちた 🔥 — 途中で\n\n");
        for frame in 0..120 {
            body.push_str(&format!(
                "  {frame:>3}: 0x7ff6c0de{frame:04x} - \
                 freally_teleprompt::teleprompter::Inner::offset::h0123456789abcdef\n"
            ));
        }
        assert!(urlencode(&subject).len() > 700, "premise: subject inflates");
        assert!(urlencode(&body).len() > 10_000, "premise: body is huge");

        let mail = mailto_url(&subject, &body);
        assert!(
            mail.len() <= MAX_MAILTO_URL,
            "whole mailto url must be bounded, was {}",
            mail.len()
        );
        assert!(mail.starts_with("mailto:mythodikalone@gmail.com?subject="));
        assert!(mail.contains("&body="), "a body must survive the subject");
        let sent = mail.split("&body=").nth(1).expect("a body part exists");
        assert!(!sent.is_empty(), "the body must not be starved to nothing");
    }

    /// Even an absurd subject leaves room for a body.
    #[test]
    fn the_subject_cannot_starve_the_body() {
        let mail = mailto_url(&"🔥".repeat(200), "it broke");
        assert!(mail.len() <= MAX_MAILTO_URL);
        let body = mail.split("&body=").nth(1).expect("a body part exists");
        assert!(!body.is_empty(), "body must not be empty");
    }

    /// A subject carries no "… (truncated)" sentence — that belongs in a body.
    #[test]
    fn encode_capped_truncates_without_a_note() {
        let out = encode_capped(&"a".repeat(500), 10);
        assert_eq!(out, "a".repeat(10));
        assert!(!out.contains("truncated"));
        assert_eq!(encode_capped("short", 100), "short");
    }

    /// Truncation must never cut a `%E2%80%94` escape in half — a dangling `%`
    /// or a one-digit escape makes the whole URL unparseable.
    #[test]
    fn encode_bounded_never_splits_an_escape() {
        for budget in [0, 1, 5, 9, 10, 17, 100, 500] {
            for source in ["—".repeat(50), "🔥".repeat(50), "崩壊".repeat(50)] {
                let out = encode_bounded(&source, budget);
                let bytes = out.as_bytes();
                for (i, b) in bytes.iter().enumerate() {
                    if *b == b'%' {
                        assert!(i + 2 < bytes.len(), "dangling escape at budget {budget}");
                        assert!(bytes[i + 1].is_ascii_hexdigit(), "bad escape at {budget}");
                        assert!(bytes[i + 2].is_ascii_hexdigit(), "bad escape at {budget}");
                    }
                }
            }
        }
    }

    #[test]
    fn gmail_url_composes_to_the_report_address() {
        let gm = gmail_url("[Freally Teleprompt] boom", "it broke");
        assert!(gm.starts_with("https://mail.google.com/mail/?view=cm&fs=1"));
        // Recipient, subject and body are pre-filled; no token, no API key.
        assert!(gm.contains("&to=mythodikalone%40gmail.com"));
        assert!(gm.contains("&su=%5BFreally%20Teleprompt%5D%20boom"));
        assert!(gm.contains("&body=it%20broke"));
        assert!(!gm.contains("key="), "no API key ever rides this URL");

        let long = gmail_url("Bug report", &"—".repeat(2_000));
        assert!(long.len() < 10_000, "gmail url must be bounded");
    }

    /// A normal launch must never be mistaken for the crash-notice helper, or
    /// the app would show an error box instead of booting.
    #[test]
    fn run_crash_notice_ignores_a_normal_launch() {
        assert!(!run_crash_notice(&["freally-teleprompt.exe".to_string()]));
        assert!(!run_crash_notice(&[
            "freally-teleprompt.exe".to_string(),
            "C:/scripts/pilot.ftscript".to_string(),
        ]));
        assert!(!run_crash_notice(&[
            "freally-teleprompt.exe".to_string(),
            TEST_CRASH_FLAG.to_string(),
        ]));
    }

    /// The allowlist is the whole security boundary on `open_url`: a `file:` or
    /// `javascript:` URL handed to the OS handler escapes the webview, and a
    /// control character can smuggle a second argument past a re-parsing handler.
    #[test]
    fn vet_url_allows_only_https_and_mailto() {
        assert!(vet_url("https://github.com/MikesRuthless12/freally-teleprompt").is_ok());
        assert!(vet_url("mailto:mythodikalone@gmail.com?subject=hi").is_ok());

        assert!(vet_url("file:///etc/passwd").is_err());
        assert!(vet_url("file://C:/Windows/System32/calc.exe").is_err());
        assert!(vet_url("javascript:alert(1)").is_err());
        assert!(vet_url("JavaScript:alert(1)").is_err());
        assert!(vet_url("http://insecure.example/").is_err());
        assert!(vet_url("").is_err());

        // Control characters, including the ones a naive handler would treat as
        // an argument separator.
        assert!(vet_url("https://ok.example/\u{7}").is_err());
        assert!(vet_url("https://ok.example/\npayload").is_err());
        assert!(vet_url("https://ok.example/\r\nBcc: x").is_err());
        assert!(vet_url("mailto:a@b.example\u{0}").is_err());
    }

    /// Everything this module builds must pass its own gate.
    #[test]
    fn every_url_this_module_builds_is_openable() {
        for target in ["github", "gmail", "email"] {
            let report = bug_report_build(target.to_string(), "it broke — 途中で".to_string())
                .expect("a known target builds");
            assert!(
                vet_url(&report.url).is_ok(),
                "{target} url must pass the allowlist: {}",
                report.url
            );
            assert!(report.text.contains("WHAT HAPPENED"));
        }
        // And an unknown target is refused rather than silently opening nothing.
        assert!(bug_report_build("ftp".to_string(), String::new()).is_err());
    }

    #[test]
    fn compose_body_is_scrubbed_and_labeled() {
        for style in [BodyStyle::Markdown, BodyStyle::Plain] {
            let body = compose_body("it broke", Some("crash text"), style);
            assert!(body.to_lowercase().contains("what happened"));
            assert!(body.to_lowercase().contains("anonymous diagnostics"));
            assert!(body.contains("From: Freally Teleprompt"));
            assert!(body.contains("crash text"));
        }
    }

    /// GitHub renders Markdown; a mail client would show `###` and ``` as
    /// literal noise. Same information, different syntax.
    #[test]
    fn only_the_github_body_carries_markdown() {
        let md = compose_body("it broke", None, BodyStyle::Markdown);
        assert!(md.contains("### What happened"));
        assert!(md.contains("```"));

        let plain = compose_body("it broke", None, BodyStyle::Plain);
        assert!(plain.contains("WHAT HAPPENED"));
        assert!(!plain.contains('#'), "no markdown headings in a mail body");
        assert!(!plain.contains("```"), "no code fences in a mail body");

        // The payload itself is identical — only the wrapper changed.
        for needle in ["it broke", "From: Freally Teleprompt", "OS: "] {
            assert!(
                md.contains(needle) && plain.contains(needle),
                "{needle} must survive"
            );
        }
    }

    #[test]
    fn subject_names_the_app_and_the_error() {
        // A crash → the panic message rides the subject.
        let crash = "Panic at src/x.rs:1\nMessage: index out of bounds\nBacktrace:\n";
        assert_eq!(
            subject(Some(crash), ""),
            "[Freally Teleprompt] index out of bounds"
        );

        // A manual report → the description's first line.
        assert_eq!(
            subject(None, "the scroll jumps when I change speed\nmore detail"),
            "[Freally Teleprompt] the scroll jumps when I change speed"
        );

        // Nothing useful → a generic, still app-tagged subject.
        assert_eq!(subject(None, "   "), "[Freally Teleprompt] bug report");

        // Long summaries are bounded to one line.
        let long = format!("Message: {}", "x ".repeat(200));
        let bounded = subject(Some(&format!("Panic\n{long}")), "");
        assert!(bounded.chars().count() <= "[Freally Teleprompt] ".len() + 81);
    }

    /// The crash stamp is what makes a report received days later orderable:
    /// the user's own wall clock WITH its offset, and UTC.
    #[test]
    fn crash_time_carries_local_offset_and_utc() {
        let line = crash_time_line();
        assert!(line.starts_with("Crashed: "));
        assert!(line.contains("(UTC "), "the UTC clock must be there too");
        // `%z` renders as +HHMM / -HHMM — the offset that makes "local" mean
        // something to anyone but the reporter.
        let local = line
            .trim_start_matches("Crashed: ")
            .split(" (UTC ")
            .next()
            .expect("a local half");
        let offset = local.rsplit(' ').next().expect("an offset");
        assert_eq!(offset.len(), 5, "expected +HHMM, got {offset}");
        assert!(offset.starts_with('+') || offset.starts_with('-'));
        assert!(offset[1..].chars().all(|c| c.is_ascii_digit()));
    }
}
