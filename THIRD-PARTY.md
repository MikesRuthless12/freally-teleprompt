# Third-party notices — Freally Teleprompt

Freally Teleprompt is proprietary and All Rights Reserved (see `LICENSE`). It
bundles the third-party components below, which keep their own licences.

**This file ships with the application.** The SIL Open Font License requires the
copyright notice and licence text to accompany every copy of the fonts, and a
file that only exists in the source repository would not satisfy that for a
user who installs a build. It is bundled as a resource in `tauri.conf.json`.

---

## Vosk — speech recognition (bundled only in dictation builds)

Dictation (FT-33) recognises speech **on the device**, with an engine and a
model that ship inside the installer. Both are third-party, and — this is the
part that is easy to get wrong — they are licensed **separately**. A permissive
engine does not make its weights permissive; several of the English models
published on the same page as the bundled one are AGPL or LGPL-3.0.

| Component | What it is | Version | Licence |
|---|---|---|---|
| `libvosk` + the `vosk` Rust crate | The recognition engine | libvosk 0.3.42 | Apache-2.0 |
| `vosk-model-small-en-us-0.15` | The English acoustic/language model | 0.15 | Apache-2.0 |
| `libstdc++-6.dll`, `libgcc_s_seh-1.dll`, `libwinpthread-1.dll` (Windows only) | The MinGW runtime the upstream `libvosk.dll` is built against | as shipped upstream | GPL-3.0 **WITH GCC-exception-3.1**, and MIT/BSD-2-Clause for winpthreads |

Apache-2.0 permits commercial use and redistribution with attribution and no
share-alike term. The GCC Runtime Library Exception is what permits shipping
those three DLLs beside software that is not GPL — **`NOTICE` carries the full
reasoning and the pointers to their corresponding source**, and is the file to
read before changing anything here.

Nothing in this section is downloaded at runtime: the model is in the installer
or the feature reports itself unavailable. A build without the `vosk` feature
ships none of it.

Sources: <https://github.com/alphacep/vosk-api> ·
<https://alphacephei.com/vosk/models>

---

## Document-import parsers (FT-M01, compiled into every build)

Opening a `.docx`, `.rtf`, `.pdf`, `.txt` or Markdown file and getting clean
prompter text needs readers for formats this project has no business
reimplementing. These are Rust crates linked into the application binary.

Every licence below was read **in the crate's own source tree**, not taken from
a summary or from a badge, and `cargo deny check licenses` enforces the same
allow-list on every build.

| Crate | What it reads | Version | Licence | Copyright |
|---|---|---|---|---|
| `pdf-extract` | PDF text extraction | 0.12.0 | MIT | Jeff Muizelaar |
| `lopdf` | The PDF object model underneath it | 0.42.0 | MIT | © 2016 Junfeng Liu |
| `zip` | The container a `.docx` is | 4.6.1 | MIT | © 2014 Mathijs van de Nes |
| `quick-xml` | `word/document.xml` inside it | 0.41.0 | MIT | © 2016 Johann Tuffe |
| `pulldown-cmark` | Markdown | 0.13.4 | MIT | © 2015 Google Inc. |

MIT permits commercial use and redistribution with attribution and carries no
share-alike term. `pdf-extract` ships no `LICENSE` file of its own; its
`Cargo.toml` declares MIT and its repository carries the text.

⚠️ `pdf-extract` pulls in `ttf-parser`, which its author has announced as
**unmaintained** (RUSTSEC-2026-0192). That is not a vulnerability and the
advisory itself states no safe upgrade exists; the reasoning for accepting it,
and what bounds the risk, are recorded in `deny.toml` beside the ignore.

**RTF has no crate here.** Its reader is written in `src-tauri/src/import.rs`,
because the part that matters is knowing which of RTF's groups are metadata —
a font table, a colour table, and a megabyte of hex-encoded picture data are all
"text" to a tokenizer that does not understand the format's group semantics.

Sources: <https://github.com/jrmuizel/pdf-extract> ·
<https://github.com/J-F-Liu/lopdf> · <https://github.com/zip-rs/zip2> ·
<https://github.com/tafia/quick-xml> ·
<https://github.com/pulldown-cmark/pulldown-cmark>

---

## Noto fonts (bundled)

The app ships in 18 languages and lets the user switch at runtime, so it bundles
Noto rather than depending on what each machine happens to have installed —
otherwise a reader who selects Arabic, Hindi, Japanese, Korean or Chinese on a
machine without those fonts sees tofu boxes instead of an interface.

These are the **variable** builds (one file per subset, weights 100–900), split
by `unicode-range`, so only the subsets a chosen language actually needs are
ever loaded.

