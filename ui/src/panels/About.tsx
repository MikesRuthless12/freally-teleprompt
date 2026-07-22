import { useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";

import { openUrl } from "../api/commands";
import { ModalShell } from "../components/ModalShell";
import { BUTTON, DIALOG_BODY, DIALOG_FOOTER, DIALOG_TITLE } from "../components/styles";
import { useT } from "../i18n/t";

const REPO = "https://github.com/MikesRuthless12/freally-teleprompt";
const SITE = "https://mikesruthless12.github.io/freally-teleprompt/";

/**
 * About — what this is, which version, and where it came from.
 *
 * The version is read from the running app rather than hard-coded, so it cannot
 * drift from `tauri.conf.json` the way a duplicated string would. Links go
 * through Rust's `open_url`, which allowlists `https:` — the webview never
 * follows a link out to the browser by itself.
 */
export function AboutDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    getVersion()
      .then(setVersion)
      .catch(() => setVersion(null));
  }, [open]);

  const link = (url: string) => () => void openUrl(url).catch(() => undefined);

  return (
    <ModalShell open={open} onClose={onClose} labelledBy="about-title">
      <div data-testid="about-dialog" className={`w-[24rem] ${DIALOG_BODY}`}>
        <div className="flex flex-col">
          <h2 id="about-title" className={DIALOG_TITLE}>
            {t("app-name")}
          </h2>
          <span className="text-havoc-muted font-mono text-[11px]">
            {version ? t("about-version", { version }) : "—"}
          </span>
        </div>

        <p className="text-havoc-muted m-0 text-[11px] leading-relaxed">{t("about-tagline")}</p>
        <p className="text-havoc-muted m-0 text-[11px] leading-relaxed">{t("about-privacy")}</p>
        <p className="text-havoc-muted m-0 text-[10px]">{t("about-copyright")}</p>

        <div className={DIALOG_FOOTER}>
          <button type="button" className={BUTTON} onClick={link(SITE)}>
            {t("about-website")}
          </button>
          <button type="button" className={BUTTON} onClick={link(REPO)}>
            {t("about-source")}
          </button>
          <button type="button" className={BUTTON} onClick={onClose}>
            {t("about-close")}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
