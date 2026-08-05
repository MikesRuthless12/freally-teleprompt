import { useEffect, useRef, useState } from "react";
import { open as pickFile } from "@tauri-apps/plugin-dialog";

import {
  importDocument,
  scriptsCreate,
  scriptsDelete,
  scriptsOpen,
  scriptsSave,
} from "../api/commands";
import type { ImportResult } from "../api/types";
import { ModalShell } from "../components/ModalShell";
import {
  BUTTON,
  DIALOG_BODY,
  DIALOG_FOOTER,
  DIALOG_TITLE,
  ERROR_LINE,
  FIELD,
  PRIMARY,
  READONLY_FIELD,
} from "../components/styles";
import { useT } from "../i18n/t";

/** The extensions the picker offers. Mirrors `import.rs`'s `format_of` — a
 * filter that offered a format the parser does not know would be a file chooser
 * that leads to an error message. */
const EXTENSIONS = ["docx", "rtf", "pdf", "txt", "md", "markdown", "mdown", "mkd"];

/** How much of the imported text to show back. Long enough to recognise the
 * script, short enough that the dialog does not become a second editor. */
const PREVIEW_CHARS = 800;

/**
 * Document import (FT-M01) — open a `.docx`, `.rtf`, `.pdf`, `.txt` or
 * Markdown file and get clean prompter text.
 *
 * # Nothing is saved until the operator says so
 *
 * The import runs, the report is shown, and only then does a file appear in the
 * library. An import that wrote first and asked afterwards would be a way to
 * fill somebody's script folder by mis-clicking a file chooser — and the whole
 * reason the report exists is that the operator should decide whether what
 * survived is worth keeping.
 *
 * # The report is the feature, not a courtesy
 *
 * Every one of these formats carries things a prompter cannot: pictures,
 * footnotes, comments, running heads, hyperlink targets. A converter that
 * dropped them quietly would be discovered on a shoot, by the person reading
 * the script, when a line they expected is not there. So `import.rs` counts
 * them and this shows the count.
 */
