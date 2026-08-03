#!/usr/bin/env node
/**
 * Fetch the native `libvosk` for THIS platform and the speech model, into
 * `src-tauri/vendor/vosk/` — the two things dictation (FT-33) needs and the
 * repository deliberately does not carry.
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
 * - **vosk-model-small-en-us-0.15**, and NOT one of the large models. Dictation
 *   itself runs with a FREE grammar, so this looks like a free choice — it is
 *   not. `freally-speech`'s script-constrained window
 *   (`Recognizer::new_with_grammar`) works only on the small and `-lgraph`
 *   models, and a big static-graph model ignores the grammar silently rather
 *   than erroring. Swapping in a large model would appear to work and quietly
 *   disable that capability for anything that uses it again.
 *   The small model is also the only one whose size is sane to ship.
 *
 * Licences (re-read at the source per standing rule #7, not from a summary):
 * Vosk's code is Apache-2.0 and this model's weights are Apache-2.0. The
 * `daanzu` models are AGPL and the `zamia` one LGPL-3.0 — do not swap one in.
 */
import { createHash } from "node:crypto";
import { createWriteStream, existsSync, readdirSync } from "node:fs";
import { copyFile, mkdir, rm, readdir, rename } from "node:fs/promises";
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
    sha256: "9a63e42bd970343041d19e784e545228d3f4703ccec9f2eb1ccc6d5e96c170c3",
    // libvosk is built with MinGW, so its three runtime DLLs ship alongside it —
    // the app will not start without them.
    ship: /^(libvosk|libgcc_s_seh-1|libstdc\+\+-6|libwinpthread-1)\.dll$/i,
    link: /^libvosk\.lib$/i,
  },
  darwin: {
    url: `https://github.com/alphacep/vosk-api/releases/download/v${VOSK_VERSION}/vosk-osx-${VOSK_VERSION}.zip`,
    sha256: "65395f196c9d0583d79949142b25560acaf9c295f36284e18433097f3adb0ea1",
    // On Unix the shared object IS the link target, so it is both.
    ship: /^libvosk\.dylib$/,
    link: /^libvosk\.dylib$/,
  },
  linux: {
    url: `https://github.com/alphacep/vosk-api/releases/download/v${VOSK_VERSION}/vosk-linux-x86_64-${VOSK_VERSION}.zip`,
    sha256: "70480495011a29f957c1194cd460449ef7de8c17ea000e387ddb13fd7f844d42",
    ship: /^libvosk\.so(\.\d+)*$/,
    link: /^libvosk\.so(\.\d+)*$/,
  },
};

const MODEL_URL = `https://alphacephei.com/vosk/models/${MODEL_NAME}.zip`;
const MODEL_SHA256 =
  "30f26242c4eb449f948e42cb302dd7a686cb29a3423a8367f99ff41780942498";

const force = process.argv.includes("--force");
const plat = PLATFORMS[process.platform];
if (!plat) {
  console.error(`fetch-vosk: unsupported platform ${process.platform}`);
  process.exit(1);
}

/**
 * Download `url` to `dest` and refuse anything whose SHA-256 is not `expected`.
 *
 * ⚠️ This is the ONLY thing standing between two third-party hosts and a binary
 * that gets LINKED INTO the app, bundled into the installers, and signed with
 * the publisher's key. Worse, `release.yml` puts the fetched directory on
 * `LD_LIBRARY_PATH` for the whole bundling step — so a hostile archive would be
 * preloaded into cargo, node and linuxdeploy in the one job that holds the
 * signing key and a `contents: write` token. Transport security alone does not
 * cover a compromised release asset or account.
 *
 * The hash is checked BEFORE extraction, so nothing untrusted is ever unpacked.
 * If a version here is bumped, the digest must be recomputed with it — a
 * mismatch is meant to stop the build, not to be "fixed" by pasting the new
 * value in without knowing why it changed.
 */
async function download(url, dest, expected) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  const hash = createHash("sha256");
  await pipeline(
    Readable.fromWeb(res.body),
    async function* (source) {
      for await (const chunk of source) {
        hash.update(chunk);
        yield chunk;
      }
    },
    createWriteStream(dest),
  );
  const actual = hash.digest("hex");
  if (actual !== expected) {
    await rm(dest, { force: true });
    throw new Error(
      `checksum mismatch for ${url}\n  expected ${expected}\n  actual   ${actual}\n` +
        "Refusing to use it. If the upstream artifact legitimately changed, verify " +
        "the new one independently before updating the digest.",
    );
  }
}

