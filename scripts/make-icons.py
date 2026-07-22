#!/usr/bin/env python3
"""Generate the Freally Teleprompt icon sets from the one source artwork (FT-01).

    python scripts/make-icons.py

Source: ``images/freally_app_icon.png`` (1254x1254 RGBA) — the marketing icon,
which bakes the words "FREALLY TELEPROMPT" into the artwork. ``images/`` is
gitignored, so a clean clone falls back to the byte-identical
``docs/freally-icon.png`` the site ships.

Why two variants
----------------
That baked-in text is the whole problem. Rendered small it turns to grey mush:
"FREALLY" only becomes readable at **64px**, and below that the icon reads as a
smudge with no recognisable mark. So this script emits two variants and picks
between them by size:

* ``<= 48px`` — a **glyph-only** crop of the stylised "F" swoosh at the centre of
  the artwork (``GLYPH_BOX``). Legible all the way down to 16px.
* ``>= 64px`` — the **full** artwork, where the wordmark carries its own weight.

The 64px crossover was measured, not guessed: rendering both variants at
32/48/64/96 shows the wordmark illegible at 32 and 48 and readable at 64.

Outputs
-------
``docs/``       the website favicon set (favicon.ico + 32/48/96/192 PNG +
                apple-touch-icon.png)
``src-tauri/icons/``  the Tauri desktop set (PNGs + icon.ico + the Windows
                Store Square*Logo tiles). ``icon.icns`` for macOS is NOT written
                here — run ``npm run tauri icon`` for that, then re-run this
                script to restore the small-size glyph overrides.

Re-run this whenever the source artwork changes. It only writes files, never
deletes, and is safe to run repeatedly.
"""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
# `images/` is gitignored (planning assets), so a clean clone falls back to the
# byte-identical copy the docs site ships — the script stays reproducible there.
SOURCES = (ROOT / "images" / "freally_app_icon.png", ROOT / "docs" / "freally-icon.png")

# The stylised "F" swoosh at the centre of the artwork, in source pixels.
# Framed so the whole letterform sits inside with a little breathing room and
# the screen text behind it stays out of frame.
GLYPH_BOX = (640, 370, 880, 610)

# At or below this size the baked-in wordmark is unreadable, so use the glyph.
GLYPH_MAX = 48


def source_path() -> Path:
    for path in SOURCES:
        if path.exists():
            return path
    raise SystemExit("missing source artwork: tried " + ", ".join(str(p) for p in SOURCES))


def load(path: Path) -> tuple[Image.Image, Image.Image]:
    """The full artwork and the glyph-only crop."""
    full = Image.open(path).convert("RGBA")
    return full, full.crop(GLYPH_BOX)


def render(full: Image.Image, glyph: Image.Image, size: int) -> Image.Image:
    """The right variant for `size`, resampled to size x size."""
    source = glyph if size <= GLYPH_MAX else full
    return source.resize((size, size), Image.LANCZOS)


def write_png(full: Image.Image, glyph: Image.Image, path: Path, size: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    render(full, glyph, size).save(path, "PNG")
    print(f"  {path.relative_to(ROOT)}  ({size}px)")


def write_ico(full: Image.Image, glyph: Image.Image, path: Path, sizes: list[int]) -> None:
    """A multi-resolution .ico. Each layer picks its own variant by size, so
    Explorer's 16px list view gets the glyph and the 256px preview gets the
    artwork — from one file."""
    path.parent.mkdir(parents=True, exist_ok=True)
    # Pillow drops any requested size LARGER than the image it saves from, so the
    # base must be the biggest layer; `append_images` then supplies the distinct
    # per-size renders (which is what lets the small layers use the glyph).
    ordered = sorted(sizes, reverse=True)
    layers = [render(full, glyph, s) for s in ordered]
    layers[0].save(path, "ICO", sizes=[(s, s) for s in ordered], append_images=layers[1:])
    print(f"  {path.relative_to(ROOT)}  ({', '.join(f'{s}px' for s in sizes)})")


def main() -> None:
    path = source_path()
    print(f"source: {path.relative_to(ROOT)}")
    full, glyph = load(path)

    print("docs/ — website favicons")
    docs = ROOT / "docs"
    write_ico(full, glyph, docs / "favicon.ico", [16, 24, 32, 48])
    write_png(full, glyph, docs / "favicon-32.png", 32)
    write_png(full, glyph, docs / "favicon-48.png", 48)
    write_png(full, glyph, docs / "favicon-96.png", 96)
    write_png(full, glyph, docs / "favicon-192.png", 192)
    write_png(full, glyph, docs / "apple-touch-icon.png", 180)
    # The site's hero/logo image — always the full artwork.
    full.save(docs / "freally-icon.png", "PNG")
    print(f"  {(docs / 'freally-icon.png').relative_to(ROOT)}  (full artwork)")

    print("src-tauri/icons/ — desktop app")
    icons = ROOT / "src-tauri" / "icons"
    write_png(full, glyph, icons / "32x32.png", 32)
    write_png(full, glyph, icons / "64x64.png", 64)
    write_png(full, glyph, icons / "128x128.png", 128)
    write_png(full, glyph, icons / "128x128@2x.png", 256)
    write_png(full, glyph, icons / "icon.png", 512)
    write_ico(full, glyph, icons / "icon.ico", [16, 24, 32, 48, 64, 128, 256])
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
        write_png(full, glyph, icons / f"{name}.png", size)

    print("\nDone. icon.icns (macOS) is not written here — run `npm run tauri icon`,")
    print("then re-run this script to restore the small-size glyph overrides.")


if __name__ == "__main__":
    main()
