import { useEffect, useImperativeHandle, useLayoutEffect, useRef } from "react";

import { chipLabel, isChip, normalizePaste, tokenize } from "../lib/caesuraChips";
import { complete, loadDict } from "../lib/suggest";

// The caesura CHIP editor (FT-11): a contenteditable script editor where every
// inline ` -- ` / ` --N ` caesura is rendered as an atomic, non-editable CHIP.
// The caret can only land before or after a chip (never inside it),
// Backspace/Delete removes the whole token in one go, Shift+Arrow selects it as
// a unit, and copy/cut carry the token text — the "atomic" behaviour comes
// natively from `contenteditable="false"` on the chip, with a few surgical key
// handlers to match what an operator expects.
//
// The editor is a controlled surface over a plain script STRING: the chip token
// is only the dashes(+digits) core (`--`, `--2`, `--0.5`); the fencing spaces
// stay as ordinary text, so `serialize()` round-trips the script byte-for-byte
// and the chip split matches the Rust/TS caesura parser exactly. The pure
// tokenizer lives in ../lib/caesuraChips so it can be unit-tested without a DOM.

/** Build a chip element. `contentEditable="false"` makes it atomic; the inner
 * text is `user-select:none` so a selection treats it as one unit. Styled inline
 * (accent pill) so the component stays self-contained and theme-aware — the
 * colours are the theme's own variables, which both palettes define. */
function buildChip(token: string, defaultSecs: number): HTMLSpanElement {
  const span = document.createElement("span");
  span.dataset.caesura = token;
  span.contentEditable = "false";
  span.setAttribute("role", "img");
  span.setAttribute("aria-label", `pause ${chipLabel(token, defaultSecs)}`);
  span.textContent = `⏸ ${chipLabel(token, defaultSecs)}`;
  span.style.cssText = [
    "display:inline-block",
    "margin:0 1px",
    "padding:0 0.4em",
    "border-radius:0.4em",
    "font-size:0.8em",
    "line-height:1.35",
    "vertical-align:baseline",
    "white-space:nowrap",
    "user-select:none",
    "cursor:default",
    "color:var(--color-havoc-accent)",
    "background:color-mix(in srgb, var(--color-havoc-accent) 18%, transparent)",
    "border:1px solid color-mix(in srgb, var(--color-havoc-accent) 45%, transparent)",
  ].join(";");
  return span;
}

/** Build the ghost-text span (FT-21): the completion the operator would get by
 * pressing Tab, drawn inline after the caret.
 *
 * `contentEditable="false"` keeps the caret out of it and `user-select:none`
 * keeps it out of selections and the clipboard, so the only ways it can become
 * real text are Tab and nothing else. It is drawn with `opacity` rather than a
 * colour, which is why it needs no light/dark override — see `theme:lint`.
 * `aria-hidden` keeps a screen reader from reading a word the user never typed. */
function buildGhost(text: string): HTMLSpanElement {
  const span = document.createElement("span");
  span.dataset.ghost = "";
  span.contentEditable = "false";
  span.setAttribute("aria-hidden", "true");
  span.textContent = text;
  span.style.cssText = "opacity:0.4;user-select:none;pointer-events:none";
  return span;
}

/**
 * Build the find highlight (FT-M07): the match the operator is looking at.
 *
 * An ordinary `<span>` on purpose — `serialize`, `nodeLen` and `offsetOf` all
 * walk INTO an element they do not recognise, so this is transparent to every
 * one of them and the script string is unchanged by being highlighted. (A
 * `<mark>` would be too, but it also carries semantics a screen reader
 * announces, and the operator asked for a search, not for emphasis in their
 * script.)
 *
 * The colours are the accent over the page background, which is the one pairing
 * guaranteed to have contrast in **both** palettes: the whole app already draws
 * accent-coloured text on that background, so the inverse has the same ratio.
 * Deliberately not `color-mix` — that is fine for the chip, which degrades to no
 * tint, but a highlight that degrades to nothing is a search that shows you
 * nothing on any engine below the browserslist floor.
 */
function buildFindMark(text: string): HTMLSpanElement {
  const span = document.createElement("span");
  span.dataset.find = "";
  span.textContent = text;
  span.style.cssText = [
    "background:var(--color-havoc-accent)",
    "color:var(--color-havoc-bg)",
    "border-radius:0.15em",
  ].join(";");
  return span;
}