| Package | Scripts covered | Version |
|---|---|---|
| `@fontsource-variable/noto-sans` | Latin, Greek, Cyrillic and Vietnamese | 5.3.0 |
| `@fontsource-variable/noto-sans-arabic` | Arabic | 5.3.0 |
| `@fontsource-variable/noto-sans-devanagari` | Devanagari (Hindi) | 5.3.0 |
| `@fontsource-variable/noto-sans-jp` | Japanese | 5.3.0 |
| `@fontsource-variable/noto-sans-kr` | Korean | 5.3.0 |
| `@fontsource-variable/noto-sans-sc` | Simplified Chinese | 5.3.0 |

Licence: **SIL Open Font License, Version 1.1** — a permissive licence that
explicitly allows the fonts to be *"bundled, redistributed and/or sold with any
software"*. It binds the font files only; it places no condition on Freally
Teleprompt's own licence. No Reserved Font Name is declared by these fonts.

### Copyright notices

- `noto-sans` — Copyright 2022 The Noto Project Authors (https://github.com/notofonts/latin-greek-cyrillic) NotoSans-Italic[wdth,wght].ttf: Copyright 2022 The Noto Project Authors (https://github.com/notofonts/latin-greek-cyrillic)
- `noto-sans-arabic` — Copyright 2022 The Noto Project Authors (https://github.com/notofonts/arabic)
- `noto-sans-devanagari` — Copyright 2022 The Noto Project Authors (https://github.com/notofonts/devanagari)
- `noto-sans-jp` — copyright statement(s).
- `noto-sans-kr` — copyright statement(s).
- `noto-sans-sc` — copyright statement(s).

### SIL Open Font License, Version 1.1

```
SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007
-----------------------------------------------------------

PREAMBLE
The goals of the Open Font License (OFL) are to stimulate worldwide
development of collaborative font projects, to support the font creation
efforts of academic and linguistic communities, and to provide a free and
open framework in which fonts may be shared and improved in partnership
with others.

The OFL allows the licensed fonts to be used, studied, modified and
redistributed freely as long as they are not sold by themselves. The
fonts, including any derivative works, can be bundled, embedded,
redistributed and/or sold with any software provided that any reserved
names are not used by derivative works. The fonts and derivatives,
however, cannot be released under any other type of license. The
requirement for fonts to remain under this license does not apply
to any document created using the fonts or their derivatives.

DEFINITIONS
"Font Software" refers to the set of files released by the Copyright
Holder(s) under this license and clearly marked as such. This may
include source files, build scripts and documentation.

"Reserved Font Name" refers to any names specified as such after the
copyright statement(s).

"Original Version" refers to the collection of Font Software components as
distributed by the Copyright Holder(s).

"Modified Version" refers to any derivative made by adding to, deleting,
or substituting -- in part or in whole -- any of the components of the
Original Version, by changing formats or by porting the Font Software to a
new environment.

"Author" refers to any designer, engineer, programmer, technical
writer or other person who contributed to the Font Software.

PERMISSION & CONDITIONS
Permission is hereby granted, free of charge, to any person obtaining
a copy of the Font Software, to use, study, copy, merge, embed, modify,
redistribute, and sell modified and unmodified copies of the Font
Software, subject to the following conditions:

1) Neither the Font Software nor any of its individual components,
in Original or Modified Versions, may be sold by itself.

2) Original or Modified Versions of the Font Software may be bundled,
redistributed and/or sold with any software, provided that each copy
contains the above copyright notice and this license. These can be
included either as stand-alone text files, human-readable headers or
in the appropriate machine-readable metadata fields within text or
binary files as long as those fields can be easily viewed by the user.

3) No Modified Version of the Font Software may use the Reserved Font
Name(s) unless explicit written permission is granted by the corresponding
Copyright Holder. This restriction only applies to the primary font name as
presented to the users.

4) The name(s) of the Copyright Holder(s) or the Author(s) of the Font
Software shall not be used to promote, endorse or advertise any
Modified Version, except to acknowledge the contribution(s) of the
Copyright Holder(s) and the Author(s) or with their explicit written
permission.

5) The Font Software, modified or unmodified, in part or in whole,
must be distributed entirely under this license, and must not be
distributed under any other license. The requirement for fonts to
remain under this license does not apply to any document created
using the Font Software.

TERMINATION
This license becomes null and void if any of the above conditions are
not met.

DISCLAIMER
THE FONT SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT
OF COPYRIGHT, PATENT, TRADEMARK, OR OTHER RIGHT. IN NO EVENT SHALL THE
COPYRIGHT HOLDER BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
INCLUDING ANY GENERAL, SPECIAL, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL
DAMAGES, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF THE USE OR INABILITY TO USE THE FONT SOFTWARE OR FROM
OTHER DEALINGS IN THE FONT SOFTWARE.
```
