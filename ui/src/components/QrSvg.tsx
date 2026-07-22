import { useMemo } from "react";
import qrcode from "qrcode-generator";

import { useT } from "../i18n/t";

/**
 * The LAN mirror's link as a QR code (FT-12).
 *
 * Drawn as a plain SVG `<path>` rather than injected markup — no `innerHTML`,
 * nothing for a CSP to have to allow. The encoder is a zero-dependency library
 * that runs entirely locally; no image service is contacted, which matters
 * because the payload contains the mirror's session key.
 *
 * Always shown **beside** the copyable URL, never instead of it: an over-long
 * payload makes the encoder throw, and a machine with no camera has no use for
 * a QR anyway.
 */
export function QrSvg({ link }: { link: string }) {
  const t = useT();
  const rendered = useMemo(() => {
    try {
      const qr = qrcode(0, "M"); // type 0 = auto-size for the payload
      qr.addData(link);
      qr.make();
      const count = qr.getModuleCount();
      let path = "";
      for (let row = 0; row < count; row += 1) {
        for (let col = 0; col < count; col += 1) {
          if (qr.isDark(row, col)) path += `M${col} ${row}h1v1h-1z`;
        }
      }
      return { count, path };
    } catch {
      return null; // an over-long payload — the copyable link still works
    }
  }, [link]);
  if (!rendered) return null;
  return (
    <svg
      viewBox={`0 0 ${rendered.count} ${rendered.count}`}
      role="img"
      aria-label={t("mirror-qr-aria")}
      // The light background is not a theme slip: a QR needs a light quiet zone
      // to scan, in both palettes.
      className="h-28 w-28 shrink-0 rounded bg-white p-1.5"
    >
      <path d={rendered.path} fill="#000" />
    </svg>
  );
}
