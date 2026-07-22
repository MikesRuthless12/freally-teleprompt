//! The LAN mirror (FT-12) — a read-only view of the running script, served to
//! a phone, tablet, or second laptop on the operator's own network.
//!
//! One tiny HTTP responder over `std::net`, **off by default**, serving exactly
//! two things: the mirror page itself, and the teleprompter snapshot it polls.
//! There is no write path — nothing a browser sends can change the scroll, the
//! script, or any setting. That is the single biggest reason this is a much
//! smaller thing than Freally Capture's LAN control panel, which it is
//! otherwise modelled on.
//!
//! # Security posture, stated plainly
//!
//! * **Off by default.** While off, no socket is opened at all.
//! * **Loopback unless asked otherwise.** Turning the mirror on and pointing it
//!   at the LAN are two separate switches, so "on" never silently means
//!   "reachable by the coffee-shop wifi".
//! * **A session key on every request.** It is generated fresh each launch,
//!   never persisted, and rides in the URL (`?k=…`) so scanning the QR just
//!   works.
//! * **Plain HTTP.** The key therefore crosses the wire in cleartext, which is
//!   fine on a trusted studio LAN and not fine on an untrusted one. The
//!   Settings copy says so rather than implying a security property we do not
//!   have.
//! * **Read-only.** Even a correct key can only *look*.
//!
//! # Why the page does not re-implement the caesura maths
//!
//! The scroll timing exists twice already — `teleprompter.rs` and its
//! byte-for-byte TypeScript twin — and a third copy in a page nobody compiles
//! would drift the first time one of the other two changed. Instead the mirror
//! polls the authoritative offset ~10×/second and eases between samples with a
//! CSS transition. It follows the same character offset every other surface
//! uses; it simply does not try to predict it.

use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use tauri::{AppHandle, Manager};

use crate::settings::{Settings, SettingsStore};

/// The mirror page. Fully self-contained — no CDN, no web font, no analytics —
/// so it renders on a machine with no internet at all.
const MIRROR_HTML: &str = include_str!("../assets/mirror.html");

/// Hard cap on one request. The mirror only ever receives short GETs.
const MAX_REQUEST_BYTES: usize = 8 * 1024;
/// How long a client may dawdle mid-request before we drop it.
const IO_TIMEOUT: Duration = Duration::from_secs(10);
/// Session-key length in hex characters (12 random bytes).
const KEY_HEX_CHARS: usize = 24;

/// A fresh session key: 12 bytes from the OS CSPRNG, hex-encoded.
fn new_key() -> String {
    let mut bytes = [0u8; KEY_HEX_CHARS / 2];
    // A failure here means the OS could not give us randomness, which is not
    // something to paper over with a predictable fallback: the mirror simply
    // will not start, and `status()` reports why.
    if getrandom::fill(&mut bytes).is_err() {
        return String::new();
    }
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}

struct Server {
    shutdown: Arc<AtomicBool>,
    port: u16,
}

/// Stopping the server is dropping it: the accept loop polls this flag between
/// non-blocking accepts and returns, which releases the port.
impl Drop for Server {
    fn drop(&mut self) {
        self.shutdown.store(true, Ordering::Relaxed);
    }
}

/// Managed state: the running server (when on) and this session's key.
pub struct LanMirrorState {
    server: Mutex<Option<Server>>,
    key: String,
    /// Why the last start attempt failed, so Settings can say so instead of
    /// showing a switch that is on next to a mirror that is not running.
    error: Mutex<Option<String>>,
}

impl Default for LanMirrorState {
    fn default() -> Self {
        Self {
            server: Mutex::new(None),
            key: new_key(),
            error: Mutex::new(None),
        }
    }
}

fn lock<T>(mutex: &Mutex<T>) -> std::sync::MutexGuard<'_, T> {
    mutex
        .lock()
        .unwrap_or_else(std::sync::PoisonError::into_inner)
}

/// What the mirror is doing right now — the Settings panel's whole view of it.
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MirrorStatus {
    pub running: bool,
    /// The full URL to open (key included), or `None` while the mirror is off.
    pub url: Option<String>,
    /// Why it is not running, when the user asked for it to be.
    pub error: Option<String>,
}

/// A best-effort address for this machine on the LAN, for the printed URL.
///
/// This performs **no traffic**: a UDP "connect" to a private address only asks
/// the OS which interface it *would* use, and we then read that interface's own
/// address. Nothing is sent and nothing leaves the machine.
fn local_ip() -> Option<String> {
    let socket = std::net::UdpSocket::bind("0.0.0.0:0").ok()?;
    socket.connect("192.168.1.1:9").ok()?;
    Some(socket.local_addr().ok()?.ip().to_string())
}