export function ImportDocument({
  open,
  onClose,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  /** A script was created and opened — the shell adopts it as current. */
  onImported: (name: string) => void;
}) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  /**
   * Which import request is the live one.
   *
   * ⚠️ An import can take up to ninety seconds, and the dialog can be closed,
   * reopened and pointed at a different file long before it lands. Without this
   * the first document's promise resolved into the second document's dialog and
   * silently swapped the report, the preview AND the name field — so pressing
   * Import saved a script the operator had not chosen, under a name that had
   * changed under their hand. Bumped on every new request and whenever the
   * dialog opens or closes; a stale result is dropped on the floor.
   */
  const request = useRef(0);

  // Reset on every OPEN transition, derived during render — the same pattern
  // every other dialog here uses rather than an effect that only calls
  // setState.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setResult(null);
      setName("");
      setError(null);
      setBusy(false);
    }
  }

  // ⚠️ The token is invalidated HERE and not in the block above, because eslint
  // forbids writing a ref during render — a render can be discarded, and this
  // write must not be. An effect on `open` is the same moment for our purposes:
  // an in-flight promise cannot resolve before the effects of the render that
  // closed the dialog have run.
  useEffect(() => {
    request.current += 1;
  }, [open]);

  const choose = () => {
    setError(null);
    void pickFile({
      multiple: false,
      directory: false,
      filters: [{ name: t("import-filter"), extensions: EXTENSIONS }],
    })
      .then((picked) => {
        // Cancelled: null on every platform. Not an error, and not a state
        // change — the dialog stays exactly as the operator left it.
        if (typeof picked !== "string") return;
        const token = (request.current += 1);
        const live = () => request.current === token;
        setBusy(true);
        setResult(null);
        return importDocument(picked)
          .then((imported) => {
            if (!live()) return;
            setBusy(false);
            setResult(imported);
            setName(imported.suggestedName);
          })
          .catch((err) => {
            if (!live()) return;
            setBusy(false);
            setError(String(err));
          });
      })
      .catch((err) => {
        setBusy(false);
        setError(String(err));
      });
  };

  const confirm = () => {
    const trimmed = name.trim();
    if (!result || !trimmed) return;
    setBusy(true);
    setError(null);
    // Create, write, open — in that order, and through the library's own
    // commands rather than a fourth way of putting a file on disk. `create`
    // refuses to overwrite, so an import can never silently replace yesterday's
    // take with a document that happened to share its name.
    //
    // ⚠️ And it is UNDONE if the write fails. `create` succeeding then `save`
    // failing — a read-only folder, a full disk, a file a sync client has
    // locked — used to leave an empty script sitting in the library under the
    // operator's chosen name, so pressing Import again failed at the first step
    // with "a script called X already exists". The import could not be
    // completed under the name they wanted without deleting the stub by hand.
    // The rollback is best-effort and never masks the real error: whatever went
    // wrong with the save is what gets shown.
    scriptsCreate(trimmed)
      .then(() =>
        // ⚠️ The rollback covers the WRITE only, and the `.catch` is attached
        // before the open for exactly that reason. Chained after it, a failure
        // to OPEN a script whose contents had been written perfectly well —
        // a sync client holding the file for a moment is enough — deleted the
        // import that had just succeeded, and the operator had to run the whole
        // thing again. Nothing that happens after the bytes are safely on disk
        // may remove them.
        scriptsSave(trimmed, result.text)
          .catch((err) =>
            scriptsDelete(trimmed)
              .catch(() => undefined)
              .then(() => {
                throw err;
              }),
          )
          .then(() => scriptsOpen(trimmed)),
      )
      .then(() => {
        setBusy(false);
        onImported(trimmed);
        onClose();
      })
      .catch((err) => {
        setBusy(false);
        setError(String(err));
      });
  };

  const report = result?.report;
  const preview = result ? result.text.slice(0, PREVIEW_CHARS) : "";

  return (
    <ModalShell open={open} onClose={onClose} labelledBy="import-title">
      <div data-testid="import-document" className={`w-[36rem] ${DIALOG_BODY}`}>
        <h2 id="import-title" className={DIALOG_TITLE}>
          {t("import-title")}
        </h2>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className={BUTTON}
            data-testid="import-choose"
            disabled={busy}
            onClick={choose}
          >
            {t("import-choose")}
          </button>
          <span className="text-havoc-muted text-[11px]">
            {busy && !result ? t("import-reading") : t("import-hint")}
          </span>
        </div>

        {report && (
          <div data-testid="import-report" className="flex flex-col gap-2 text-[11px]">
            <p className="m-0">
              {t("import-summary", {
                format: t(`import-format-${report.format}`),
                chars: report.chars,
                paragraphs: report.paragraphs,
              })}
            </p>

            {/* Always said, and never counted: there is no document of these
                five formats whose bold, fonts and colours survive becoming
                prompter text, so a count would only ever be "all of it". */}
            <p className="text-havoc-muted m-0">{t("import-flattened")}</p>

            {report.truncated && (
              <p role="alert" className={ERROR_LINE}>
                {t("import-truncated")}
              </p>
            )}

            {/* ⚠️ "Nothing else was left behind" is only sayable where the
                parser walked a document model and found nothing. A PDF has no
                such model — an empty list there means "could not tell", and
                saying otherwise was a false reassurance on the format most
                likely to be carrying figures and footnotes. */}
            {!report.itemised ? (
              <p className="text-havoc-muted m-0">{t("import-not-itemised")}</p>
            ) : report.dropped.length === 0 ? (
              <p className="text-havoc-muted m-0">{t("import-nothing-dropped")}</p>
            ) : (
              <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
                {report.dropped.map((item) => (
                  <li key={item.kind} className="text-havoc-muted">
                    {t(`import-drop-${item.kind}`, { count: item.count })}
                  </li>
                ))}
              </ul>
            )}

            <textarea
              className={`${READONLY_FIELD} h-40`}
              data-testid="import-preview"
              readOnly
              value={preview}
              aria-label={t("import-preview")}
            />

            <label className="flex items-center gap-2">
              <span className="shrink-0">{t("import-name")}</span>
              <input
                className={FIELD}
                data-testid="import-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") confirm();
                }}
              />
            </label>
          </div>
        )}

        {error && (
          <p role="alert" className={ERROR_LINE}>
            {error}
          </p>
        )}

        <div className={DIALOG_FOOTER}>
          <button type="button" className={BUTTON} data-testid="import-cancel" onClick={onClose}>
            {t("import-cancel")}
          </button>
          <button
            type="button"
            className={PRIMARY}
            data-testid="import-confirm"
            disabled={busy || !result || !name.trim()}
            onClick={confirm}
          >
            {t("import-confirm")}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
