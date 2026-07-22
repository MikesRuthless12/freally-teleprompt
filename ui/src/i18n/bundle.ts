import { FluentBundle, FluentResource } from "@fluent/bundle";

import { LOCALES, SOURCE_LOCALE, type LocaleCode } from "./locales";

/**
 * All eighteen catalogs, inlined at build time. `eager` because the app must
 * paint in the right language on its first frame — a lazily-fetched catalog
 * would flash English first.
 */
const SOURCES = import.meta.glob("./locales/*.ftl", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

// A missing catalog is a build-time mistake, not a runtime one — fail loudly
// with the actionable hint.
function sourceFor(code: LocaleCode): string {
  const text = SOURCES[`./locales/${code}.ftl`];
  if (text === undefined) {
    throw new Error(`i18n: no catalog for "${code}" — expected ui/src/i18n/locales/${code}.ftl`);
  }
  return text;
}

/**
 * English is added to every bundle *first*, then the target locale overwrites
 * it. Fluent keeps the first definition of a key unless told otherwise, so
 * `allowOverrides` is what makes the target win — without it every string would
 * silently render in English. The layering is what lets a half-translated
 * catalog ship: a missing key falls back to English instead of showing its id.
 */
function buildBundle(code: LocaleCode): FluentBundle {
  // `useIsolating` wraps placeables in Unicode bidi marks. Right for prose in a
  // mixed-direction paragraph, wrong for a UI where the invisible characters
  // leak into `title` attributes and test assertions.
  const bundle = new FluentBundle(code, { useIsolating: false });

  if (code !== SOURCE_LOCALE) {
    bundle.addResource(new FluentResource(sourceFor(SOURCE_LOCALE)));
  }
  bundle.addResource(new FluentResource(sourceFor(code)), { allowOverrides: true });
  return bundle;
}

const CACHE = new Map<LocaleCode, FluentBundle>();

export function bundleFor(code: LocaleCode): FluentBundle {
  let bundle = CACHE.get(code);
  if (!bundle) {
    bundle = buildBundle(code);
    CACHE.set(code, bundle);
  }
  return bundle;
}

/** Every locale we ship a catalog for. Used by the parity test. */
export function loadedLocales(): LocaleCode[] {
  return LOCALES.map((l) => l.code);
}

/** The raw catalog text — for the parity test and the lint script. */
export function catalogSource(code: LocaleCode): string {
  return sourceFor(code);
}
