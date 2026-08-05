import { useEffect, useMemo, useState } from "react";

import { ModalShell } from "../components/ModalShell";
import {
  BUTTON,
  DIALOG_BODY,
  DIALOG_FOOTER,
  DIALOG_TITLE,
  FIELD,
  PRIMARY,
} from "../components/styles";
import { useT } from "../i18n/t";
import {
  type FindOptions,
  type Match,
  findMatches,
  matchContext,
  matchNearest,
  stepMatch,
} from "../lib/find";

/**
 * Find & replace (FT-M07), scoped to the open script.
 *
 * Incremental: the match list is recomputed from the live script on every
 * keystroke, so the count is always about the script as it is now rather than
 * as it was when the dialog opened. The matching itself is
 * `lib/find.ts` — this file owns only what is on screen.
 *
 * # ⚠️ It highlights, it never selects
 *
 * The obvious way to show the current match is to select it in the editor. It
 * is also wrong: setting a selection inside a contenteditable MOVES FOCUS to it
 * in Blink, so every press of Next would take the operator's typing out of the
 * search field they are typing in. The editor takes a `highlight` prop instead
 * and paints the range, which touches no selection and moves no focus. (This is
 * the same trap `setCaret` documents from the dictation side.)
 *
 * # Why the dialog does not own the script
 *
 * Replacements go back through the editor's imperative handle rather than
 * through `onScriptChange` directly, so each one lands on the undo stack as a
 * single step and reaches the engine, the projector and autosave by the same
 * path a keystroke does. Writing to the engine from here would be a second
 * source of truth for the script, which is the bug dictation shipped twice.
 */
