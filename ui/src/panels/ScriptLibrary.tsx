import { useCallback, useEffect, useState } from "react";

import {
  scriptsCreate,
  scriptsDelete,
  scriptsList,
  scriptsOpen,
  scriptsRename,
} from "../api/commands";
import type { ScriptInfo } from "../api/types";
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

/** One row's inline mode — renaming or confirming a delete, never both. */
type RowMode = { kind: "rename"; name: string; draft: string } | { kind: "delete"; name: string };

/**
 * The script library (FT-10): create, open, rename and delete `.ftscript` files.
 *
 * Every operation is a single Rust command that owns both the file and the
 * recent list, so the two cannot drift apart. This dialog re-lists after each
 * one rather than patching its own copy — a listing is cheap, and a local copy
 * that quietly diverges from the folder is exactly the bug a file manager must
 * not have.
 *
 * Delete asks first, inline. A modal confirm on top of a modal would be the
 * app's only stacked dialog, and "are you sure" is not worth that.
 */
export function ScriptLibrary({
  open,
  currentName,
  onClose,
  onOpened,
  onRenamed,
  onDeleted,
}: {
  open: boolean;
  /** The script currently loaded, so the list can mark it. */
  currentName: string | null;
  onClose: () => void;
  /** A script was opened. Only the name is reported: Rust has already loaded the
   * text into the shared engine and broadcast it, so the shell reads the script
   * from that state like every other surface rather than from a second copy. */
  onOpened: (name: string) => void;
  onRenamed: (from: string, to: string) => void;
  onDeleted: (name: string) => void;
}) {
  const t = useT();
  const [scripts, setScripts] = useState<ScriptInfo[]>([]);
  const [newName, setNewName] = useState("");
  const [mode, setMode] = useState<RowMode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => {
    scriptsList()
      .then(setScripts)
      .catch((err) => setError(String(err)));
  }, []);

  // Reset the dialog's own scratch state on every OPEN transition, derived
  // during render rather than in an effect — the same pattern `SettingsDialog`
  // uses, and for the same reason: a setState in an effect body is a second
  // render pass for something that is a pure function of "did `open` flip?".
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setError(null);
      setMode(null);
      setNewName("");
    }
  }

  // Re-list on every opening, not just the first: the folder is a real folder
  // and may have changed since the dialog was last closed.
  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  /** Run one library operation, surfacing its error instead of swallowing it. */
  const run = (work: Promise<unknown>, after?: () => void) => {
    setBusy(true);
    setError(null);
    work
      .then(() => {
        setBusy(false);
        setMode(null);
        after?.();
        refresh();
      })
      .catch((err) => {
        setBusy(false);
        setError(String(err));
      });
  };

  const create = () => {
    const name = newName.trim();
    if (!name) return;
    // Creating also opens: making a script you then have to find in the list is
    // one step too many, and Rust already marks it as current.
    run(
      scriptsCreate(name).then(() => scriptsOpen(name)),
      () => {
        onOpened(name);
        setNewName("");
      },
    );
  };

  const openScript = (name: string) => {
    setBusy(true);
    setError(null);
    scriptsOpen(name)
      .then(() => {
        setBusy(false);
        onOpened(name);
        onClose();
      })
      .catch((err) => {
        setBusy(false);
        setError(String(err));
      });
  };

  const fmtDate = (ms: number) => (ms > 0 ? new Date(ms).toLocaleString() : "—");

  return (
    <ModalShell open={open} onClose={onClose} labelledBy="library-title">
      <div data-testid="script-library" className={`w-[34rem] ${DIALOG_BODY}`}>
        <h2 id="library-title" className={DIALOG_TITLE}>
          {t("library-title")}
        </h2>

        <div className="flex gap-2">
          <input
            className={FIELD}
            value={newName}
            placeholder={t("library-new-placeholder")}
            aria-label={t("library-new-placeholder")}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") create();
            }}
          />
          <button
            type="button"
            className={PRIMARY}
            onClick={create}
            disabled={busy || !newName.trim()}
          >
            {t("library-new")}
          </button>
        </div>

        <div className="flex max-h-80 min-h-0 flex-col gap-1 overflow-auto">
          {scripts.length === 0 && (
            <p className="text-havoc-muted m-0 py-4 text-center text-[11px]">
              {t("library-empty")}
            </p>
          )}
          {scripts.map((script) => {
            const renaming = mode?.kind === "rename" && mode.name === script.name;
            const deleting = mode?.kind === "delete" && mode.name === script.name;
            return (
              <div
                key={script.name}
                className="flex items-center gap-2 rounded-md border border-white/10 px-2 py-1.5"
              >
                {renaming ? (
                  <>
                    <input
                      className={FIELD}
                      value={mode.draft}
                      aria-label={t("library-rename")}
                      autoFocus
                      onChange={(e) => setMode({ ...mode, draft: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const to = mode.draft.trim();
                          if (to && to !== script.name) {
                            run(scriptsRename(script.name, to), () => onRenamed(script.name, to));
                          } else {
                            setMode(null);
                          }
                        }
                        if (e.key === "Escape") setMode(null);
                      }}
                    />
                    <button
                      type="button"
                      className={BUTTON}
                      disabled={busy}
                      onClick={() => {
                        const to = mode.draft.trim();
                        if (!to || to === script.name) {
                          setMode(null);
                          return;
                        }
                        run(scriptsRename(script.name, to), () => onRenamed(script.name, to));
                      }}
                    >
                      {t("library-save-name")}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-xs">
                        {script.name}
                        {script.name === currentName && (
                          <span className="text-havoc-accent ml-2 text-[10px]">
                            {t("library-current")}
                          </span>
                        )}
                      </span>
                      <span className="text-havoc-muted text-[10px]">
                        {fmtDate(script.modifiedMs)}
                      </span>
                    </div>
                    {deleting ? (
                      <>
                        <span className="text-[11px]">{t("library-delete-confirm")}</span>
                        <button
                          type="button"
                          className={BUTTON}
                          disabled={busy}
                          onClick={() =>
                            run(scriptsDelete(script.name), () => onDeleted(script.name))
                          }
                        >
                          {t("library-delete-yes")}
                        </button>
                        <button type="button" className={BUTTON} onClick={() => setMode(null)}>
                          {t("library-delete-no")}
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className={BUTTON}
                          disabled={busy}
                          onClick={() => openScript(script.name)}
                        >
                          {t("library-open")}
                        </button>
                        <button
                          type="button"
                          className={BUTTON}
                          onClick={() =>
                            setMode({ kind: "rename", name: script.name, draft: script.name })
                          }
                        >
                          {t("library-rename")}
                        </button>
                        <button
                          type="button"
                          className={BUTTON}
                          onClick={() => setMode({ kind: "delete", name: script.name })}
                        >
                          {t("library-delete")}
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>

        {error && (
          <p role="alert" className={ERROR_LINE}>
            {error}
          </p>
        )}

        <div className={DIALOG_FOOTER}>
          <button type="button" className={BUTTON} onClick={onClose}>
            {t("library-close")}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