/** The pending suggestion currently on screen, or null. */
function ghostOf(root: HTMLElement): string | null {
  const el = root.querySelector<HTMLElement>("[data-ghost]");
  return el ? (el.textContent ?? null) : null;
}

/** Drop any ghost span. Safe to call when there is none. */
function removeGhost(root: HTMLElement) {
  root.querySelectorAll("[data-ghost]").forEach((el) => el.remove());
}

/** Serialize the editor DOM back to the plain script string: text nodes verbatim,
 * chips as their token, and any stray browser markup (a `<br>` or block wrapper
 * from a paste) as a newline — so we never lose the user's line breaks. */
function serialize(root: HTMLElement): string {
  let out = "";
  const walk = (node: Node) => {
    node.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        out += child.textContent ?? "";
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as HTMLElement;
        // Ghost text (FT-21) is a SUGGESTION painted into the DOM, not content.
        // Every one of serialize/nodeLen/offsetOf has to skip it: miss this one
        // and an unaccepted suggestion is saved into the operator's script.
        if (el.dataset.ghost !== undefined) {
          return;
        } else if (el.dataset.caesura !== undefined) {
          out += el.dataset.caesura;
        } else if (el.tagName === "BR") {
          out += "\n";
        } else {
          const isBlock = el.tagName === "DIV" || el.tagName === "P";
          if (isBlock && out.length > 0 && !out.endsWith("\n")) out += "\n";
          walk(el);
        }
      }
    });
  };
  walk(root);
  return out;
}

/** Serialized length of one node (a chip counts as its whole token). */
function nodeLen(node: Node): number {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent?.length ?? 0;
  const el = node as HTMLElement;
  if (el.dataset && el.dataset.ghost !== undefined) return 0; // suggestion, not content
  if (el.dataset && el.dataset.caesura !== undefined) return el.dataset.caesura.length;
  if (el.tagName === "BR") return 1;
  let sum = 0;
  el.childNodes.forEach((c) => (sum += nodeLen(c)));
  return sum;
}

/** Character offset (into the serialized string) of a DOM position. The caret in
 * this editor is always in a top-level text node or between top-level nodes, so a
 * single ordered pass over the children is exact. */
function offsetOf(root: HTMLElement, container: Node, offsetInNode: number): number {
  // The caret can sit on the ROOT itself — `(root, 0)` is what a browser gives
  // for a collapsed range at the very start, and what `Range.selectNodeContents`
  // + `collapse` produces. The walk below only ever visits root's DESCENDANTS,
  // so such a position was never matched: `stop` stayed false, every child was
  // counted, and the answer came back as the length of the WHOLE script. A
  // caret at the top therefore read as a caret at the bottom, and anything
  // inserted there — a paste, a dictated utterance — landed at the end instead.
  if (container === root) {
    const kids = Array.from(root.childNodes);
    let before = 0;
    for (let k = 0; k < offsetInNode && k < kids.length; k++) before += nodeLen(kids[k]);
    return before;
  }
  let total = 0;
  let stop = false;
  const rec = (node: Node) => {
    if (stop) return;
    // Checked BEFORE the container test: ghost text contributes nothing to the
    // offset, and the caret can never legitimately sit inside one (the span is
    // `contentEditable="false"`). Without this every offset after a visible
    // suggestion is wrong by its length — which silently misplaces the caret,
    // the chip boundaries and every edit that reads `start`/`end`.
    if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).dataset.ghost !== undefined)
      return;
    if (node === container) {
      if (node.nodeType === Node.TEXT_NODE) {
        total += offsetInNode;
      } else {
        const kids = Array.from(node.childNodes);
        for (let k = 0; k < offsetInNode && k < kids.length; k++) total += nodeLen(kids[k]);
      }
      stop = true;
      return;
    }
    if (node.nodeType === Node.TEXT_NODE) {
      total += node.textContent?.length ?? 0;
      return;
    }
    const el = node as HTMLElement;
    if (el.dataset && el.dataset.caesura !== undefined) {
      total += el.dataset.caesura.length;
      return;
    }
    if (el.tagName === "BR") {
      total += 1;
      return;
    }
    node.childNodes.forEach(rec);
  };
  root.childNodes.forEach(rec);
  return total;
}

