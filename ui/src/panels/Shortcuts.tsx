import { useEffect, useLayoutEffect, useMemo, useState } from "react";

import { shortcutsStatus } from "../api/commands";
import type { HotkeyStatus, StoredBinding } from "../api/types";
import { ModalShell } from "../components/ModalShell";
import {
  BUTTON,
  DIALOG_BODY,
  DIALOG_FOOTER,
  DIALOG_TITLE,
  ERROR_LINE,
  FIELD,
  PRIMARY,
} from "../components/styles";
import { useT } from "../i18n/t";
import {
  COMMANDS,
  type Accelerator,
  type Binding,
  type Bindings,
  type CommandId,
  type CommandSpec,
  acceleratorFor,
  commandSpec,
  conflicts,
  formatAccelerator,
  resolveBindings,
} from "../lib/bindings";

/** Which of a row's two cells is being bound. */
type Scope = "window" | "global";

/**
 * The shortcut map (FT-M16), and with it the pedal's learn-a-button (FT-M04)
 * and the opt-in for global hotkeys (FT-M13).
 *
 * One dialog for three roadmap items because they are one table. Every row is a
 * command; its two cells are the two scopes; and binding either of them is the
 * same act — press the key you want, and whatever your keyboard, remote or foot
 * pedal sends is what gets stored.
 *
 * # ⚠️ A pedal is a keyboard, which is what makes this the whole of FT-M04
 *
 * Foot pedals and presenter remotes enumerate as HID keyboards and send
 * ordinary key events — usually `F13`–`F24`, precisely because nothing else on
 * a machine uses them. So "learn a button" needs no device enumeration, no
 * driver and no per-OS permission: the capture below reads a pedal press the
 * same way it reads a keystroke, and `lib/bindings.ts` turns it into an
 * accelerator. Binding it in the **global** column is what makes it work while
 * the operator's hands are on a camera and the prompter is behind OBS.
 *
 * (A remote that speaks raw HID and sends no key events at all is out of scope
 * and honestly out: it would mean a native HID dependency, a udev rule on
 * Linux and an Input Monitoring grant on macOS. `Live-To-Do-List.md` carries
 * the drill that says which kind you have.)
 *
 * # The capture listens in the CAPTURE phase, deliberately
 *
 * A bound key must not also *run* while it is being bound, and Escape has to
 * cancel the capture rather than close the dialog. Both fall out of registering
 * on `document` with `capture: true`: it runs before every bubble-phase
 * listener — the app's dispatcher and `ModalShell`'s own Esc handler included —
 * so `stopPropagation` there is enough. Ordering two bubble listeners by who
 * registered first would have been the fragile way to get the same result.
 */
