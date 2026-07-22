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
import { copyFileSync, existsSync, mkdirSync, rmSync, statSync, writeFileSync } from "node:fs";
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
  const config = process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config");
  const data = process.env.XDG_DATA_HOME ?? join(homedir(), ".local", "share");
  return { config: join(config, "freally-teleprompt"), data: join(data, "freally-teleprompt") };
}

/** The debug binary `tauri build --debug --no-bundle` produces. */
function binaryPath() {
  const name = os === "win32" ? "freally-teleprompt.exe" : "freally-teleprompt";
  const path = join(repoRoot, "target", "debug", name);
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
 * `acceptedEulaVersion` must match `EULA_VERSION` in `src-tauri/src/eula.rs`.
 */
const EULA_VERSION = "2026-07-21";
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
        acceptedEulaVersion: EULA_VERSION,
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
  // Linux: ImageMagick against the Xvfb root window.
  return spawnSync("import", ["-window", "root", file], { stdio: "inherit" });
}

/** Does a window belonging to the app exist? Cheap where the OS will tell us. */
function windowIsUp() {
  if (os === "win32") {
    const ps =
      "$p = Get-Process freally-teleprompt -ErrorAction SilentlyContinue | " +
      "Where-Object { $_.MainWindowHandle -ne 0 }; if ($p) { $p.MainWindowTitle } ";
    const r = spawnSync("powershell", ["-NoProfile", "-NonInteractive", "-Command", ps], {
      encoding: "utf8",
    });
    return (r.stdout ?? "").includes("Freally Teleprompt");
  }
  if (os === "linux") {
    const r = spawnSync("xdotool", ["search", "--name", "Freally Teleprompt"], {
      encoding: "utf8",
    });
    return r.status === 0 && (r.stdout ?? "").trim().length > 0;
  }
  // macOS window enumeration needs Accessibility permission the runner has not
  // granted, so "the process is alive and the screen shot is non-empty" is the
  // evidence there. Stated rather than silently skipped.
  return null;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
  const child = spawn(binary, [], { stdio: "inherit", detached: os !== "win32" });
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
    if (bytes < 20_000) {
      throw new Error(`${file} is only ${bytes} bytes — the screen looks blank`);
    }
    if (windowUp === false) {
      throw new Error("no window titled 'Freally Teleprompt' was found");
    }
    console.log(
      `app-screenshot: ok — ${file} (${Math.round(bytes / 1024)} KB)` +
        (windowUp === null ? ", window title not checkable on this OS" : ", window title confirmed"),
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
