import type { FontFamilyId } from "../api/types";

/**
 * Reading typefaces (FT-15): the stable **id** Rust validates, mapped to the CSS
 * stack a surface actually renders with.
 *
 * The split is deliberate. Rust owns the list of ids because the value is
 * persisted and crosses IPC, and an arbitrary string reaching a `font-family`
 * would be a much wider surface than six choices. The stacks live here because
 * they are a rendering detail that only the webview cares about — and because
 * they name fonts that are *already installed*: nothing is downloaded, which is
 * the same rule the rest of the app follows.
 *
 * `ui/src/panels/Teleprompter.tsx` renders with these; the LAN mirror page
 * (`src-tauri/assets/mirror.html`) carries the same table inline, because it is
 * served to a browser that never loads this bundle.
 */
export const FONT_STACKS: Record<FontFamilyId, string> = {
  system: 'system-ui, -apple-system, "Segoe UI", sans-serif',
  sans: 'Inter, "Helvetica Neue", Arial, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  mono: 'ui-monospace, "Cascadia Mono", Consolas, monospace',
  rounded: '"Nunito", "Trebuchet MS", system-ui, sans-serif',
  slab: '"Rockwell", "Courier New", Georgia, serif',
};

/** Every id, in the order the Settings picker offers them. */
export const FONT_FAMILY_IDS = Object.keys(FONT_STACKS) as FontFamilyId[];

/** The CSS stack for an id, falling back to the system font for anything
 * unrecognised — a settings file from a future build must not blank the text. */
export function fontStack(id: string): string {
  return FONT_STACKS[id as FontFamilyId] ?? FONT_STACKS.system;
}
