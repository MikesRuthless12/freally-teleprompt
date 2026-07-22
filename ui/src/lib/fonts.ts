import type { FontFamilyId } from "../api/types";

/**
 * Reading typefaces (FT-15): the stable **id** Rust validates, mapped to the CSS
 * stack a surface actually renders with.
 *
 * The split is deliberate. Rust owns the list of ids because the value is
 * persisted and crosses IPC, and an arbitrary string reaching a `font-family`
 * would be a much wider surface than six choices. The stacks live here because
 * they are a rendering detail that only the webview cares about.
 *
 * `ui/src/panels/Teleprompter.tsx` renders with these; the LAN mirror page
 * (`src-tauri/assets/mirror.html`) carries the same table inline, because it is
 * served to a browser that never loads this bundle. A unit test asserts the two
 * copies match — see `phase1.test.ts`.
 */

/**
 * The bundled Noto families, appended to EVERY stack.
 *
 * The app ships in 18 languages and the user can switch at any time, so a
 * typeface choice must never decide whether text is legible. Georgia has no
 * Japanese; Consolas has no Devanagari. Without these, picking "Serif" and then
 * switching to Korean would render tofu boxes — a font choice silently becoming
 * a language restriction.
 *
 * Order is not arbitrary: each family declares `unicode-range`, so the browser
 * walks the list and uses the first that actually has the codepoint. The chosen
 * typeface still wins for every character it covers.
 */
const NOTO_FALLBACK =
  "'Noto Sans Variable', 'Noto Sans Arabic Variable', 'Noto Sans Devanagari Variable', " +
  "'Noto Sans JP Variable', 'Noto Sans KR Variable', 'Noto Sans SC Variable'";

/** `stack` is what the operator picked; Noto then covers everything it cannot. */
const withNoto = (stack: string) => `${stack}, ${NOTO_FALLBACK}`;

export const FONT_STACKS: Record<FontFamilyId, string> = {
  // "System" now leads with Noto rather than the OS UI font: the whole point of
  // bundling it is that the app looks and reads the same everywhere, in every
  // language, instead of depending on what each machine happens to have.
  system: withNoto("'Noto Sans Variable', system-ui, -apple-system, 'Segoe UI', sans-serif"),
  sans: withNoto("'Noto Sans Variable', Inter, 'Helvetica Neue', Arial, sans-serif"),
  serif: withNoto("Georgia, 'Times New Roman', serif"),
  mono: withNoto("ui-monospace, 'Cascadia Mono', Consolas, monospace"),
  rounded: withNoto("Nunito, 'Trebuchet MS', system-ui, sans-serif"),
  slab: withNoto("Rockwell, 'Courier New', Georgia, serif"),
};

/** Every id, in the order the Settings picker offers them. */
export const FONT_FAMILY_IDS = Object.keys(FONT_STACKS) as FontFamilyId[];

/** The CSS stack for an id, falling back to the system font for anything
 * unrecognised — a settings file from a future build must not blank the text. */
export function fontStack(id: string): string {
  return FONT_STACKS[id as FontFamilyId] ?? FONT_STACKS.system;
}