export function Shortcuts({
  open,
  bindings,
  onSave,
  onClose,
}: {
  open: boolean;
  /** The operator's stored overrides. Sparse — see `resolveBindings`. */
  bindings: Bindings;
  /** Persist a new override table. Resolves once the write has landed — the
   * registration failures below are produced by it. */
  onSave: (next: Record<string, StoredBinding>) => Promise<void>;
  onClose: () => void;
}) {
  const t = useT();
  // ⚠️ The RESOLVED table is the state, not the sparse stored one. Holding the
  // sparse form meant every mutation had to read a derived dense copy and write
  // back a sparse one — two 12-line "rebuild both scopes" blocks that differed
  // only in which scope they touched, and a capture effect that re-registered
  // its document listener whenever the derived copy changed. Dense throughout
  // is also exactly the shape `onSave` wants.
  const [draft, setDraft] = useState<Record<CommandId, Binding>>(() => resolveBindings(bindings));
  const [query, setQuery] = useState("");
  const [learning, setLearning] = useState<{ command: CommandId; scope: Scope } | null>(null);
  const [status, setStatus] = useState<HotkeyStatus | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Re-seed the draft each time the dialog opens, so cancelling really does
  // discard — the same draft/apply shape Settings uses.
  //
  // Adjusted during render on the open transition rather than in an effect.
  // React re-runs this component before touching the DOM, so there is no extra
  // paint, and the alternative — setting state in an effect body — is a
  // cascading render the lint rules reject on sight.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setDraft(resolveBindings(bindings));
      setQuery("");
      setLearning(null);
      setSaveError(null);
    }
  }

  // What the OS actually accepted last time bindings were applied. A refusal
  // belongs against the row that caused it, not in a log nobody reads.
  useEffect(() => {
    if (!open) return;
    shortcutsStatus()
      .then(setStatus)
      .catch(() => setStatus(null));
  }, [open]);

  const windowClashes = useMemo(() => conflicts(draft, "window"), [draft]);
  const globalClashes = useMemo(() => conflicts(draft, "global"), [draft]);

  /** Put `accel` (or nothing) on one cell. The only writer. */
  const bind = (command: CommandId, scope: Scope, accel: Accelerator | null) =>
    setDraft((previous) => ({ ...previous, [command]: { ...previous[command], [scope]: accel } }));

  // The capture. See the class docs for why this is a capture-phase listener.
  useLayoutEffect(() => {
    if (!learning) return;
    const onKey = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
      // Escape leaves the cell as it was. It is the one key that cannot be
      // bound here, which is a fair trade for always having a way out.
      if (event.code === "Escape") {
        setLearning(null);
        return;
      }
      const accel = acceleratorFor(event);
      // A modifier on its own is not a binding, and neither is a key the OS
      // registration could not take — in both cases keep listening rather than
      // storing something that would not work.
      if (!accel) return;
      bind(learning.command, learning.scope, accel);
      setLearning(null);
    };
    // ⚠️ A pointer press anywhere disarms the capture.
    //
    // Escape and a successful capture were the only two ways out, so clicking
    // away from an armed cell left this listener live: the next keystroke —
    // typing in the search box, tabbing towards Apply, pressing Space on a
    // focused button — was swallowed and silently written into a cell the
    // operator had stopped looking at. `Back to the top` became `P` because
    // they typed "play" into the search field.
    //
    // `pointerdown` in the capture phase, so it lands before the click can
    // focus anything, and the keystroke that follows belongs to whatever was
    // clicked.
    const onPointerDown = () => setLearning(null);
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [learning]);

  /**
   * Save, then read back what the OS actually took.
   *
   * ⚠️ Closing on Apply is conditional, and that is the point. Rust re-registers
   * the global hotkeys **inside** the save, so the failures this dialog exists
   * to show are produced by the very act that used to dismiss it — "another
   * program is using this key" was recorded with nobody left to read it, and
   * the operator found out on a shoot. So: if everything registered, close and
   * get out of the way; if the OS refused something, stay open with the reason
   * against the row that caused it.
   */
  const apply = async () => {
    setSaveError(null);
    try {
      await onSave(draft);
    } catch (err) {
      // The write itself failed — a read-only or full settings volume. Say so
      // and stay open; closing here told the operator their pedal was bound
      // when nothing had been stored.
      setSaveError(String(err));
      return;
    }
    const next = await shortcutsStatus().catch(() => null);
    setStatus(next);
    if (!next || Object.keys(next.failed).length === 0) onClose();
  };

  const rows = COMMANDS.filter((spec) => {
    const needle = query.trim().toLowerCase();
    if (needle === "") return true;
    // Searchable by what the command is called AND by what it is bound to, so
    // "what is F13?" is answerable from the same box.
    const binding = draft[spec.id];
    const haystack = [
      t(spec.label),
      binding.window ? formatAccelerator(binding.window) : "",
      binding.global ? formatAccelerator(binding.global) : "",
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(needle);
  });

  /** One binding cell: what it is now, and the two ways to change it. */
  const cell = (spec: CommandSpec, scope: Scope) => {
    const command = spec.id;
    const accel = draft[command][scope];
    const isLearning = learning?.command === command && learning.scope === scope;
    const clash = (scope === "window" ? windowClashes : globalClashes)[command];
    const failure = scope === "global" ? status?.failed[command] : undefined;
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1">
          <button
            type="button"
            className={`${BUTTON} min-w-[7.5rem] font-mono`}
            data-testid={`bind-${command}-${scope}`}
            aria-label={t(isLearning ? "shortcuts-listening" : "shortcuts-rebind", {
              command: t(spec.label),
            })}
            onClick={() => setLearning({ command, scope })}
          >
            {isLearning ? t("shortcuts-listening-short") : accel ? formatAccelerator(accel) : "—"}
          </button>
          <button
            type="button"
            className={`${BUTTON} px-2`}
            data-testid={`clear-${command}-${scope}`}
            disabled={!accel}
            aria-label={t("shortcuts-clear", { command: t(spec.label) })}
            onClick={() => bind(command, scope, null)}
          >
            ×
          </button>
        </div>
        {clash && (
          <span
            role="alert"
            data-testid={`clash-${command}-${scope}`}
            className="text-[10px] text-amber-300"
          >
            {t("shortcuts-conflict", {
              others: clash.map((id) => t(commandSpec(id)?.label ?? id)).join(", "),
            })}
          </span>
        )}
        {failure && (
          <span
            role="alert"
            data-testid={`hotkey-failed-${command}`}
            className="text-[10px] text-red-300"
          >
            {t("shortcuts-not-registered", { reason: failure })}
          </span>
        )}
      </div>
    );
  };

  return (
    <ModalShell open={open} onClose={onClose} labelledBy="shortcuts-title">
      <div data-testid="shortcuts" className={`w-[46rem] ${DIALOG_BODY}`}>
        <h2 id="shortcuts-title" className={DIALOG_TITLE}>
          {t("shortcuts-title")}
        </h2>
        <p className="text-havoc-muted m-0 text-[11px]">{t("shortcuts-intro")}</p>

        <input
          className={FIELD}
          data-testid="shortcuts-search"
          value={query}
          placeholder={t("shortcuts-search")}
          aria-label={t("shortcuts-search")}
          onChange={(event) => setQuery(event.target.value)}
        />

        <div className="max-h-[22rem] overflow-y-auto">
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="text-havoc-muted text-left">
                <th className="py-1 font-normal">{t("shortcuts-command")}</th>
                <th className="py-1 font-normal">{t("shortcuts-in-app")}</th>
                <th className="py-1 font-normal">{t("shortcuts-global")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((spec) => (
                <tr key={spec.id} data-testid={`shortcut-row-${spec.id}`}>
                  <td className="py-1 pr-3 align-top">{t(spec.label)}</td>
                  <td className="py-1 pr-3 align-top">{cell(spec, "window")}</td>
                  <td className="py-1 align-top">
                    {spec.globalCapable ? (
                      cell(spec, "global")
                    ) : (
                      // Not an empty cell: a blank would read as "nobody has
                      // set one yet" rather than "this one cannot have one".
                      <span className="text-havoc-muted">{t("shortcuts-window-only")}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <p className="text-havoc-muted m-0 py-2 text-[11px]">{t("shortcuts-no-matches")}</p>
          )}
        </div>

        {/* The honest per-OS note the roadmap asks for. Shown only where it is
            true, because a warning that is always on screen is one nobody
            reads by the time it matters. */}
        {status?.wayland && (
          <p data-testid="shortcuts-wayland" className="text-havoc-muted m-0 text-[11px]">
            {t("shortcuts-wayland")}
          </p>
        )}

        {/* The write itself failed, as opposed to the OS refusing one key.
            Reuses `editor-save-failed` ("Could not save: { $error }") rather
            than adding a 31st key saying the identical sentence in 18
            languages — the string is not editor-specific, only its name is. */}
        {saveError && (
          <p role="alert" data-testid="shortcuts-save-failed" className={ERROR_LINE}>
            {t("editor-save-failed", { error: saveError })}
          </p>
        )}

        <div className={DIALOG_FOOTER}>
          <button
            type="button"
            className={BUTTON}
            data-testid="shortcuts-reset"
            onClick={() => setDraft(resolveBindings(null))}
          >
            {t("shortcuts-reset")}
          </button>
          <div className="flex-1" />
          <button type="button" className={BUTTON} onClick={onClose}>
            {t("shortcuts-cancel")}
          </button>
          <button
            type="button"
            className={PRIMARY}
            data-testid="shortcuts-apply"
            onClick={() => void apply()}
          >
            {t("shortcuts-apply")}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
