#!/usr/bin/env node
/**
 * Launch the BUILT app and photograph it running — per OS, every CI run.
 *
 * The Playwright gallery proves the UI renders in Chromium with a mocked IPC
 * bridge. That is most of the story, but not all of it: it cannot tell you that
 * the real Tauri binary starts, that the real webview (WebView2 / WKWebView /
 * WebKitGTK) paints, or that the Rust side answered the first IPC call. Those
 * are exactly the failures that only ever appear on one OS — and only after
 * someone downloads an installer.
 *
 * So this does the crude, decisive thing: it seeds a real settings file and a
 * real script, starts the actual executable, waits for it to settle, takes a
 * screenshot of the screen, and fails if the app died or the picture is empty.
 * CI uploads the three images as artifacts, so "does it still run on macOS?" is
 * answered by looking, not by inference.
 *
 * Usage:  node scripts/app-screenshot.mjs [--out DIR] [--wait SECONDS]
 *
 * Linux needs a display: CI starts Xvfb and exports DISPLAY before calling this.
 */
import { spawn, spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { homedir, platform } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const argValue = (flag, fallback) => {
  const at = args.indexOf(flag);
  return at >= 0 && args[at + 1] ? args[at + 1] : fallback;
};

const outDir = join(repoRoot, argValue("--out", "artifacts"));
const waitSecs = Number(argValue("--wait", "20"));
const os = platform();

/**
 * Where the app persists things, mirroring the `directories` crate's rules for
 * `ProjectDirs::from("com", "Freally", "Freally Teleprompt")`.
 *
 * Duplicated here on purpose — the alternative is adding a CLI flag to the app
 * purely so CI can ask it a question, and shipping code for the benefit of the
 * test harness is worse. If these ever drift, the failure is loud rather than
 * silent: the screenshot shows the first-run EULA gate instead of the shell, and
 * the path this script used is printed in the log right above it.
 */
function appDirs() {
  if (os === "win32") {
    const roaming = process.env.APPDATA ?? join(homedir(), "AppData", "Roaming");
    const base = join(roaming, "Freally", "Freally Teleprompt");
    return { config: join(base, "config"), data: join(base, "data") };
  }
  if (os === "darwin") {
    const base = join(homedir(), "Library", "Application Support", "com.Freally.Freally-Teleprompt");
    return { config: base, data: base };
  }
  // `freallyteleprompt`, NOT `freally-teleprompt`. The `directories` crate's
  // XDG project path lowercases the application name and strips spaces outright
  // — its own README shows `"Bar App"` becoming `~/.config/barapp`. Seeding the
  // hyphenated guess put the settings somewhere the app never looks, and the
  // Linux screenshot came back showing the first-run EULA gate. That is the
  // "loud failure" this function's comment promised, actually happening.
  const config = process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config");
  const data = process.env.XDG_DATA_HOME ?? join(homedir(), ".local", "share");
  return { config: join(config, "freallyteleprompt"), data: join(data, "freallyteleprompt") };
}

/** The debug binary `tauri build --debug --no-bundle` produces.
 *
 * Honours `CARGO_TARGET_DIR`, because that is where cargo actually put it. The
 * Linux container build uses one so its artifacts do not collide with the
 * host's `target/`. */
function binaryPath() {
  const name = os === "win32" ? "freally-teleprompt.exe" : "freally-teleprompt";
  const targetDir = process.env.CARGO_TARGET_DIR || join(repoRoot, "target");
  const path = join(targetDir, "debug", name);
  if (!existsSync(path)) {
    console.error(`app-screenshot: no built binary at ${path}`);
    console.error("  run: npm run tauri -- build --debug --no-bundle");
    process.exit(1);
  }
  return path;
}

/**
 * Seed an accepted EULA and one saved script, so the screenshot shows the actual
 * operator shell — toolbar, chip editor, transport, reading preview — rather
 * than the first-run gate, which would look identical every phase and prove
 * nothing about the phase's own work.
 *
 * The EULA version is READ from `eula.rs` rather than restated here. An earlier
 * version hard-coded it with a "must match" comment and argued that drift would
 * be loud because the screenshot would show the gate — but nothing checked that,
 * and the gate renders happily above the blank-screen threshold with a window
 * and everything. From the next version bump onward, every screenshot on all
 * three OSes would have photographed the first-run gate, green, forever, and the
 * harness would have silently stopped testing the thing it exists to test.
 */
function eulaVersion() {
  const source = readFileSync(join(repoRoot, "src-tauri", "src", "eula.rs"), "utf8");
  const found = /EULA_VERSION:\s*&str\s*=\s*"([^"]+)"/.exec(source);
  if (!found) {
    throw new Error("could not read EULA_VERSION from src-tauri/src/eula.rs");
  }
  return found[1];
}
const SAMPLE_NAME = "CI smoke";
const SAMPLE_SCRIPT = [
  "Freally Teleprompt is running.",
  "",
  "This line scrolls at a real reading pace -- and pauses here.",
  "A numbered pause --2 holds for two seconds.",
  "",
  "If you can read this in the artifact, the webview painted.",
].join("\n");

