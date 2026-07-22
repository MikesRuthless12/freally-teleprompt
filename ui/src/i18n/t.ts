import { useSyncExternalStore } from "react";

import { bundleFor } from "./bundle";
import { localeDir, resolveLocale, SOURCE_LOCALE, type LocaleCode } from "./locales";

/**
 * The active locale, held outside React so non-component code (error paths,
 * toasts) can translate without a hook. A tiny hand-rolled store — the app has
 * no state library and this does not justify introducing one.
 */
let active: LocaleCode = SOURCE_LOCALE;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getLocale(): LocaleCode {
  return active;
}

/**
 * Stamp `<html lang>` and `<html dir>`, which is what actually flips the layout
 * for Arabic — CSS logical properties and the browser's own bidi algorithm key
 * off `dir`, not off a React prop.
 */
function applyDocumentLocale(code: LocaleCode): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("lang", code);
  root.setAttribute("dir", localeDir(code));
}

/**
 * Resolve `Settings.language` against the OS preference list and apply it.
 * `"auto"` follows the system; an explicit tag wins.
 */
export function initLocale(setting: string, preferred: readonly string[] = navigatorLanguages()) {
  const code = resolveLocale(setting, preferred);
  active = code;
  applyDocumentLocale(code);
  emit();
  return code;
}

/**
 * Stamp the theme onto `<html data-theme>`.
 *
 * A chokepoint for the same reason `applyDocumentLocale` is one: the light
 * theme is not a single attribute's worth of behaviour. The whole palette and
 * every white-alpha re-tint in `styles/global.css` hang off this attribute, and
 * `scripts/theme-lint.mjs` polices that coupling — so a surface that forgets to
 * stamp it renders white-on-white with no test noticing.
 */
export function applyTheme(theme: "dark" | "light"): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
}

/**
 * Apply everything a settings snapshot changes about the document at once.
 * Callers should reach for this rather than remembering the pair.
 */
export function applySettingsToDocument(settings: { language: string; theme: "dark" | "light" }) {
  initLocale(settings.language);
  applyTheme(settings.theme);
}

function navigatorLanguages(): readonly string[] {
  if (typeof navigator === "undefined") return [];
  return navigator.languages?.length ? navigator.languages : [navigator.language];
}

export type TArgs = Record<string, string | number>;

/**
 * Translate `key`. Falls back through the bundle's English layer, then to the
 * key itself — a missing string shows `some-key`, which is ugly on purpose:
 * silent English in a Japanese UI hides the gap, a visible id does not.
 */
export function t(key: string, args?: TArgs): string {
  const bundle = bundleFor(active);
  const message = bundle.getMessage(key);
  if (!message?.value) return key;

  const errors: Error[] = [];
  const formatted = bundle.formatPattern(message.value, args, errors);
  if (errors.length > 0 && import.meta.env?.DEV) {
    console.warn(`i18n: "${key}" in ${active}:`, errors);
  }
  return formatted;
}

/** Re-render this component when the language changes. */
function useLocale(): LocaleCode {
  return useSyncExternalStore(subscribe, getLocale, () => SOURCE_LOCALE);
}

/**
 * `const t = useT()` — identical to the bare `t`, but subscribes the component
 * so switching language repaints it. Call it in any component that renders text.
 */
export function useT(): typeof t {
  useLocale();
  return t;
}
