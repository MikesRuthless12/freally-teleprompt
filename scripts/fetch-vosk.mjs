#!/usr/bin/env node
/**
 * Fetch the native `libvosk` for THIS platform and the speech model, into
 * `src-tauri/vendor/vosk/` — the two things voice-following (FT-32/33/35) needs
 * and the repository deliberately does not carry.
 *
 * Neither is committed, for the same reason `.dict-cache/` is not: together they
 * are ~65 MB of third-party binary that is re-fetchable on demand. The build
 * needs them, `git` does not.
 *
 *   node scripts/fetch-vosk.mjs          # host platform, skip what is present
 *   node scripts/fetch-vosk.mjs --force  # re-download everything
 *
 * ⚠️ Version choices, both load-bearing:
 *
 * - **libvosk 0.3.42**, not the newer 0.3.45. 0.3.45 ships no macOS build and
 *   0.3.50 ships no binaries at all; 0.3.42 is the most recent release carrying
 *   Windows, macOS AND Linux. Its macOS `.dylib` is a genuine FAT binary
 *   (x86_64 + arm64), which is what lets the universal build link.
 * - **vosk-model-small-en-us-0.15**, and NOT one of the large models. Dynamic
 *   grammar — `Recognizer::new_with_grammar`, the whole point of the
 *   script-constrained window in `freally-speech` — works only on the small and
 *   `-lgraph` models. A big static-graph model would silently ignore the
 *   grammar and recognise against the full vocabulary.
 *
 * Licences (re-read at the source per standing rule #7, not from a summary):
 * Vosk's code is Apache-2.0 and this model's weights are Apache-2.0. The
 * `daanzu` models are AGPL and the `zamia` one LGPL-3.0 — do not swap one in.
 */
import { createWriteStream } from "node:fs";
import { copyFile, mkdir, rm, readdir, rename, stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const VENDOR = join(ROOT, "src-tauri", "vendor", "vosk");
// Split deliberately. `lib/` is what SHIPS — every file in it is copied into the
// bundle wholesale, so the bundler needs no per-platform globbing and cannot
// pick up something it should not. `link/` is what the LINKER reads and is
// never shipped: on Windows that is the 16 MB `libvosk.lib` import library,
// which is pure build-time overhead inside an installer.
const LIB_DIR = join(VENDOR, "lib");
const LINK_DIR = join(VENDOR, "link");
const MODEL_DIR = join(VENDOR, "vosk-model-en");

const VOSK_VERSION = "0.3.42";
const MODEL_NAME = "vosk-model-small-en-us-0.15";

/** The libvosk archive for each host, and the files worth keeping from it. */
const PLATFORMS = {
  win32: {
    url: `https://github.com/alphacep/vosk-api/releases/download/v${VOSK_VERSION}/vosk-win64-${VOSK_VERSION}.zip`,
    // libvosk is built with MinGW, so its three runtime DLLs ship alongside it —
    // the app will not start without them.
    ship: /\.dll$/i,
    link: /\.lib$/i,
  },
  darwin: {
    url: `https://github.com/alphacep/vosk-api/releases/download/v${VOSK_VERSION}/vosk-osx-${VOSK_VERSION}.zip`,
    // On Unix the shared object IS the link target, so it is both.
    ship: /\.dylib$/,
    link: /\.dylib$/,
  },
  linux: {
    url: `https://github.com/alphacep/vosk-api/releases/download/v${VOSK_VERSION}/vosk-linux-x86_64-${VOSK_VERSION}.zip`,
    ship: /\.so(\.\d+)*$/,
    link: /\.so(\.\d+)*$/,
  },
};

const MODEL_URL = `https://alphacephei.com/vosk/models/${MODEL_NAME}.zip`;

const force = process.argv.includes("--force");
const plat = PLATFORMS[process.platform];
if (!plat) {
  console.error(`fetch-vosk: unsupported platform ${process.platform}`);
  process.exit(1);
}

const exists = async (p) => {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
};

async function download(url, dest) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
}

