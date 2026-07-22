#!/usr/bin/env node
/**
 * Light-theme coverage lint. Fails the build when a component reaches for a
 * white-alpha utility the light theme does not re-tint.
 *
 * The app is drawn with translucent *white* over near-black — `bg-white/10`,
 * `border-white/10`. The light theme swaps the page to near-white, and every one
 * of those surfaces vanishes. A CSS variable cannot reach inside a utility class,
 * so `global.css` re-tints the exact class names with translucent *black*.
 *
 * That coupling is invisible and one-directional: add `bg-white/25` to a
 * component and dark mode still looks perfect, so it ships, and light mode
 * renders white-on-white. Nothing else in the toolchain notices — Tailwind
 * happily emits the class, eslint sees a string, and no test opens the app in
 * light mode.
 *
 * Two traps this exists to catch:
 *
 *   1. A NEW utility with no override at all.
 *   2. A HOVER utility. `bg-white/5` emits `.bg-white\/5`, but `hover:bg-white/5`
 *      emits `.hover\:bg-white\/5:hover` — a *different selector*. Overriding the
 *      bare class does nothing for the hover variant, and the two look identical
 *      at a glance.
 *
 * Cloned from Freally Capture's `ui/scripts/theme-lint.mjs`.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src");
const CSS = join(SRC, "styles", "global.css");

/**
 * Utilities that are deliberately white in *both* themes, because they sit on a
 * surface that stays dark whatever the palette. Each needs a reason.
 */
const ON_DARK = {};

/** `bg-white/10`, `bg-white/[0.03]`, `border-white/5`, `hover:bg-white/5`, … */
const UTILITY = /(?<![\w:-])((?:hover:)?(?:bg|border)-white\/(?:\[[^\]]+\]|\d+))/g;

/** The selector Tailwind actually emits for a utility. */
function selectorFor(utility) {
  const hover = utility.startsWith("hover:");
  const escaped = utility
    .replaceAll(":", "\\:")
    .replaceAll("/", "\\/")
    .replaceAll("[", "\\[")
    .replaceAll("]", "\\]")
    .replaceAll(".", "\\.");
  return `.${escaped}${hover ? ":hover" : ""}`;
}

function sourceFiles(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return entry === "__tests__" ? [] : sourceFiles(path);
    return /\.tsx?$/.test(entry) ? [path] : [];
  });
}

const css = readFileSync(CSS, "utf8");
const used = new Map();
for (const file of sourceFiles(SRC)) {
  for (const [, utility] of readFileSync(file, "utf8").matchAll(UTILITY)) {
    if (!used.has(utility)) used.set(utility, relative(ROOT, file).replaceAll("\\", "/"));
  }
}

const fail = [];

// A guard on the guard. If the regex or the walk silently stops matching, every
// check below passes vacuously and the lint becomes a green rubber stamp.
if (used.size < 6) {
  fail.push(`only ${used.size} white-alpha utilities found in src — the scanner is broken`);
}
if (!css.includes('[data-theme="light"]')) {
  fail.push(`${relative(ROOT, CSS)} has no light-theme overrides — did the file move?`);
}

for (const [utility, where] of used) {
  if (utility in ON_DARK) continue;
  const rule = `:root[data-theme="light"] ${selectorFor(utility)} {`;
  if (!css.includes(rule)) {
    fail.push(`${utility} (${where}) has no light override — add to global.css:\n      ${rule}`);
  }
}

// Overrides for classes nothing uses any more are dead weight that nobody will
// delete, and they make the real coverage look better than it is.
for (const [, selector] of css.matchAll(/:root\[data-theme="light"\] (\.\S+) \{/g)) {
  if (!selector.includes("white")) continue; // black-alpha overrides are out of scope
  const live = [...used.keys()].some((utility) => selectorFor(utility) === selector);
  if (!live) fail.push(`dead light override for ${selector} — no component uses it`);
}

for (const [utility, reason] of Object.entries(ON_DARK)) {
  if (css.includes(`:root[data-theme="light"] ${selectorFor(utility)} {`)) {
    fail.push(`${utility} is re-tinted but listed as on-dark (${reason}) — pick one`);
  }
}

if (fail.length) {
  console.error("theme-lint FAILED\n");
  for (const line of fail) console.error("  " + line);
  console.error(
    `\n${fail.length} problem(s). These render white-on-white in the light theme. ` +
      `Re-tint them in src/styles/global.css, or add them to ON_DARK with a reason.`,
  );
  process.exit(1);
}

console.log(
  `theme-lint ok — ${used.size} white-alpha utilities, ` +
    `${used.size - Object.keys(ON_DARK).length} re-tinted for light, ` +
    `${Object.keys(ON_DARK).length} deliberately on-dark.`,
);