/**
 * Seed, remembering what was there.
 *
 * On CI these paths are empty. On a developer's own machine they are **their
 * real settings and their real scripts**, and a test harness that silently
 * overwrites those is not a test harness, it is a bug. So the previous
 * `settings.json` is copied aside and put back by `restore()` in a `finally`,
 * and the sample script is removed again unless it was already theirs.
 */
function seed() {
  const { config, data } = appDirs();
  const scriptsDir = join(data, "scripts");
  const settingsFile = join(config, "settings.json");
  const sampleFile = join(scriptsDir, `${SAMPLE_NAME}.ftscript`);
  const backup = `${settingsFile}.pre-screenshot`;

  mkdirSync(config, { recursive: true });
  mkdirSync(scriptsDir, { recursive: true });

  const hadSettings = existsSync(settingsFile);
  const hadSample = existsSync(sampleFile);
  if (hadSettings) copyFileSync(settingsFile, backup);

  writeFileSync(sampleFile, SAMPLE_SCRIPT, "utf8");
  writeFileSync(
    settingsFile,
    JSON.stringify(
      {
        language: "en",
        theme: "dark",
        speed: 12,
        fontSize: 48,
        caesuraSecs: 0.75,
        countdownSecs: 0,
        mirror: false,
        recentScripts: [SAMPLE_NAME],
        acceptedEulaVersion: eulaVersion(),
      },
      null,
      2,
    ),
    "utf8",
  );
  console.log(`app-screenshot: seeded ${settingsFile}${hadSettings ? " (yours is backed up)" : ""}`);
  console.log(`app-screenshot: seeded ${sampleFile}`);

  return () => {
    try {
      if (hadSettings) {
        copyFileSync(backup, settingsFile);
        rmSync(backup, { force: true });
      } else {
        rmSync(settingsFile, { force: true });
      }
      if (!hadSample) rmSync(sampleFile, { force: true });
      console.log("app-screenshot: restored your settings");
    } catch (err) {
      // Say so loudly — a silently-unrestored settings file is exactly the kind
      // of thing that gets blamed on the app weeks later.
      console.error(`app-screenshot: COULD NOT RESTORE your settings: ${err}`);
      console.error(`  your original is at ${backup}`);
    }
  };
}