/**
 * Extract with `tar`, not a zip library. bsdtar reads zip, and it is present on
 * all three GitHub runners and on Windows 10+ — so this stays dependency-free.
 */
function extract(archive, into) {
  const r = spawnSync("tar", ["-xf", archive, "-C", into], { stdio: "inherit" });
  if (r.status !== 0) throw new Error(`tar failed on ${archive} (status ${r.status})`);
}

/** The single directory an archive unpacked into. */
async function soleDir(parent) {
  const entries = await readdir(parent, { withFileTypes: true });
  const dirs = entries.filter((e) => e.isDirectory());
  if (dirs.length !== 1) throw new Error(`expected one directory in ${parent}, found ${dirs.length}`);
  return join(parent, dirs[0].name);
}

async function fetchLib() {
  if (!force && (await exists(LIB_DIR)) && (await exists(LINK_DIR))) {
    console.log(`fetch-vosk: libvosk already present (${LIB_DIR})`);
    return;
  }
  console.log(`fetch-vosk: libvosk ${VOSK_VERSION} for ${process.platform}`);
  const tmp = join(VENDOR, ".tmp-lib");
  await rm(tmp, { recursive: true, force: true });
  await mkdir(tmp, { recursive: true });
  const zip = join(tmp, "lib.zip");
  await download(plat.url, zip);
  extract(zip, tmp);
  await rm(zip);

  const unpacked = await soleDir(tmp);
  for (const d of [LIB_DIR, LINK_DIR]) {
    await rm(d, { recursive: true, force: true });
    await mkdir(d, { recursive: true });
  }
  let shipped = 0;
  let linked = 0;
  for (const entry of await readdir(unpacked)) {
    // A Unix .so/.dylib is both shipped and linked, so it is COPIED into `lib/`
    // and `link/` rather than moved into one of them.
    if (plat.ship.test(entry)) {
      await copyFile(join(unpacked, entry), join(LIB_DIR, entry));
      shipped++;
    }
    if (plat.link.test(entry)) {
      await copyFile(join(unpacked, entry), join(LINK_DIR, entry));
      linked++;
    }
  }
  await rm(tmp, { recursive: true, force: true });
  if (!shipped || !linked) {
    throw new Error(`archive layout changed — ${shipped} shippable, ${linked} linkable`);
  }
  console.log(`fetch-vosk: ${shipped} runtime lib(s) -> lib/, ${linked} link target(s) -> link/`);
}

async function fetchModel() {
  if (!force && (await exists(MODEL_DIR))) {
    console.log(`fetch-vosk: model already present (${MODEL_DIR})`);
    return;
  }
  console.log(`fetch-vosk: ${MODEL_NAME} (~40 MB)`);
  const tmp = join(VENDOR, ".tmp-model");
  await rm(tmp, { recursive: true, force: true });
  await mkdir(tmp, { recursive: true });
  const zip = join(tmp, "model.zip");
  await download(MODEL_URL, zip);
  extract(zip, tmp);
  await rm(zip);

  // Renamed to a version-free directory so the app's model path never carries a
  // model version, and swapping the model later is not a code change.
  const unpacked = await soleDir(tmp);
  await rm(MODEL_DIR, { recursive: true, force: true });
  await rename(unpacked, MODEL_DIR);
  await rm(tmp, { recursive: true, force: true });
  console.log(`fetch-vosk: model -> ${MODEL_DIR}`);
}

await mkdir(VENDOR, { recursive: true });
await fetchLib();
await fetchModel();

// The one file the recogniser cannot start without; a truncated download is
// otherwise only discovered at runtime, as "could not load the Vosk model".
if (!(await exists(join(MODEL_DIR, "am", "final.mdl")))) {
  console.error(`fetch-vosk: ${MODEL_DIR} has no am/final.mdl — the model looks incomplete`);
  process.exit(1);
}
console.log("fetch-vosk: ready");