impl LanMirrorState {
    pub fn status(&self, all_interfaces: bool) -> MirrorStatus {
        let guard = lock(&self.server);
        match guard.as_ref() {
            Some(server) => {
                // Loopback mode gets a loopback URL on purpose: printing a LAN
                // address for a socket bound to 127.0.0.1 would be an invitation
                // to a connection that cannot succeed.
                let host = if all_interfaces {
                    local_ip().unwrap_or_else(|| "127.0.0.1".to_owned())
                } else {
                    "127.0.0.1".to_owned()
                };
                MirrorStatus {
                    running: true,
                    url: Some(format!("http://{host}:{}/?k={}", server.port, self.key)),
                    error: None,
                }
            }
            None => MirrorStatus {
                running: false,
                url: None,
                error: lock(&self.error).clone(),
            },
        }
    }
}

/// Bring the server in line with `settings`. Called at startup and on every
/// settings apply — the same one-broadcast rule the engine follows.
///
/// Restarting on any change is deliberate: the settings are three fields that
/// change a handful of times a year, and a restart is far easier to reason
/// about than reconfiguring a live listener.
pub fn apply_settings(app: &AppHandle, settings: &Settings) {
    let state = app.state::<LanMirrorState>();
    // Dropping the old server first releases the port, so turning the mirror
    // off and on again — or changing the port — cannot race itself.
    *lock(&state.server) = None;
    *lock(&state.error) = None;
    if !settings.lan_enabled {
        return;
    }
    if state.key.is_empty() {
        *lock(&state.error) = Some("no secure random source is available".to_owned());
        return;
    }
    match start(app.clone(), settings, state.key.clone()) {
        Ok(server) => *lock(&state.server) = Some(server),
        Err(err) => *lock(&state.error) = Some(err),
    }
}

fn start(app: AppHandle, settings: &Settings, key: String) -> Result<Server, String> {
    let host = if settings.lan_all_interfaces {
        "0.0.0.0"
    } else {
        "127.0.0.1"
    };
    let listener = TcpListener::bind((host, settings.lan_port))
        .map_err(|err| format!("could not listen on {host}:{}: {err}", settings.lan_port))?;
    let port = listener.local_addr().map_err(|err| err.to_string())?.port();
    // Non-blocking accept + a poll loop is what lets `Drop` actually stop this
    // thread: a blocking `accept()` would sit there until the next connection,
    // holding the port long after the mirror was switched off.
    listener
        .set_nonblocking(true)
        .map_err(|err| err.to_string())?;

    let shutdown = Arc::new(AtomicBool::new(false));
    {
        let shutdown = Arc::clone(&shutdown);
        std::thread::Builder::new()
            .name("ft-lan-mirror".into())
            .spawn(move || {
                while !shutdown.load(Ordering::Relaxed) {
                    match listener.accept() {
                        Ok((stream, _)) => {
                            let app = app.clone();
                            let key = key.clone();
                            let _ = std::thread::Builder::new()
                                .name("ft-lan-mirror-client".into())
                                .spawn(move || {
                                    let _ = serve(stream, &app, &key);
                                });
                        }
                        Err(ref err) if err.kind() == std::io::ErrorKind::WouldBlock => {
                            std::thread::sleep(Duration::from_millis(50));
                        }
                        Err(_) => break,
                    }
                }
            })
            .map_err(|err| err.to_string())?;
    }
    Ok(Server { shutdown, port })
}

/// Whether `supplied` is the session key, compared without an early exit.
///
/// The mirror is LAN-only and each guess costs a full HTTP round-trip, so this
/// is not the timing channel it would be on a public endpoint — but comparing
/// in constant time costs one line, and `==` on a `String` does not.
fn key_matches(supplied: &str, key: &str) -> bool {
    !key.is_empty()
        && supplied.len() == key.len()
        && supplied
            .bytes()
            .zip(key.bytes())
            .fold(0u8, |acc, (a, b)| acc | (a ^ b))
            == 0
}

/// Pull `k=` out of a query string.
fn key_from_query(query: &str) -> &str {
    query
        .split('&')
        .find_map(|pair| pair.strip_prefix("k="))
        .unwrap_or_default()
}

