#!/usr/bin/env node
/**
 * `npm run dev:vosk` — a dev run that can actually dictate.
 *
 * The `vosk` feature is off in every ordinary build (see the handoff), so
 * `npm run tauri dev` reports the engine absent and disables the Settings
 * toggle. That is honest, and it made the feature miserable to iterate on: it
 * was reported as a bug twice by people running a dev build.
 *
 * Three things stand between a dev run and a working microphone, and this
 * script is exactly those three:
 *
 *   1. `libvosk` and the model are not in the repository — `fetch-vosk.mjs`.
 *   2. The model has to be somewhere the app looks. `speech.rs::model_dir`
 *      checks the user's DATA DIRECTORY before the bundled resources,
 *      precisely so a model can be dropped in without rebuilding; a dev run has
 *      no bundled resources at all, so that fallback is the whole mechanism.
 *   3. The shared library has to be findable at RUNTIME. `build.rs` records an
 *      rpath for the *installed* layout (`../Resources`, `$ORIGIN/../lib`),
 *      which a `target/debug` binary is not in — so the loader is pointed at
 *      `vendor/vosk/lib` for this process instead.
 *
 *   node scripts/dev-vosk.mjs           # reuse whatever is already in place
 *   node scripts/dev-vosk.mjs --force   # re-copy the model over the old one
 *
 * The model copy is ~40 MB and is left behind deliberately: it is the same
 * escape hatch a user has, it survives across dev runs, and nothing else writes
 * there. Delete the printed directory to undo it.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { copyFile, cp, mkdir, readdir, rename, rm } from "node:fs/promises";
import { homedir } from "node:os";
import { delimiter, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const VENDOR = join(ROOT, "src-tauri", "vendor", "vosk");
const MODEL = join(VENDOR, "vosk-model-en");
const LIB = join(VENDOR, "lib");

const force = process.argv.includes("--force");

/**
 * Where `settings::project_dirs()` puts the app's data directory.
 *
 * ⚠️ This mirrors `directories::ProjectDirs::from("com", "Freally", "Freally
 * Teleprompt")` — version 6.0.0, whose per-platform mangling is NOT the same on
 * each OS and is not guessable:
 *
 *   Windows  %APPDATA%\Freally\Freally Teleprompt\data     (organization\application\data)
 *   macOS    ~/Library/Application Support/com.Freally.Freally-Teleprompt   (spaces -> '-')
 *   Linux    $XDG_DATA_HOME/freallyteleprompt              (lowercased, spaces REMOVED)
 *
 * Get it wrong and this script cheerfully copies 40 MB somewhere the app never
 * looks, and the dev build still says "unavailable" — which is why the
 * resolved path is printed rather than assumed.
 */
function dataDir() {
  switch (process.platform) {
    case "win32":
      return join(
        process.env.APPDATA ?? join(homedir(), "AppData", "Roaming"),
        "Freally",
        "Freally Teleprompt",
        "data",
      );
    case "darwin":
      return join(
        homedir(),
        "Library",
        "Application Support",
        "com.Freally.Freally-Teleprompt",
      );
    default:
      return join(
        process.env.XDG_DATA_HOME || join(homedir(), ".local", "share"),
        "freallyteleprompt",
      );
  }
}

/** Run a command line through the shell, inheriting stdio; exit on failure. */
function run(commandLine) {
  const result = spawnSync(commandLine, {
    cwd: ROOT,
    stdio: "inherit",
    shell: true,
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run("node scripts/fetch-vosk.mjs");

const dest = join(dataDir(), "vosk-model-en");
// `am/final.mdl` rather than the directory, because the app checks that same
// file — but the check is only worth anything if the file cannot exist beside
// an INCOMPLETE model. `fs.cp` walks the model alphabetically and `am/` sorts
// near the front, so copying in place would put the marker down first and leave
// an interrupted copy looking finished to this script AND to the app. So the
// copy goes to a sibling and is RENAMED in: the destination either does not
// exist or is whole.
if (force || !existsSync(join(dest, "am", "final.mdl"))) {
  const staging = `${dest}.partial`;
  console.log(`dev-vosk: copying the model -> ${dest}`);
  await mkdir(dirname(dest), { recursive: true });
  await rm(staging, { recursive: true, force: true });
  await cp(MODEL, staging, { recursive: true });
  await rm(dest, { recursive: true, force: true });
  await rename(staging, dest);
} else {
  console.log(`dev-vosk: model already installed (${dest})`);
}

if (process.platform === "darwin") {
  // ⚠️ NOT `DYLD_LIBRARY_PATH`. System Integrity Protection purges every
  // `DYLD_*` variable from the environment of a protected binary and its
  // children, and `run()` launches through `/bin/sh` — which is protected. The
  // variable would be gone before npm, cargo or the app ever saw it, while this
  // script printed a line saying it had been set.
  //
  // What does work is the rpath `build.rs` already records for the app binary,
  // `@executable_path/../Resources`: from `target/debug/<bin>` that resolves to
  // `target/Resources`. So the library is put where the loader is already
  // looking, and nothing depends on an environment variable surviving.
  const resources = join(ROOT, "target", "Resources");
  await mkdir(resources, { recursive: true });
  for (const entry of await readdir(LIB)) {
    await copyFile(join(LIB, entry), join(resources, entry));
  }
  console.log(`dev-vosk: libvosk -> ${resources} (the app's own rpath)`);
} else {
  // Mutating THIS process's environment rather than building one for the child:
  // on Windows the variable is `Path`, and a spread copy plus a `PATH`
  // assignment hands the child both spellings. `process.env` is
  // case-insensitive there, so assigning through it replaces the one that
  // exists. Neither variable is stripped on Windows or Linux.
  const loaderVar = process.platform === "win32" ? "PATH" : "LD_LIBRARY_PATH";
  process.env[loaderVar] = process.env[loaderVar]
    ? `${LIB}${delimiter}${process.env[loaderVar]}`
    : LIB;
  console.log(`dev-vosk: ${loaderVar} += ${LIB}`);
}

run("npm run tauri -- dev --features vosk");