export function FindReplace({
  open,
  script,
  current,
  onCurrent,
  onReplace,
  onReplaceAll,
  onClose,
}: {
  open: boolean;
  /** The live script — this dialog never keeps a copy. */
  script: string;
  /** The match being shown, or null. Owned by the shell because the editor
   * needs it too; this dialog only asks for it to move. */
  current: Match | null;
  onCurrent: (match: Match | null) => void;
  /** Replace the `at`-th match. The QUERY is passed, not the match, because the
   * shell re-derives it from the editor's live text — see `App`'s note. */
  onReplace: (query: string, replacement: string, options: FindOptions, at: number) => void;
  /** Replace every match; returns how many were actually replaced in the live
   * text, which is what the dialog reports. */
  onReplaceAll: (query: string, replacement: string, options: FindOptions) => number;
  onClose: () => void;
}) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [replacement, setReplacement] = useState("");
  const [options, setOptions] = useState<FindOptions>({
    caseSensitive: false,
    wholeWord: false,
  });
  const [at, setAt] = useState(0);
  /**
   * Where to resume the search after a replacement, and the script that
   * replacement was made against.
   *
   * ⚠️ The `from` half is what makes the offset mean anything. `script` is the
   * ENGINE'S ECHO and lags a round-trip behind the editor, so the render
   * immediately after a replacement still carries the old text and the old
   * match list — resolving the anchor there measured the new offset against
   * the old offsets and landed a match too far, silently stepping over an
   * occurrence and never replacing it. The anchor is held until `script`
   * actually changes, which is the moment the new match list exists.
   */
  const [anchor, setAnchor] = useState<{ at: number; from: string } | null>(null);
  /** How many matches replace-all touched, until the next search changes. */
  const [replaced, setReplaced] = useState<number | null>(null);

  // Guarded on `open`, not just on the query. This dialog is MOUNTED whether or
  // not it is showing (`ModalShell` renders nothing when closed), so without
  // the guard every keystroke in the editor re-searched the whole script for a
  // query nobody had typed into a dialog nobody had opened — three full-script
  // arrays per keystroke, for a result that was never read.
  const matches = useMemo(
    () => (open ? findMatches(script, query, options) : []),
    [open, script, query, options],
  );

  // Reset the dialog's own scratch state on every OPEN transition, derived
  // during render rather than in an effect — the pattern every other dialog
  // here uses, and for the same reason: "did `open` flip?" is a pure question.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setAt(0);
      setReplaced(null);
    }
  }

  // Keep the shown match in range as the script and the query change under the
  // dialog. Re-anchoring on the match at or after where we were is what stops
  // an edit ABOVE the current hit throwing the operator back to the top.
  //
  // In an effect rather than during render because it must also push the new
  // match OUT to the shell, and a parent setState during a child's render is
  // the one thing React refuses outright.
  useEffect(() => {
    if (!open) return;
    if (matches.length === 0) {
      onCurrent(null);
      // ⚠️ Clear the anchor HERE too. Returning early left one behind, and it
      // was then applied to the operator's NEXT, unrelated search — which
      // opened partway down the script reading "2 of 2" instead of at the
      // first hit.
      if (anchor !== null) setAnchor(null);
      return;
    }
    // Only once the edit has actually come back from the engine — see `anchor`.
    const ready = anchor !== null && anchor.from !== script;
    const bounded = ready
      ? matchNearest(matches, anchor.at)
      : at < matches.length
        ? at
        : matchNearest(matches, current?.start ?? 0);
    if (ready) setAnchor(null);
    if (bounded !== at) setAt(bounded);
    onCurrent(matches[bounded]);
    // `current` is deliberately absent: it is this effect's OUTPUT, and reading
    // it as an input would re-run on every push and loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, matches, at, anchor, script, onCurrent]);

  // The highlight belongs to the search, so it goes when the search does —
  // otherwise a closed dialog leaves a lit match in the operator's script with
  // nothing on screen explaining it.
  useEffect(() => {
    if (!open) onCurrent(null);
  }, [open, onCurrent]);

  const move = (direction: 1 | -1) => {
    if (matches.length === 0) return;
    setReplaced(null);
    setAt(stepMatch(matches.length, at, direction));
  };

  const doReplace = () => {
    const match = matches[at];
    if (!match) return;
    setReplaced(null);
    onReplace(query, replacement, options, at);
    // Replacing text with itself changes nothing, so no new script is coming
    // and an anchor would wait for an edit that never lands. Step on instead.
    if (replacement === script.slice(match.start, match.end)) {
      setAt(stepMatch(matches.length, at, 1));
      return;
    }
    // ⚠️ Resume PAST what was just written, not at the same ordinal.
    //
    // Staying put reads correctly only while the replacement does not itself
    // match: then the list is one shorter and ordinal `at` is already the next
    // occurrence. But replace "the" with "there" and the new text matches too,
    // so ordinal `at` is the SAME occurrence — pressing Replace three times
    // turned one word into "therere" while the other two sat untouched, and the
    // count went on reading "1 of 3" the whole time. Anchoring on the end of
    // the inserted text and re-finding from there is correct either way.
    setAnchor({ at: match.start + replacement.length, from: script });
  };

  const doReplaceAll = () => {
    const count = onReplaceAll(query, replacement, options);
    if (count === 0) return;
    setAt(0);
    setAnchor(null);
    setReplaced(count);
  };

  const context = current && matches.length > 0 ? matchContext(script, current) : null;
  const countLabel =
    query === ""
      ? ""
      : matches.length === 0
        ? t("find-none")
        : t("find-count", { at: at + 1, total: matches.length });

  return (
    <ModalShell open={open} onClose={onClose} labelledBy="find-title">
      <div data-testid="find-replace" className={`w-[30rem] ${DIALOG_BODY}`}>
        <h2 id="find-title" className={DIALOG_TITLE}>
          {t("find-title")}
        </h2>

        <div className="flex flex-col gap-2">
          <input
            className={FIELD}
            data-testid="find-query"
            value={query}
            autoFocus
            placeholder={t("find-what")}
            aria-label={t("find-what")}
            onChange={(e) => {
              setQuery(e.target.value);
              // A new search starts at the top, and its result is not the
              // count the last replace-all reported — nor is it a place to
              // resume from, so any pending anchor goes with it.
              setAt(0);
              setAnchor(null);
              setReplaced(null);
            }}
            onKeyDown={(e) => {
              // Enter walks the matches, Shift+Enter walks them backwards —
              // the shape every find field in every editor has.
              if (e.key === "Enter") {
                e.preventDefault();
                move(e.shiftKey ? -1 : 1);
              }
            }}
          />
          <input
            className={FIELD}
            data-testid="find-replacement"
            value={replacement}
            placeholder={t("find-with")}
            aria-label={t("find-with")}
            onChange={(e) => setReplacement(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px]">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              data-testid="find-case"
              checked={options.caseSensitive}
              onChange={(e) => {
                setOptions((o) => ({ ...o, caseSensitive: e.target.checked }));
                setAt(0);
              }}
            />
            {t("find-case")}
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              data-testid="find-whole-word"
              checked={options.wholeWord}
              onChange={(e) => {
                setOptions((o) => ({ ...o, wholeWord: e.target.checked }));
                setAt(0);
              }}
            />
            {t("find-whole-word")}
          </label>
          <div className="flex-1" />
          <span
            data-testid="find-count"
            className="text-havoc-muted font-mono tabular-nums"
            // Announced, because the count is the whole answer to what was
            // typed and a screen reader has no highlight to look at.
            role="status"
            aria-live="polite"
          >
            {replaced !== null ? t("find-replaced", { count: replaced }) : countLabel}
          </span>
        </div>

        {/* The match in context, so two hits can be told apart without looking
            away from the dialog — the operator's eyes are here, not on the
            script behind it. */}
        {context && (
          <p
            data-testid="find-context"
            className="text-havoc-muted m-0 truncate rounded-md border border-white/10 bg-white/5 px-2 py-1.5 font-mono text-[11px]"
          >
            {context.text.slice(0, context.start)}
            <span className="text-havoc-accent font-bold">
              {context.text.slice(context.start, context.end)}
            </span>
            {context.text.slice(context.end)}
          </p>
        )}

        <div className={DIALOG_FOOTER}>
          <button
            type="button"
            className={BUTTON}
            data-testid="find-previous"
            disabled={matches.length === 0}
            onClick={() => move(-1)}
          >
            {t("find-previous")}
          </button>
          <button
            type="button"
            className={BUTTON}
            data-testid="find-next"
            disabled={matches.length === 0}
            onClick={() => move(1)}
          >
            {t("find-next")}
          </button>
          <div className="flex-1" />
          <button
            type="button"
            className={BUTTON}
            data-testid="find-replace-one"
            disabled={matches.length === 0}
            onClick={doReplace}
          >
            {t("find-replace")}
          </button>
          <button
            type="button"
            className={PRIMARY}
            data-testid="find-replace-all"
            disabled={matches.length === 0}
            onClick={doReplaceAll}
          >
            {t("find-replace-all")}
          </button>
          <button type="button" className={BUTTON} onClick={onClose}>
            {t("find-close")}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