/// One request → one response. Two routes, a key on each, a size cap, and no
/// path from a request to the filesystem.
fn serve(mut stream: TcpStream, app: &AppHandle, key: &str) -> std::io::Result<()> {
    stream.set_read_timeout(Some(IO_TIMEOUT))?;
    stream.set_write_timeout(Some(IO_TIMEOUT))?;

    let mut buf = vec![0u8; MAX_REQUEST_BYTES];
    let read = stream.read(&mut buf)?;
    let request = String::from_utf8_lossy(&buf[..read]);
    let start_line = request.split("\r\n").next().unwrap_or_default();
    let mut parts = start_line.split_whitespace();
    let method = parts.next().unwrap_or_default();
    let target = parts.next().unwrap_or_default();
    let (path, query) = target.split_once('?').unwrap_or((target, ""));
    let authorized = key_matches(key_from_query(query), key);

    let (status, content_type, payload) = match (method, path, authorized) {
        ("GET", "/", true) => ("200 OK", "text/html; charset=utf-8", MIRROR_HTML.to_owned()),
        ("GET", "/state", true) => (
            "200 OK",
            "application/json",
            serde_json::to_string(&app.state::<crate::teleprompter::TeleprompterState>().dto())
                .unwrap_or_else(|_| "{}".to_owned()),
        ),
        (_, _, false) => (
            "401 Unauthorized",
            "text/plain; charset=utf-8",
            "wrong or missing key".to_owned(),
        ),
        _ => (
            "404 Not Found",
            "text/plain; charset=utf-8",
            "no such page".to_owned(),
        ),
    };

    // A reading surface, not a website: nothing cached, nothing framed, nothing
    // sniffed, and a CSP that permits only what the page itself carries.
    let response = format!(
        "HTTP/1.1 {status}\r\nContent-Type: {content_type}\r\nContent-Length: {}\r\n\
         Cache-Control: no-store\r\nX-Content-Type-Options: nosniff\r\n\
         X-Frame-Options: DENY\r\nReferrer-Policy: no-referrer\r\n\
         Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; \
         script-src 'unsafe-inline'; connect-src 'self'\r\nConnection: close\r\n\r\n{payload}",
        payload.len()
    );
    stream.write_all(response.as_bytes())?;
    stream.flush()
}

// -- commands -----------------------------------------------------------------

/// The mirror's URL + state, for the Settings panel and its QR code.
#[tauri::command]
pub fn lan_mirror_status(
    state: tauri::State<'_, LanMirrorState>,
    store: tauri::State<'_, SettingsStore>,
) -> MirrorStatus {
    state.status(store.get().lan_all_interfaces)
}

/// Open the mirror in the machine's own browser — the "try it here first" path
/// before pointing a phone at it.
///
/// Deliberately takes **no argument**: the URL is rebuilt here from the running
/// listener, so there is nothing for the webview to influence. That is what
/// makes it safe to bypass `bugreport::open_url`, whose `https:`/`mailto:`
/// allowlist exists precisely to distrust URLs that came from the UI.
#[tauri::command]
pub fn lan_mirror_open(
    state: tauri::State<'_, LanMirrorState>,
    store: tauri::State<'_, SettingsStore>,
) -> Result<(), String> {
    let status = state.status(store.get().lan_all_interfaces);
    let url = status.url.ok_or("the mirror is not running")?;
    crate::bugreport::open_url_in_os(&url)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_session_key_is_random_hex_of_the_right_length() {
        let a = new_key();
        let b = new_key();
        assert_eq!(a.len(), KEY_HEX_CHARS);
        assert!(a.chars().all(|c| c.is_ascii_hexdigit()));
        assert_ne!(a, b, "a fresh key per call, not a constant");
    }

    #[test]
    fn only_the_exact_key_is_accepted() {
        let key = "0123456789abcdef01234567";
        assert!(key_matches(key, key));
        assert!(!key_matches("", key));
        assert!(!key_matches("0123456789abcdef0123456", key), "too short");
        assert!(!key_matches("0123456789abcdef012345678", key), "too long");
        assert!(!key_matches("0123456789abcdef01234568", key), "one bit off");
        // An empty key is the "no randomness available" state; it must never
        // become a skeleton key that matches an empty query parameter.
        assert!(!key_matches("", ""));
    }

    #[test]
    fn the_key_is_read_from_the_query_string() {
        assert_eq!(key_from_query("k=abc"), "abc");
        assert_eq!(key_from_query("x=1&k=abc"), "abc");
        assert_eq!(key_from_query("k="), "");
        assert_eq!(key_from_query(""), "");
        assert_eq!(key_from_query("kk=abc"), "", "not a prefix match");
    }

    /// The mirror is a window, never a lever. If a write route is ever added,
    /// this test is the thing that should have to be deleted first.
    #[test]
    fn the_served_page_reaches_nothing_outside_itself() {
        assert!(
            !MIRROR_HTML.contains("http://") && !MIRROR_HTML.contains("https://"),
            "the mirror page must not fetch anything from the internet"
        );
        assert!(
            !MIRROR_HTML.to_lowercase().contains("method:\"post\"")
                && !MIRROR_HTML.to_lowercase().contains("method: \"post\""),
            "the mirror is read-only"
        );
    }
}