/** The current selection as string offsets, or null when the selection is
 * outside this editor. */
function selectionOffsets(root: HTMLElement): { start: number; end: number } | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const r = sel.getRangeAt(0);
  if (!root.contains(r.startContainer) || !root.contains(r.endContainer)) return null;
  return {
    start: offsetOf(root, r.startContainer, r.startOffset),
    end: offsetOf(root, r.endContainer, r.endOffset),
  };
}

/** Place a collapsed caret at string offset `target`, snapping to the nearest
 * chip edge if it would fall inside a chip (which can't hold a caret). */
function setCaret(root: HTMLElement, target: number) {
  const sel = window.getSelection();
  if (!sel) return;
  const range = document.createRange();
  let remaining = Math.max(0, target);
  for (const node of Array.from(root.childNodes)) {
    const len = nodeLen(node);
    if (remaining <= len) {
      if (node.nodeType === Node.TEXT_NODE) {
        range.setStart(node, Math.max(0, Math.min(len, remaining)));
      } else if (remaining <= 0) {
        range.setStartBefore(node);
      } else {
        range.setStartAfter(node);
      }
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
      return;
    }
    remaining -= len;
  }
  // Past the end: caret at the very end of the content.
  range.selectNodeContents(root);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);
}

/** A half-open string range in the script — what find & replace hands back. */
export type EditorRange = { start: number; end: number };

/** Rebuild the whole editor DOM from a script string (text nodes + chips), with
 * `highlight` (if any) wrapped so the operator can see the current match. */
function render(
  root: HTMLElement,
  script: string,
  defaultSecs: number,
  highlight: EditorRange | null,
) {
  root.textContent = "";
  const frag = document.createDocumentFragment();
  // Where each token starts in the script string, so the highlight — which is
  // measured in those same units — can be split across the tokens it covers.
  let at = 0;
  for (const tok of tokenize(script)) {
    if (isChip(tok)) {
      frag.appendChild(buildChip(tok.chip, defaultSecs));
      at += tok.chip.length;
      continue;
    }
    const { text } = tok;
    const end = at + text.length;
    if (!highlight || highlight.end <= at || highlight.start >= end) {
      frag.appendChild(document.createTextNode(text));
    } else {
      const from = Math.max(0, highlight.start - at);
      const to = Math.min(text.length, highlight.end - at);
      if (from > 0) frag.appendChild(document.createTextNode(text.slice(0, from)));
      frag.appendChild(buildFindMark(text.slice(from, to)));
      if (to < text.length) frag.appendChild(document.createTextNode(text.slice(to)));
    }
    at = end;
  }
  root.appendChild(frag);
}

/** The list of chip tokens currently in the DOM (order preserved), for detecting
 * when an edit created or dissolved a caesura and the DOM needs re-chipping. */
function domChips(root: HTMLElement): string {
  return Array.from(root.querySelectorAll<HTMLElement>("[data-caesura]"))
    .map((c) => c.dataset.caesura ?? "")
    .join(" ");
}

/** What a `ref` on this editor gets you — see `insertText` below. */
export type CaesuraEditorHandle = {
  /** Write `text` into the script as if it had been pasted there. */
  insertText: (text: string) => void;
  /**
   * Replace one range with `text` — find & replace's single-match edit
   * (FT-M07).
   *
   * Goes through the same `snapshot(true)` + `apply` pair every other write
   * path here does, so a replacement is **one** step of Ctrl+Z rather than a
   * hole in the undo stack. That is the lesson dictation paid for; a new write
   * path has to re-earn every guard the old ones have.
   */
  replaceRange: (start: number, end: number, text: string) => void;
  /** Replace the whole script — replace-all, which is one edit however many
   * matches it touched. Undone in one step, for the same reason. */
  setText: (text: string) => void;
};

