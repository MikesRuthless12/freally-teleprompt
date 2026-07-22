#!/usr/bin/env python3
"""Generate the Freally Teleprompt icon sets from the one source artwork (FT-01).

    python scripts/make-icons.py

Source: ``images/freally_app_icon.png`` (1254x1254 RGBA) — the marketing icon,
which bakes the words "FREALLY TELEPROMPT" into the artwork. ``images/`` is
gitignored, so a clean clone falls back to the byte-identical
``docs/freally-icon.png`` the site ships.

One artwork, every size
-----------------------
Every icon is the **full artwork**, scaled. Earlier versions substituted a
cropped, glyph-only "F" at 48px and below, because the wordmark baked into the
artwork only becomes readable at about 64px and turns to grey mush under it.
That was reverted deliberately (Mike, 2026-07-21): one recognisable mark
everywhere beats a legible-but-different one in the taskbar, and a small icon is
identified by its silhouette and colour, not by reading it.

The tradeoff is real and accepted: at 16-48px the "FREALLY TELEPROMPT" wordmark
is not legible. If that ever needs revisiting, restore the crop by reinstating
``GLYPH_BOX``/``GLYPH_MAX`` and the ``glyph`` argument threaded through
``render``.

Outputs
-------
``docs/``       the website favicon set (favicon.ico + 32/48/96/192 PNG +
                apple-touch-icon.png)
``src-tauri/icons/``  the Tauri desktop set (PNGs + icon.ico + the Windows
                Store Square*Logo tiles). ``icon.icns`` for macOS is NOT written
                here — run ``npm run tauri icon`` for that.

Re-run this whenever the source artwork changes. It only writes files, never
deletes, and is safe to run repeatedly.
"""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
# `images/` is gitignored (planning assets), so a clean clone falls back to the
# byte-identical copy the docs site ships — the script stays reproducible there.
SOURCES = (ROOT / "images" / "freally_app_icon.png", ROOT / "docs" / "freally-icon.png")

def source_path() -> Path:
    for path in SOURCES:
        if path.exists():
            return path
    raise SystemExit("missing source artwork: tried " + ", ".join(str(p) for p in SOURCES))


def load(path: Path) -> Image.Image:
    """The source artwork."""
    return Image.open(path).convert("RGBA")


def render(full: Image.Image, size: int) -> Image.Image:
    """The artwork resampled to size x size."""
    return full.resize((size, size), Image.LANCZOS)


def write_png(full: Image.Image, path: Path, size: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    render(full, size).save(path, "PNG")
    print(f"  {path.relative_to(ROOT)}  ({size}px)")


def write_ico(full: Image.Image, path: Path, sizes: list[int]) -> None:
    """A multi-resolution .ico, every layer the same artwork at its own size."""
    path.parent.mkdir(parents=True, exist_ok=True)
    # Pillow drops any requested size LARGER than the image it saves from, so the
    # base must be the biggest layer; `append_images` supplies the rest, each
    # resampled at its own size rather than left to the viewer to scale.
    ordered = sorted(sizes, reverse=True)
    layers = [render(full, s) for s in ordered]
    layers[0].save(path, "ICO", sizes=[(s, s) for s in ordered], append_images=layers[1:])
    print(f"  {path.relative_to(ROOT)}  ({', '.join(f'{s}px' for s in sizes)})")


def main() -> None:
    path = source_path()
    print(f"source: {path.relative_to(ROOT)}")
    full = load(path)

    print("docs/ — website favicons")
    docs = ROOT / "docs"
    write_ico(full, docs / "favicon.ico", [16, 24, 32, 48])
    write_png(full, docs / "favicon-32.png", 32)
    write_png(full, docs / "favicon-48.png", 48)
    write_png(full, docs / "favicon-96.png", 96)
    write_png(full, docs / "favicon-192.png", 192)
    write_png(full, docs / "apple-touch-icon.png", 180)
    # The site's hero/logo image — always the full artwork.
    full.save(docs / "freally-icon.png", "PNG")
    print(f"  {(docs / 'freally-icon.png').relative_to(ROOT)}  (full artwork)")

    print("src-tauri/icons/ — desktop app")
    icons = ROOT / "src-tauri" / "icons"
    write_png(full, icons / "32x32.png", 32)
    write_png(full, icons / "64x64.png", 64)
    write_png(full, icons / "128x128.png", 128)
    write_png(full, icons / "128x128@2x.png", 256)
    write_png(full, icons / "icon.png", 512)
    write_ico(full, icons / "icon.ico", [16, 24, 32, 48, 64, 128, 256])
    # Windows Store tiles (the sizes Tauri's bundler expects).
    for name, size in [
        ("Square30x30Logo", 30),
        ("Square44x44Logo", 44),
        ("Square71x71Logo", 71),
        ("Square89x89Logo", 89),
        ("Square107x107Logo", 107),
        ("Square142x142Logo", 142),
        ("Square150x150Logo", 150),
        ("Square284x284Logo", 284),
        ("Square310x310Logo", 310),
        ("StoreLogo", 50),
    ]:
        write_png(full, icons / f"{name}.png", size)

    print("\nDone. icon.icns (macOS) is not written here — run `npm run tauri icon`.")


if __name__ == "__main__":
    main()
