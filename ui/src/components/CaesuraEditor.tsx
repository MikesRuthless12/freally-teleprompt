import { useEffect, useRef } from "react";

import { chipLabel, isChip, normalizePaste, tokenize } from "../lib/caesuraChips";

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
        if (el.dataset.caesura !== undefined) {
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
  let total = 0;
  let stop = false;
  const rec = (node: Node) => {
    if (stop) return;
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

/** Rebuild the whole editor DOM from a script string (text nodes + chips). */
function render(root: HTMLElement, script: string, defaultSecs: number) {
  root.textContent = "";
  const frag = document.createDocumentFragment();
  for (const tok of tokenize(script)) {
    frag.appendChild(
      isChip(tok) ? buildChip(tok.chip, defaultSecs) : document.createTextNode(tok.text),
    );
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

export function CaesuraEditor({
  value,
  onChange,
  caesuraSecs,
  placeholder,
  className,
  ariaLabelledBy,
}: {
  /** The script string (engine-authoritative; external changes rebuild the DOM). */
  value: string;
  /** Emitted on every user edit with the new serialized script. */
  onChange: (next: string) => void;
  /** Operator default-pause (seconds) — labels bare ` -- ` chips. */
  caesuraSecs: number;
  placeholder?: string;
  className?: string;
  /** id of the visible label element (a contenteditable can't use <label for>). */
  ariaLabelledBy?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const placeholderRef = useRef<HTMLDivElement>(null);
  const composing = useRef(false);
  const caesuraSecsRef = useRef(caesuraSecs);

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
    render(root, script, caesuraSecsRef.current);
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
    render(root, script, caesuraSecsRef.current);
    setCaret(root, script.length);
    emit(root);
  };

  // External value change (initial mount, a script opened from the library):
  // rebuild only when it differs from what's already shown, preserving the caret
  // if the editor is focused (so our own echoed edits don't disturb typing).
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    if (serialize(root) === value) {
      updateEmpty(value);
      return;
    }
    const focused = document.activeElement === root;
    const caret = focused ? (selectionOffsets(root)?.start ?? null) : null;
    render(root, value, caesuraSecsRef.current);
    if (focused && caret !== null) setCaret(root, caret);
    updateEmpty(value);
  }, [value]);

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
      render(root, raw, caesuraSecsRef.current);
      setCaret(root, caret);
    }
    emit(root);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const root = ref.current;
    if (!root || composing.current) return;
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
        onCompositionStart={() => {
          composing.current = true;
        }}
        onCompositionEnd={() => {
          composing.current = false;
          if (ref.current) emit(ref.current);
        }}
        className={className}
        style={{ whiteSpace: "pre-wrap", overflowWrap: "break-word", outline: "none" }}
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