/** Capture the whole screen to `file`, per OS. */
function capture(file) {
  if (os === "win32") {
    // A PowerShell single-quoted string takes everything literally EXCEPT a
    // single quote, which is escaped by doubling it. (Backslashes need no
    // escaping at all — an earlier version doubled them, which was a no-op that
    // only worked because Windows tolerates doubled separators.)
    const psLiteral = `'${file.replaceAll("'", "''")}'`;
    const ps = [
      "Add-Type -AssemblyName System.Windows.Forms,System.Drawing;",
      // Become DPI-aware BEFORE asking how big the screen is. Without this,
      // `VirtualScreen` reports SCALED coordinates (1707x1067 on a 2560x1440
      // display at 150%) while the capture itself works in physical pixels — so
      // the screenshot silently contained only the top-left ~44% of the screen,
      // and anything on the right of a window looked like it had not rendered.
      // CI runners are all at 100%, so this only ever bit on a real desktop.
      "Add-Type -MemberDefinition '[DllImport(\"user32.dll\")] public static extern bool SetProcessDPIAware();' -Name U -Namespace N;",
      "[void][N.U]::SetProcessDPIAware();",
      "$b=[System.Windows.Forms.SystemInformation]::VirtualScreen;",
      "$bmp=New-Object System.Drawing.Bitmap $b.Width,$b.Height;",
      "$g=[System.Drawing.Graphics]::FromImage($bmp);",
      "$g.CopyFromScreen($b.Location,[System.Drawing.Point]::Empty,$b.Size);",
      `$bmp.Save(${psLiteral},[System.Drawing.Imaging.ImageFormat]::Png);`,
    ].join(" ");
    return spawnSync("powershell", ["-NoProfile", "-NonInteractive", "-Command", ps], {
      stdio: "inherit",
    });
  }
  if (os === "darwin") {
    // -x = no shutter sound; the runner has a real WindowServer session.
    return spawnSync("screencapture", ["-x", file], { stdio: "inherit" });
  }
  // Linux: ImageMagick against the X root window. `-screen` is load-bearing —
  // without it `import` grabs the root window's OWN backing contents, which on a
  // bare Xvfb server (no compositor) is an empty pixmap; with it, it grabs what
  // is actually on screen, child windows included.
  return spawnSync("import", ["-window", "root", "-screen", file], { stdio: "inherit" });
}

/**
 * Environment for the app process.
 *
 * On Linux, WebKitGTK's DMA-BUF renderer needs a GPU path that a headless CI
 * runner (Xvfb + llvmpipe) does not have. It does not crash — it silently
 * composites nothing, so the process stays happily alive and paints a blank
 * window, which is exactly the failure this script exists to catch and exactly
 * the failure that looks like a broken app. Turning it off falls back to
 * software rendering, which is all a screenshot needs.
 *
 * Scoped to this child process only, so nothing about a developer's real desktop
 * session changes.
 */
function childEnv() {
  if (os !== "linux") return process.env;
  return {
    ...process.env,
    WEBKIT_DISABLE_DMABUF_RENDERER: "1",
    WEBKIT_DISABLE_COMPOSITING_MODE: "1",
    // WebKitGTK's bubblewrap sandbox needs namespaces and xdg-portals that a CI
    // runner does not provide. Observed symptom: the app starts, spawns
    // xdg-desktop-portal / xdg-document-portal / fusermount3, and then sits
    // there — its GTK window stuck at the placeholder 10x10+10+10 it is created
    // with, never resized to the configured 1280x800, because the web process
    // never comes up to finish initialising it.
    //
    // The variable is named to make you think twice, so: this is set ONLY for
    // this ~20-second child process, which loads nothing but our own bundled
    // local HTML with no network content, and never for a shipped app. It is a
    // property of the screenshot harness, not of Freally Teleprompt.
    WEBKIT_DISABLE_SANDBOX_THIS_IS_DANGEROUS: "1",
    // Be explicit about the display backend. There is no Wayland compositor on
    // a CI runner, and letting GDK work that out for itself is one more thing
    // that can go quietly differently between a runner and a desktop.
    GDK_BACKEND: "x11",
  };
}