export function CaesuraEditor({
  value,
  onChange,
  caesuraSecs,
  autocomplete = false,
  autocompleteLang,
  placeholder,
  className,
  ariaLabelledBy,
  highlight = null,
  ref: handle,
}: {
  /** The script string (engine-authoritative; external changes rebuild the DOM). */
  value: string;
  /** Emitted on every user edit with the new serialized script. */
  onChange: (next: string) => void;
  /** Operator default-pause (seconds) — labels bare ` -- ` chips. */
  caesuraSecs: number;
  /** Offer ghost-text completions while typing (FT-20/FT-21). */
  autocomplete?: boolean;
  /** The resolved locale whose table to complete against (FT-20). */
  autocompleteLang?: string;
  placeholder?: string;
  className?: string;
  /** id of the visible label element (a contenteditable can't use <label for>). */
  ariaLabelledBy?: string;
  /**
   * The find match to show (FT-M07), as a string range, or null for none.
   *
   * ⚠️ A HIGHLIGHT, never a selection. Setting the document selection is what
   * `setCaret` does, and in Blink that MOVES FOCUS into the editable host — so
   * a find dialog that selected each match would take the operator's typing out
   * of its own search field on every press of Next. Painting the match instead
   * leaves focus exactly where the operator put it.
   */
  highlight?: EditorRange | null;
  /** Imperative handle — the one thing this editor cannot express as a prop. */
  ref?: React.Ref<CaesuraEditorHandle>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const placeholderRef = useRef<HTMLDivElement>(null);
  const composing = useRef(false);
  const caesuraSecsRef = useRef(caesuraSecs);
  // Read inside DOM handlers that deliberately do not re-subscribe. Kept in step
  // by the effect below, not assigned during render — same as `caesuraSecsRef`.
  const autocompleteRef = useRef(autocomplete);
  const langRef = useRef(autocompleteLang);
  // The find match, read by every rebuild path — including the ones that fire
  // from a DOM handler and cannot see a prop. Kept in step by the layout effect
  // below, which is also what re-renders when it changes.
  const highlightRef = useRef<EditorRange | null>(highlight);

  const updateEmpty = (str: string) => {
    if (placeholderRef.current)
      placeholderRef.current.style.display = str.length ? "none" : "block";
  };

  const emit = (root: HTMLDivElement) => {
    const raw = serialize(root);
    updateEmpty(raw);
    onChange(raw);
  };

  // Rebuild from a known string and drop the caret at `caret`, then emit.
  const apply = (root: HTMLDivElement, script: string, caret: number) => {
    render(root, script, caesuraSecsRef.current, highlightRef.current);
    setCaret(root, caret);
    emit(root);
  };

  // Undo / redo. The contenteditable rebuilds its DOM on structural edits, which
  // wipes the browser's native undo history, so we keep our own coalesced
  // string-snapshot stack (Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z).
  const undoStack = useRef<string[]>([]);
  const redoStack = useRef<string[]>([]);
  const lastSnapMs = useRef(0);
  const snapshot = (force: boolean) => {
    const root = ref.current;
    if (!root) return;
    const now = Date.now();
    if (!force && now - lastSnapMs.current < 500) return; // coalesce fast typing bursts
    lastSnapMs.current = now;
    const cur = serialize(root);
    const stack = undoStack.current;
    if (stack[stack.length - 1] === cur) return;
    stack.push(cur);
    if (stack.length > 200) stack.shift();
    redoStack.current = [];
  };
  const restore = (from: string[], to: string[]) => {
    const root = ref.current;
    if (!root || from.length === 0) return;
    to.push(serialize(root));
    const script = from.pop() as string;
    render(root, script, caesuraSecsRef.current, highlightRef.current);
    setCaret(root, script.length);
    emit(root);
  };

  // --- ghost text (FT-21) --------------------------------------------------

  // Redraw the suggestion for wherever the caret now is. Cheap enough to run on
  // every keystroke: `complete()` scans one small pre-indexed bucket.
  const refreshGhost = (root: HTMLDivElement) => {
    removeGhost(root);
    const lang = langRef.current;
    if (!autocompleteRef.current || !lang || composing.current) return;
    if (document.activeElement !== root) return;
    const sel = selectionOffsets(root);
    if (!sel || sel.start !== sel.end) return; // never over a selection
    const raw = serialize(root);
    // Only at the end of a word: completing "hel|lo" would paint the suggestion
    // into the middle of a word the operator has already finished typing.
    const next = raw.slice(sel.start, sel.start + 1);
    if (next && !/\s/.test(next)) return;
    const [suffix] = complete(raw.slice(0, sel.start), lang);
    if (!suffix) return;
    const live = window.getSelection();
    if (!live || live.rangeCount === 0) return;
    live.getRangeAt(0).insertNode(buildGhost(suffix));
    setCaret(root, sel.start); // insertNode split the text node; caret goes back
  };

  // Tab accepts the suggestion as real text — it stops being dimmed because it
  // stops being a ghost span. Returns false when nothing was pending, so the
  // caller can let Tab do its usual job of moving focus.
  const acceptGhost = (root: HTMLDivElement): boolean => {
    const suffix = ghostOf(root);
    if (!suffix) return false;
    const at = selectionOffsets(root)?.start;
    removeGhost(root);
    const raw = serialize(root);
    const caret = at ?? raw.length;
    snapshot(true);
    apply(root, raw.slice(0, caret) + suffix + raw.slice(caret), caret + suffix.length);
    return true;
  };

  // External value change (initial mount, a script opened from the library):
  // rebuild only when it differs from what's already shown, preserving the caret
  // if the editor is focused (so our own echoed edits don't disturb typing).
  //
  // ⚠️ A LAYOUT effect, not a passive one, and that is a correctness rule
  // rather than a paint-timing preference. A passive effect runs after paint,
  // so a `voice:dictation` event — an ordinary macrotask — can land between the
  // commit that changed `value` and the rebuild that honours it. `insertText`
  // reads the live DOM, so in that window it would read the PREVIOUS script,
  // write it back out, and `App`'s autosave — already pointed at the newly
  // opened file — would persist Act One's text over Act Two. That is the
  // file-destroying bug the deleted `dictationBase` reset used to guard, and
  // running here closes the window instead of narrowing it: a layout effect is
  // flushed synchronously before the browser yields to any event at all.
  //
  // It owns the find highlight too (FT-M07), because a highlight is a reason to
  // rebuild the DOM exactly as a new `value` is. Compared STRUCTURALLY, not by
  // identity: the shell derives the current match during render, so a fresh
  // object arrives on every keystroke and an identity check would re-render the
  // whole script each time — the same "fresh array identity per broadcast"
  // defeat that cost a full re-parse per `pointermove` in Phase A.
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const previous = highlightRef.current;
    const moved = previous?.start !== highlight?.start || previous?.end !== highlight?.end;
    highlightRef.current = highlight;
    if (!moved && serialize(root) === value) {
      updateEmpty(value);
      return;
    }
    const focused = document.activeElement === root;
    const caret = focused ? (selectionOffsets(root)?.start ?? null) : null;
    render(root, value, caesuraSecsRef.current, highlight);
    if (focused && caret !== null) setCaret(root, caret);
    updateEmpty(value);
    // Bring the match on screen. `nearest` so a match already visible does not
    // jump the view, and optional-called because jsdom has no layout and no
    // implementation of this — the unit tests must not fail on a scroll.
    if (moved && highlight) {
      root.querySelector<HTMLElement>("[data-find]")?.scrollIntoView?.({ block: "nearest" });
    }
  }, [value, highlight]);

  // Default-pause change: refresh bare-chip labels in place (no structural change,
  // so the caret is untouched). Also keep the latest default in a ref for the
  // rebuild paths that intentionally don't re-subscribe to it.
  useEffect(() => {
    caesuraSecsRef.current = caesuraSecs;
    const root = ref.current;
    if (!root) return;
    root.querySelectorAll<HTMLElement>("[data-caesura]").forEach((chip) => {
      const token = chip.dataset.caesura ?? "--";
      chip.textContent = `⏸ ${chipLabel(token, caesuraSecs)}`;
      chip.setAttribute("aria-label", `pause ${chipLabel(token, caesuraSecs)}`);
    });
  }, [caesuraSecs]);

  // Warm the table for the active language, and clear any suggestion still on
  // screen when autocomplete is switched off.
  //
  // The redraw when the load resolves is the point, not a nicety. `complete()`
  // is synchronous and yields nothing until the chunk has landed, and the ghost
  // is otherwise only ever drawn from onInput — so an operator who types faster
  // than a ~600 kB chunk downloads gets NO suggestion at all until they happen
  // to press another key. Redrawing here closes that window; the caret has not
  // moved, so the suggestion simply appears where it should have been.
  useEffect(() => {
    autocompleteRef.current = autocomplete;
    langRef.current = autocompleteLang;
    const root = ref.current;
    if (!autocomplete) {
      if (root) removeGhost(root);
      return;
    }
    if (!autocompleteLang) return;
    let cancelled = false;
    void loadDict(autocompleteLang).then(() => {
      if (!cancelled && ref.current) refreshGhost(ref.current);
    });
    return () => {
      cancelled = true;
    };
  }, [autocomplete, autocompleteLang]);

  const onInput = () => {
    if (composing.current) return;
    const root = ref.current;
    if (!root) return;
    const raw = serialize(root);
    // Did this edit create or dissolve a caesura? If so, re-chip the DOM (keeping
    // the caret); otherwise leave the browser's caret alone and just report.
    const wanted = tokenize(raw)
      .filter(isChip)
      .map((t) => t.chip)
      .join(" ");
    if (wanted !== domChips(root)) {
      const caret = selectionOffsets(root)?.start ?? raw.length;
      render(root, raw, caesuraSecsRef.current, highlightRef.current);
      setCaret(root, caret);
    }
    emit(root);
    refreshGhost(root);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const root = ref.current;
    if (!root || composing.current) return;

    // Tab commits a pending suggestion, Esc dismisses it. Both fall through to
    // their normal jobs — moving focus, closing the dialog — when nothing is
    // pending, so neither key is stolen from the rest of the app.
    if (e.key === "Tab" && !e.shiftKey) {
      if (acceptGhost(root)) e.preventDefault();
      return;
    }
    if (e.key === "Escape") {
      if (ghostOf(root)) {
        e.preventDefault();
        removeGhost(root);
      }
      return;
    }
    // Any other key invalidates whatever is on screen; onInput redraws it after
    // the character lands. Navigation keys never reach onInput, which is exactly
    // right: moving the caret away should clear the suggestion, not move it.
    removeGhost(root);

    const mod = e.ctrlKey || e.metaKey;
    // Undo / redo (our own stack — the DOM rebuilds wipe the native one).
    if (mod && (e.key === "z" || e.key === "Z")) {
      e.preventDefault();
      if (e.shiftKey) restore(redoStack.current, undoStack.current);
      else restore(undoStack.current, redoStack.current);
      return;
    }
    if (mod && (e.key === "y" || e.key === "Y")) {
      e.preventDefault();
      restore(redoStack.current, undoStack.current);
      return;
    }
    const sel = selectionOffsets(root);
    if (!sel) return;
    const { start, end } = sel;
    const raw = serialize(root);
    // Snapshot the pre-edit script for undo (coalesced across a typing burst).
    if (
      !mod &&
      (e.key.length === 1 || e.key === "Enter" || e.key === "Backspace" || e.key === "Delete")
    ) {
      snapshot(false);
    }

    // Enter: insert a newline into the string model (keeps the DOM canonical —
    // text + chips only, never browser <div>/<br>).
    if (e.key === "Enter") {
      e.preventDefault();
      apply(root, raw.slice(0, start) + "\n" + raw.slice(end), start + 1);
      return;
    }

    // Typing the second dash of ` -- ` expands to a fenced caesura chip, caret
    // kept after it — so a pause is two keystrokes, not five.
    if (e.key === "-" && start === end) {
      const chars = Array.from(raw);
      if (start > 0 && chars[start - 1] === "-" && chars[start - 2] !== "-") {
        e.preventDefault();
        const before = chars.slice(0, start - 1).join("");
        const after = chars.slice(start).join("");
        const insert = `${before.length > 0 && !/\s$/.test(before) ? " " : ""}-- `;
        apply(root, before + insert + after, before.length + insert.length);
        return;
      }
    }

    // Backspace just after a ` -- ` / ` --N ` deletes the whole token (incl. its
    // fence spaces) in one keystroke, back to the previous word.
    if (e.key === "Backspace" && start === end) {
      const token = raw.slice(0, start).match(/ --(?:\d+(?:\.\d+)?)? $/);
      if (token) {
        e.preventDefault();
        const from = start - token[0].length;
        apply(root, raw.slice(0, from) + raw.slice(start), from);
        return;
      }
    }

    // Forward-delete a whole caesura sitting just after the caret.
    if (e.key === "Delete" && start === end) {
      const token = raw.slice(start).match(/^ --(?:\d+(?:\.\d+)?)? /);
      if (token) {
        e.preventDefault();
        apply(root, raw.slice(0, start) + raw.slice(start + token[0].length), start);
      }
    }
  };

  const onPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const root = ref.current;
    if (!root) return;
    const sel = selectionOffsets(root);
    const raw = serialize(root);
    const start = sel?.start ?? raw.length;
    const end = sel?.end ?? raw.length;
    const insert = normalizePaste(e.clipboardData.getData("text/plain"));
    snapshot(true);
    apply(root, raw.slice(0, start) + insert + raw.slice(end), start + insert.length);
  };

  /**
   * Write text into the script from OUTSIDE — dictation (FT-33) is the only
   * caller.
   *
   * Deliberately the paste path with a different source: read the live DOM,
   * `snapshot(true)`, `apply(...)`. That is what buys the three things
   * dictation used to lack, none of which are worth reimplementing:
   *
   *   - **undo.** Writing straight to `onChange` went around this stack
   *     entirely, so the first Ctrl+Z after a session jumped back to the last
   *     keystroke and discarded every dictated word in one step.
   *   - **whatever was typed by hand.** The old path chained from its own last
   *     write, so anything typed between two utterances was overwritten by the
   *     second one. Reading `serialize(root)` here is what makes the editor —
   *     not the caller — the single source of truth.
   *   - **the caret.** Text lands where the operator left it, not always at the
   *     end.
   *
   * The ONE deliberate difference from `onPaste`: a selection is not REPLACED.
   * Paste is an explicit "put this here" gesture, so overwriting a selection is
   * what the operator asked for; speaking is not, and silently swallowing a
   * selected paragraph because the microphone was open is not a trade worth
   * making. So the insert goes in at the selection's start and the selected text
   * is left where it is. (The selection itself still collapses — the DOM is
   * rebuilt from the string, exactly as every other edit here does it.)
   *
   * Three guards, and every one of them is a bug that reached review:
   *
   *   1. **Mid-composition, do nothing yet.** Every other write path in this
   *      component bails on `composing.current`; this one fires with no user
   *      action at all, so without the guard an utterance arriving while a CJK
   *      operator is mid-IME-preedit serializes the uncommitted text as script
   *      and destroys the node the IME is composing into. The utterance is
   *      HELD, not dropped, and flushed on `compositionend` — speech that was
   *      recognised must not vanish because of when it arrived.
   *   2. **An unfocused editor keeps its hands off the selection.** `setCaret`
   *      calls `removeAllRanges`/`addRange`, and setting a selection inside an
   *      editable host MOVES FOCUS to it in Blink — so a caret update here
   *      would pull the operator out of the Scripts dialog's filename field
   *      mid-sentence, or out of the record button, on every utterance.
   */
  /** Utterances that arrived mid-IME-composition, in order, awaiting its end. */
  const pendingInsert = useRef<string[]>([]);

  const insertText = (text: string) => {
    const root = ref.current;
    if (!root) return;
    // (1) Held until the composition commits — see `onCompositionEnd`.
    if (composing.current) {
      pendingInsert.current.push(text);
      return;
    }
    const focused = document.activeElement === root;
    const raw = serialize(root);
    // (3) An unfocused editor has no caret to insert at — and reading the
    // selection would find whatever it was left on, in an editor nobody is
    // looking at. Append, which is where dictation has always put it.
    const start = (focused ? selectionOffsets(root)?.start : undefined) ?? raw.length;
    const before = raw.slice(0, start);
    const after = raw.slice(start);
    // Dictation emits bare words with no separator, so the spacing is ours to
    // get right — on BOTH sides. The trailing one is not symmetry for its own
    // sake: text now lands at the caret rather than always at the end, so
    // speaking with the caret in front of a word ("hello |world") would
    // otherwise write "hello thereworld". Neither space is added where the
    // neighbouring text already has whitespace, or where there is no
    // neighbouring text at all.
    const lead = before.length === 0 || /\s$/.test(before) ? "" : " ";
    const trail = after.length === 0 || /^\s/.test(after) ? "" : " ";
    snapshot(true);
    const next = before + lead + text + trail + after;
    if (focused) {
      // The caret goes after the spoken words and BEFORE any trailing space, so
      // the next utterance chains onto this one exactly as if it had been
      // spoken in one breath.
      apply(root, next, start + lead.length + text.length);
      return;
    }
    // Unfocused: `apply` minus the caret. The selection is not ours to move.
    render(root, next, caesuraSecsRef.current, highlightRef.current);
    emit(root);
  };

  // Refreshed on EVERY render, with no dependency array, and that is the point:
  // `apply` calls `emit`, which calls the CURRENT `onChange`. Frozen with `[]`,
  // this would hold the first render's `onChange` — which in `App` closes over
  // the script that was open at mount, so autosave would write dictated text
  // into whichever file was open when the app started.
  /**
   * Find & replace's two write paths (FT-M07).
   *
   * Both are the paste path with a different source, exactly as `insertText`
   * is: read nothing from the caller but the new text, `snapshot(true)` so the
   * edit is one step of undo, then `apply`. Neither touches focus — the
   * operator is in the find dialog and must stay there — so the caret goes to
   * the end of what was written only when the editor already had it.
   */
  const writeThrough = (next: string, caret: number) => {
    const root = ref.current;
    if (!root) return;
    snapshot(true);
    if (document.activeElement === root) {
      apply(root, next, caret);
      return;
    }
    render(root, next, caesuraSecsRef.current, highlightRef.current);
    emit(root);
  };

  const replaceRange = (start: number, end: number, text: string) => {
    const root = ref.current;
    if (!root) return;
    const raw = serialize(root);
    // Clamped rather than trusted: the range was computed against the script as
    // it was when the dialog last searched, and an autosave echo or a dictated
    // word can have moved it since. A slice past the end would silently write
    // at the wrong place; clamping writes at the nearest real one.
    const from = Math.max(0, Math.min(raw.length, start));
    const to = Math.max(from, Math.min(raw.length, end));
    writeThrough(raw.slice(0, from) + text + raw.slice(to), from + text.length);
  };

  const setText = (text: string) => writeThrough(text, text.length);

  useImperativeHandle(handle, () => ({ insertText, replaceRange, setText }));

  // Copy/cut serialize chips back to their token text (not the pill glyph) so the
  // clipboard round-trips into any editor.
  const onCopy = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const root = ref.current;
    if (!root) return;
    const sel = selectionOffsets(root);
    if (!sel || sel.start === sel.end) return;
    e.preventDefault();
    e.clipboardData.setData("text/plain", serialize(root).slice(sel.start, sel.end));
  };
  const onCut = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const root = ref.current;
    if (!root) return;
    const sel = selectionOffsets(root);
    if (!sel || sel.start === sel.end) return;
    e.preventDefault();
    const raw = serialize(root);
    e.clipboardData.setData("text/plain", raw.slice(sel.start, sel.end));
    snapshot(true);
    apply(root, raw.slice(0, sel.start) + raw.slice(sel.end), sel.start);
  };

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={ref}
        data-testid="caesura-editor"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-labelledby={ariaLabelledBy}
        spellCheck={false}
        onInput={onInput}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        onCopy={onCopy}
        onCut={onCut}
        // A click moves the caret without ever reaching onKeyDown, and a blur
        // would otherwise leave a dimmed word sitting in an unfocused editor.
        onMouseDown={() => ref.current && removeGhost(ref.current)}
        onBlur={() => ref.current && removeGhost(ref.current)}
        onCompositionStart={() => {
          composing.current = true;
        }}
        onCompositionEnd={() => {
          composing.current = false;
          if (ref.current) emit(ref.current);
          // Anything dictation said while the IME held the DOM, now that it
          // does not. `splice` drains it in place before the loop runs, so a
          // re-entrant insert cannot see its own leftovers.
          for (const text of pendingInsert.current.splice(0)) insertText(text);
        }}
        className={className}
        // No `outline: "none"` here any more (FT-50). An inline style beats
        // every stylesheet, so it suppressed the shared focus floor and left
        // the app's PRIMARY control — the one an operator spends all their
        // time in — as the only thing a keyboard user could reach with no
        // indication they had reached it.
        style={{ whiteSpace: "pre-wrap", overflowWrap: "break-word" }}
      />
      <div
        ref={placeholderRef}
        aria-hidden="true"
        className="text-havoc-muted pointer-events-none absolute top-2 left-2 text-xs"
        style={{ display: value.length ? "none" : "block" }}
      >
        {placeholder}
      </div>
    </div>
  );
}