/**
 * Extract a zip with whatever the host actually has, so this stays free of npm
 * dependencies.
 *
 * ⚠️ `tar` is NOT a portable zip reader. **bsdtar** reads zip and is what
 * Windows 10+ and macOS ship as `tar` — but **Linux ships GNU tar**, which
 * cannot read zip at all and fails with "This does not look like a tar
 * archive". Relying on `tar` alone worked on Windows and macOS and broke the
 * Linux release build, which is the worst way to find out.
 *
 * `unzip` is the right tool on Linux and macOS; `tar` covers Windows, where
 * `unzip` usually does not exist. Trying both in order means no host needs
 * anything installed that it does not already have.
 */
function extract(archive, into) {
  const attempts = [
    ["unzip", ["-q", "-o", archive, "-d", into]],
    ["tar", ["-xf", archive, "-C", into]],
  ];
  const failures = [];
  for (const [cmd, args] of attempts) {
    const r = spawnSync(cmd, args, { stdio: ["ignore", "ignore", "pipe"] });
    if (r.status === 0) return;
    // `error` means the command is not installed at all, which is expected on
    // some hosts and not worth reporting as the cause.
    failures.push(`${cmd}: ${r.error ? "not available" : `exit ${r.status}`}`);
  }
  throw new Error(`could not extract ${archive} — ${failures.join("; ")}`);
}

/** The single directory an archive unpacked into. */
async function soleDir(parent) {
  const entries = await readdir(parent, { withFileTypes: true });
  const dirs = entries.filter((e) => e.isDirectory());
  if (dirs.length !== 1)
    throw new Error(
      `expected one directory in ${parent}, found ${dirs.length}`,
    );
  return join(parent, dirs[0].name);
}

/** A directory that exists AND has something in it. */
const populated = (dir) => existsSync(dir) && readdirSync(dir).length > 0;

async function fetchLib() {
  // Contents, not mere existence. The directories are created empty before
  // anything is copied in, so a run that matched no files left them behind —
  // and an existence check then reported "already present" forever, masking the
  // real failure. `build.rs`'s guard has the same blind spot, so the build got
  // a raw "cannot find -lvosk" instead of the actionable message.
  if (!force && populated(LIB_DIR) && populated(LINK_DIR)) {
    console.log(`fetch-vosk: libvosk already present (${LIB_DIR})`);
    return;
  }
  console.log(`fetch-vosk: libvosk ${VOSK_VERSION} for ${process.platform}`);
  const tmp = join(VENDOR, ".tmp-lib");
  await rm(tmp, { recursive: true, force: true });
  await mkdir(tmp, { recursive: true });
  const zip = join(tmp, "lib.zip");
  await download(plat.url, zip, plat.sha256);
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
    throw new Error(
      `archive layout changed — ${shipped} shippable, ${linked} linkable`,
    );
  }
  console.log(
    `fetch-vosk: ${shipped} runtime lib(s) -> lib/, ${linked} link target(s) -> link/`,
  );
}

async function fetchModel() {
  if (!force && existsSync(MODEL_DIR)) {
    console.log(`fetch-vosk: model already present (${MODEL_DIR})`);
    return;
  }
  console.log(`fetch-vosk: ${MODEL_NAME} (~40 MB)`);
  const tmp = join(VENDOR, ".tmp-model");
  await rm(tmp, { recursive: true, force: true });
  await mkdir(tmp, { recursive: true });
  const zip = join(tmp, "model.zip");
  await download(MODEL_URL, zip, MODEL_SHA256);
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
// Concurrently: two unrelated downloads from two different hosts, ~115 MB
// between them, sharing nothing but the parent directory. Serially, a release
// pays `lib + model`; the matrix is one-at-a-time, so that is three times per
// release. The extractions still take turns — `spawnSync` blocks the loop —
// but the downloads are the expensive half and they now overlap.
await Promise.all([fetchLib(), fetchModel()]);

// The one file the recogniser cannot start without; a truncated download is
// otherwise only discovered at runtime, as "could not load the Vosk model".
if (!existsSync(join(MODEL_DIR, "am", "final.mdl"))) {
  console.error(
    `fetch-vosk: ${MODEL_DIR} has no am/final.mdl — the model looks incomplete`,
  );
  process.exit(1);
}
console.log("fetch-vosk: ready");