/** Does a window belonging to the app exist? Cheap where the OS will tell us. */
function windowIsUp() {
  if (os === "win32") {
    // Ask whether the process owns a TOP-LEVEL WINDOW, not whether that window
    // carries a particular title. Once `decorations: false` landed, Windows
    // stopped reporting a `MainWindowTitle` for it, and a title check started
    // failing on a perfectly healthy app — the same mistake the Linux check
    // made with the window name. A window handle is the fact we actually want.
    const ps =
      "$p = Get-Process freally-teleprompt -ErrorAction SilentlyContinue | " +
      "Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1; " +
      "if ($p) { 'window:' + $p.MainWindowHandle }";
    const r = spawnSync("powershell", ["-NoProfile", "-NonInteractive", "-Command", ps], {
      encoding: "utf8",
    });
    return (r.stdout ?? "").includes("window:");
  }
  if (os === "linux") {
    // X reports the window under the BINARY name (`freally-teleprompt`), not the
    // configured title ("Freally Teleprompt") — searching for the title alone
    // reported "no window" while `xwininfo` was plainly showing one. Match
    // either, with any separator, either case.
    //
    // And ask for its GEOMETRY, not merely its existence: a GTK window is
    // created at a placeholder 10x10 and only resized once the webview finishes
    // coming up, so "a window exists" was true even while the app was wedged.
    // A real window is the configured 1280x800.
    const r = spawnSync(
      "xdotool",
      ["search", "--name", "[Ff]really.[Tt]eleprompt", "getwindowgeometry", "%@"],
      { encoding: "utf8" },
    );
    if (r.status !== 0 || !(r.stdout ?? "").trim()) return false;
    // EVERY match, not the first. The name matches GTK's 10x10 *leader* window
    // as well as the real toplevel, and xdotool lists the leader first — so
    // reading one geometry reported "it never finished opening" about an app
    // that was running perfectly well with its window on screen.
    const sizes = [...r.stdout.matchAll(/Geometry:\s*(\d+)x(\d+)/g)].map(([, w, h]) => [
      Number(w),
      Number(h),
    ]);
    // If the output shape ever changes, fall back to "it exists" rather than
    // failing the build on a parse miss.
    if (sizes.length === 0) return true;
    if (!sizes.some(([w, h]) => w >= 200 && h >= 200)) {
      const seen = sizes.map(([w, h]) => `${w}x${h}`).join(", ");
      console.error(`app-screenshot: no real app window — only found ${seen}`);
      return false;
    }
    return true;
  }
  // macOS window enumeration needs Accessibility permission the runner has not
  // granted, so "the process is alive and the screen shot is non-empty" is the
  // evidence there. Stated rather than silently skipped.
  return null;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Bring the app to the front before photographing it.
 *
 * A CI runner has an empty desktop, so the app is trivially on top there and
 * this looks unnecessary. On a real machine it is not: the screenshot came back
 * showing a browser and two other apps stacked over the window, which reads
 * exactly like "the app rendered nothing" and is the kind of false alarm that
 * teaches you to stop trusting the check.
 */
function raise() {
  if (os === "win32") {
    const ps = [
      "Add-Type -MemberDefinition '[DllImport(\"user32.dll\")] public static extern bool SetForegroundWindow(IntPtr h); [DllImport(\"user32.dll\")] public static extern bool ShowWindow(IntPtr h, int c);' -Name W -Namespace N;",
      "$p = Get-Process freally-teleprompt -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1;",
      // 9 = SW_RESTORE, in case it came up minimised.
      "if ($p) { [void][N.W]::ShowWindow($p.MainWindowHandle, 9); [void][N.W]::SetForegroundWindow($p.MainWindowHandle) }",
    ].join(" ");
    spawnSync("powershell", ["-NoProfile", "-NonInteractive", "-Command", ps], {
      stdio: "ignore",
    });
    return;
  }
  if (os === "linux") {
    spawnSync("xdotool", ["search", "--name", "[Ff]really.[Tt]eleprompt", "windowactivate", "%@"], {
      stdio: "ignore",
    });
  }
  // macOS needs Accessibility permission to raise another app's window, which a
  // runner has not granted. Left alone rather than half-done.
}

/**
 * When a Linux run fails, dump what X actually has.
 *
 * "The app is alive but there is no window" has several very different causes —
 * the window is there under another name, the window is there but unmapped, X is
 * not the display the app connected to, or the app never got as far as creating
 * one. A byte count and a boolean cannot tell them apart, and each guess costs a
 * full CI round-trip to test. This turns the next failure into an answer.
 */
function linuxDiagnostics() {
  if (os !== "linux") return;
  console.error("--- X diagnostics ---");
  console.error(`DISPLAY=${process.env.DISPLAY ?? "(unset)"}`);
  for (const [label, cmd, args] of [
    ["every window name X knows", "xdotool", ["search", "--name", ".", "getwindowname", "%@"]],
    ["the root window tree", "xwininfo", ["-root", "-tree"]],
    ["our processes", "ps", ["-eo", "pid,stat,comm"]],
  ]) {
    const r = spawnSync(cmd, args, { encoding: "utf8" });
    if (r.error) {
      console.error(`${label}: ${cmd} unavailable (${r.error.message})`);
      continue;
    }
    const out = `${r.stdout ?? ""}${r.stderr ?? ""}`.trim();
    console.error(`${label} (${cmd}):\n${out || "(nothing)"}`);
  }
  console.error("--- end diagnostics ---");
}

async function main() {
  const binary = binaryPath();
  mkdirSync(outDir, { recursive: true });
  const restore = seed();
  try {
    await run(binary);
  } finally {
    restore();
  }
}

async function run(binary) {
  console.log(`app-screenshot: launching ${binary}`);
  // Detach on EVERY platform, and on Windows give up the inherited console too.
  //
  // `main.rs` only sets `windows_subsystem = "windows"` for release, so a DEBUG
  // build — which is exactly what this script runs — is a CONSOLE application.
  // Sharing the harness's console means the app receives that console's control
  // events, and a console app that gets CTRL_CLOSE exits gracefully with code 0.
  // That produced an intermittent "the app exited early (code 0)" inside
  // `ci:local` that never reproduced when the script was run on its own, which
  // is the worst kind of red: the app was fine, the harness killed it.
  //
  // The cost is the app's stderr on Windows. Worth it — a flaky gate teaches
  // people to ignore red, and a panic would still show as an early exit.
  const child = spawn(binary, [], {
    stdio: os === "win32" ? "ignore" : "inherit",
    detached: true,
    windowsHide: true,
    env: childEnv(),
  });
  let exited = null;
  child.on("exit", (code, signal) => {
    exited = signal ? `signal ${signal}` : `code ${code}`;
  });

  try {
    await sleep(waitSecs * 1000);

    // Did it survive the wait? A binary that starts and dies is the single most
    // important thing this catches, and it must be checked BEFORE the screenshot
    // (a dead app leaves a perfectly good picture of an empty desktop).
    if (exited !== null) {
      throw new Error(`the app exited early (${exited}) — it did not stay running`);
    }

    raise();
    // A moment for the compositor to actually put it in front.
    await sleep(700);

    const file = join(outDir, `app-${os}.png`);
    const shot = capture(file);
    const windowUp = windowIsUp();

    if (shot.status !== 0 || !existsSync(file)) {
      throw new Error(`the screen capture failed (${file} was not written)`);
    }
    const bytes = statSync(file).size;
    // A blank screen compresses to almost nothing, so size is a crude but
    // effective "did anything actually paint" check. It is a proxy, not proof —
    // the artifact is there to be looked at, which is the real check.
    //
    // The window state is reported alongside, because the two failures need
    // completely different fixes and the size alone cannot tell them apart:
    // "window up, screen blank" is a RENDERER problem, "no window" is a
    // windowing/display problem.
    if (bytes < 20_000) {
      const window =
        windowUp === null
          ? "window state not checkable on this OS"
          : windowUp
            ? "the window IS up, so this is a rendering problem, not a windowing one"
            : "and no app window was found either";
      linuxDiagnostics();
      throw new Error(`${file} is only ${bytes} bytes — the screen looks blank (${window})`);
    }
    if (windowUp === false) {
      linuxDiagnostics();
      throw new Error("no window titled 'Freally Teleprompt' was found");
    }
    console.log(
      `app-screenshot: ok — ${file} (${Math.round(bytes / 1024)} KB)` +
        (windowUp === null ? ", window title not checkable on this OS" : ", top-level window confirmed"),
    );
  } finally {
    // Always stop the app, whatever the verdict — a leaked GUI process wedges
    // the rest of the job (and, run locally, sits on the developer's desktop).
    try {
      if (os === "win32") spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"]);
      else process.kill(-child.pid, "SIGTERM");
    } catch {
      // Already gone.
    }
  }
}

try {
  await main();
} catch (err) {
  console.error(`app-screenshot: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}
