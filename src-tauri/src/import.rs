//! Document import (FT-M01) — getting a real script *in*.
//!
//! Until this existed, the only ways text reached the prompter were typing and
//! pasting. Every script a professional is handed arrives as a `.docx`, a
//! `.pdf`, an `.rtf`, or a plain `.txt`, so "open the file you were sent" is the
//! first thing anyone tries to do with a prompter.
//!
//! What comes out is deliberately **plain prompter text**: paragraphs kept, all
//! formatting flattened, typographic punctuation normalised, and an explicit
//! [`ImportReport`] naming what could not be carried across. Nothing is silently
//! lost — a script that quietly dropped its footnotes would be discovered on a
//! shoot.
//!
//! # ⚠️ Why every parser runs in a CHILD PROCESS
//!
//! Three of these five formats are parsed by third-party crates over a file the
//! app did not write, and the release profile is `panic = "abort"` (see the
//! workspace manifest — it is set deliberately, so the crash reporter's fatal
//! gate is real). Those two facts together mean **a panic anywhere in a document
//! parser would abort the running prompter**, and `catch_unwind` cannot help
//! because there is no unwinding to catch.
//!
//! So the parse never happens in the app's address space. [`import_document`]
//! re-launches this same executable with `--import <source> <destination>`;
//! [`run_import_child`] does the work and writes JSON to `<destination>`. A
//! malformed PDF can therefore kill a helper — which the parent reports as a
//! failed import — and cannot touch the operator's session. The child is also
//! how the work gets a **time limit**: a parser that never returns is killed.
//!
//! This is the same shape as the `--crash-notice` helper in `bugreport.rs`, and
//! for a related reason: some work must not be done inside the app.
//!
//! If a sixth format is added, its parser belongs **here**, behind the same
//! child. Calling one from a `#[tauri::command]` re-opens the hole.

use std::io::Read;
use std::path::{Path, PathBuf};
use std::time::{Duration, Instant};

use serde::{Deserialize, Serialize};

/// Longest document we will read off disk, in bytes. A prompter script is text;
/// a hundred megabytes of it is a mistake or an attack, and either way reading
/// it into memory first is the thing to refuse.
const MAX_FILE_BYTES: u64 = 64 * 1024 * 1024;

/// Longest `word/document.xml` we will inflate out of a `.docx`. A zip's
/// header size is the archive author's number, not a fact, so the guard has to
/// be on what comes OUT of the decompressor. See [`parse_docx`].
const MAX_DOCUMENT_XML_BYTES: u64 = 128 * 1024 * 1024;

/// Longest script the import may produce, in characters — the engine's own
/// `MAX_SCRIPT`. Imported text is truncated to it *here*, so the report can say
/// so, rather than being silently cut when it reaches the engine.
const MAX_IMPORT_CHARS: usize = 200_000;

/// How long the child gets before it is killed. Generous: a 400-page PDF is
/// genuinely slow to extract. Short enough that a parser stuck in a loop
/// produces an error the operator can act on rather than a spinner forever.
const CHILD_TIMEOUT: Duration = Duration::from_secs(90);

/// One thing the source document contained that the prompter text does not.
///
/// `kind` is a stable machine key, never a sentence: the UI owns the wording in
/// all 18 languages, and a message built in Rust would be English everywhere.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Dropped {
    /// One of: `images`, `footnotes`, `comments`, `headersFooters`,
    /// `linkTargets`, `objects`, `encoding`.
    pub kind: String,
    /// How many were found. `encoding` uses 1 — it is a fact, not a tally.
    pub count: usize,
}

/// What an import produced, beside the text itself.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportReport {
    /// `txt` · `markdown` · `docx` · `rtf` · `pdf` — also a machine key.
    pub format: String,
    /// Visible characters in the imported script (newlines excluded), so the
    /// number matches what the editor's own statistics will show.
    pub chars: usize,
    /// Paragraphs — blank-line-separated runs of text.
    pub paragraphs: usize,
    /// Everything that did not survive, most significant first. Empty is a
    /// meaningful answer and is shown as one.
    pub dropped: Vec<Dropped>,
    /// Whether the text was cut at [`MAX_IMPORT_CHARS`].
    pub truncated: bool,
}

/// The whole result of an import: clean text, and what it cost to get it.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportResult {
    pub text: String,
    pub report: ImportReport,
    /// A name suggested from the file's own stem, already legal as a script
    /// name (`scripts::is_valid_name`) — or empty when nothing usable could be
    /// made of it, in which case the UI asks for one.
    pub suggested_name: String,
}

/// What the child writes and the parent reads. An enum rather than two files:
/// there is exactly one artefact, and it always says which case it is.
#[derive(Debug, Serialize, Deserialize)]
enum ChildOutcome {
    Ok(ImportResult),
    Err(String),
}

// -- collecting the report ----------------------------------------------------

/// The tally a parser fills in as it walks a document.
#[derive(Debug, Default)]
struct Drops {
    images: usize,
    footnotes: usize,
    comments: usize,
    headers_footers: usize,
    link_targets: usize,
    objects: usize,
    /// The file was not UTF-8 and was decoded as Windows-1252.
    recoded: bool,
}

impl Drops {
    fn finish(&self) -> Vec<Dropped> {
        // Ordered by how much a reader would care, not alphabetically: the
        // encoding note first because it changes what every other line means.
        let rows = [
            ("encoding", usize::from(self.recoded)),
            ("images", self.images),
            ("footnotes", self.footnotes),
            ("comments", self.comments),
            ("headersFooters", self.headers_footers),
            ("linkTargets", self.link_targets),
            ("objects", self.objects),
        ];
        rows.iter()
            .filter(|(_, count)| *count > 0)
            .map(|(kind, count)| Dropped {
                kind: (*kind).to_string(),
                count: *count,
            })
            .collect()
    }
}

// -- normalisation ------------------------------------------------------------

/// Whether `ch` is a dash we rewrite to an ASCII hyphen.
fn is_typographic_dash(ch: char) -> bool {
    matches!(
        ch,
        '\u{2010}' // hyphen
            | '\u{2011}' // non-breaking hyphen
            | '\u{2012}' // figure dash
            | '\u{2013}' // en dash
            | '\u{2014}' // em dash
            | '\u{2015}' // horizontal bar
            | '\u{2212}' // minus sign
    )
}

/// The replacement for one source character, or `None` to drop it.
fn map_char(ch: char) -> Option<&'static str> {
    Some(match ch {
        // Quotes: a prompter renders in 18 languages across three font stacks,
        // and a curly quote in a face that lacks it is a tofu box on the glass.
        '\u{2018}' | '\u{2019}' | '\u{201a}' | '\u{201b}' | '\u{2032}' => "'",
        '\u{201c}' | '\u{201d}' | '\u{201e}' | '\u{201f}' | '\u{2033}' => "\"",
        '\u{2026}' => "...",
        // Every space that is not a space. A non-breaking space between two
        // words is invisible here and breaks nothing that matters on a scroll.
        '\u{00a0}' | '\u{2000}'..='\u{200a}' | '\u{202f}' | '\u{205f}' | '\u{3000}' => " ",
        '\t' => " ",
        // Line and paragraph separators, and the two ancient page breaks.
        '\u{2028}' | '\u{2029}' | '\u{000b}' | '\u{000c}' => "\n",
        // Invisible: a soft hyphen renders as a hyphen in some engines and
        // nothing in others, and a zero-width character is a visible character
        // to the scroll engine (it counts toward read time and offsets).
        '\u{00ad}' | '\u{200b}' | '\u{200c}' | '\u{200d}' | '\u{2060}' | '\u{feff}' => return None,
        '\n' => "\n",
        other if other.is_control() => return None,
        _ => return Some(""), // "keep verbatim" — handled by the caller
    })
}

/// Flatten a document's text into prompter text.
///
/// # ⚠️ Normalising a dash must never create a caesura
///
/// ` -- ` fenced by spaces is this app's **pause token**: the scroll stops there
/// for three quarters of a second. A document written with em dashes — like this
/// one — would therefore import as a script full of pauses nobody asked for, and
/// `— —` (two of them) is an ordinary thing to find in a typeset play.
///
/// So the rewrite is done in one pass that remembers whether the run of hyphens
/// currently at the end of the output contains a character we *mapped*: a run of
/// two or more that does is collapsed to a single hyphen. A run that was already
/// two hyphens in the source is left exactly as it was — a `.txt` written by
/// somebody who knows this app's own syntax still imports with its pauses
/// intact, which is the behaviour that would be lost by simply banning `--`.
fn normalise(raw: &str) -> String {
    // Line endings first, so the char loop below only ever sees `\n`.
    let unified = raw.replace("\r\n", "\n").replace('\r', "\n");

    let mut out = String::with_capacity(unified.len());
    // Byte index in `out` where the trailing run of ASCII hyphens starts, and
    // whether any character in that run came from `is_typographic_dash`.
    let mut run_at: Option<usize> = None;
    let mut run_mapped = false;

    // Collapse the pending hyphen run if it was (partly) our doing.
    let close_run = |out: &mut String, run_at: &mut Option<usize>, run_mapped: &mut bool| {
        if let Some(start) = *run_at {
            if *run_mapped && out.len() - start >= 2 {
                out.truncate(start + 1);
            }
        }
        *run_at = None;
        *run_mapped = false;
    };

    for ch in unified.chars() {
        if is_typographic_dash(ch) {
            if run_at.is_none() {
                run_at = Some(out.len());
            }
            run_mapped = true;
            out.push('-');
            continue;
        }
        if ch == '-' {
            if run_at.is_none() {
                run_at = Some(out.len());
            }
            out.push('-');
            continue;
        }
        close_run(&mut out, &mut run_at, &mut run_mapped);
        match map_char(ch) {
            None => {}
            Some("") => out.push(ch),
            Some(text) => out.push_str(text),
        }
    }
    close_run(&mut out, &mut run_at, &mut run_mapped);

    tidy_lines(&out)
}

/// Trailing spaces off every line, no more than one blank line in a row, and no
/// blank lines at either end.
///
/// The blank-line rule is not cosmetic: a blank line is what separates
/// paragraphs, and both the rehearsal report's section split and the marker
/// jump list read them. Six blank lines out of a PDF would otherwise be five
/// empty sections.
fn tidy_lines(text: &str) -> String {
    let mut out = String::with_capacity(text.len());
    let mut blank_run = 0usize;
    for line in text.split('\n') {
        let trimmed = line.trim_end_matches([' ', '\t']);
        if trimmed.is_empty() {
            blank_run += 1;
            continue;
        }
        if !out.is_empty() {
            out.push('\n');
            if blank_run > 0 {
                out.push('\n');
            }
        }
        blank_run = 0;
        out.push_str(trimmed);
    }
    out
}

/// Visible characters — newlines excluded, matching the scroll engine's unit.
fn visible_chars(text: &str) -> usize {
    text.chars().filter(|c| *c != '\n').count()
}

/// Blank-line-separated runs of text.
fn paragraph_count(text: &str) -> usize {
    text.split("\n\n").filter(|p| !p.trim().is_empty()).count()
}

// -- plain text and encodings -------------------------------------------------

/// The 0x80–0x9F window of Windows-1252, which is where it differs from
/// Latin-1. Everything outside this range maps to the same code point in both,
/// so this table is the whole difference.
const CP1252_HIGH: [char; 32] = [
    '\u{20ac}', '\u{fffd}', '\u{201a}', '\u{0192}', '\u{201e}', '\u{2026}', '\u{2020}', '\u{2021}',
    '\u{02c6}', '\u{2030}', '\u{0160}', '\u{2039}', '\u{0152}', '\u{fffd}', '\u{017d}', '\u{fffd}',
    '\u{fffd}', '\u{2018}', '\u{2019}', '\u{201c}', '\u{201d}', '\u{2022}', '\u{2013}', '\u{2014}',
    '\u{02dc}', '\u{2122}', '\u{0161}', '\u{203a}', '\u{0153}', '\u{fffd}', '\u{017e}', '\u{0178}',
];

/// One Windows-1252 byte as a character.
fn cp1252(byte: u8) -> char {
    match byte {
        0x80..=0x9f => CP1252_HIGH[(byte - 0x80) as usize],
        other => other as char,
    }
}

/// Decode a byte string that is *supposed* to be text.
///
/// UTF-8 and both UTF-16 byte orders are recognised by their BOM; a file with no
/// BOM is tried as UTF-8 first, because that is what everything writes now, and
/// falls back to Windows-1252 rather than to replacement characters. The
/// fallback is REPORTED (`encoding`), because a script silently read in the
/// wrong encoding is a script full of `Ã©` that nobody notices until the shoot.
fn decode_text(bytes: &[u8], drops: &mut Drops) -> String {
    if let Some(rest) = bytes.strip_prefix(&[0xef, 0xbb, 0xbf]) {
        return String::from_utf8_lossy(rest).into_owned();
    }
    if let Some(rest) = bytes.strip_prefix(&[0xff, 0xfe]) {
        return decode_utf16(rest, u16::from_le_bytes);
    }
    if let Some(rest) = bytes.strip_prefix(&[0xfe, 0xff]) {
        return decode_utf16(rest, u16::from_be_bytes);
    }
    match std::str::from_utf8(bytes) {
        Ok(text) => text.to_owned(),
        Err(_) => {
            drops.recoded = true;
            bytes.iter().map(|b| cp1252(*b)).collect()
        }
    }
}

fn decode_utf16(bytes: &[u8], to_u16: fn([u8; 2]) -> u16) -> String {
    let units: Vec<u16> = bytes
        .chunks_exact(2)
        .map(|pair| to_u16([pair[0], pair[1]]))
        .collect();
    String::from_utf16_lossy(&units)
}

// -- Markdown -----------------------------------------------------------------

/// Markdown to prompter text.
///
/// Headings are kept **as `#` lines** rather than flattened, and that is
/// deliberate: `FT-M05`'s markers read exactly that shape, so a Markdown script
/// arrives with its jump list already built. Everything else — emphasis, list
/// bullets, link targets, rules — is formatting and goes.
fn parse_markdown(source: &str, drops: &mut Drops) -> String {
    use pulldown_cmark::{Event, Options, Parser, Tag, TagEnd};

    let mut out = String::with_capacity(source.len());
    // Depth of image tags we are inside — alt text is a description of a
    // picture, not a line of the script.
    let mut in_image = 0usize;

    for event in Parser::new_ext(source, Options::empty()) {
        match event {
            Event::Start(Tag::Heading { level, .. }) => {
                out.push_str("\n\n");
                for _ in 0..level as usize {
                    out.push('#');
                }
                out.push(' ');
            }
            Event::Start(Tag::Paragraph | Tag::CodeBlock(_) | Tag::BlockQuote(_)) => {
                out.push_str("\n\n")
            }
            Event::End(
                TagEnd::Heading(_) | TagEnd::Paragraph | TagEnd::CodeBlock | TagEnd::BlockQuote(_),
            ) => out.push_str("\n\n"),
            Event::Start(Tag::Item) => out.push('\n'),
            Event::Start(Tag::Link { .. }) => drops.link_targets += 1,
            Event::Start(Tag::Image { .. }) => {
                drops.images += 1;
                in_image += 1;
            }
            Event::End(TagEnd::Image) => in_image = in_image.saturating_sub(1),
            Event::Start(Tag::FootnoteDefinition(_)) | Event::FootnoteReference(_) => {
                drops.footnotes += 1
            }
            Event::Text(text) | Event::Code(text) => {
                if in_image == 0 {
                    out.push_str(&text)
                }
            }
            // A soft break is a line break the author typed. Prompter scripts
            // are written a line at a time — a lyric sheet especially — so it
            // stays a line break rather than becoming a space, which is what
            // CommonMark would do on its way to HTML.
            Event::SoftBreak | Event::HardBreak => out.push('\n'),
            Event::Rule => out.push_str("\n\n"),
            Event::Html(_) | Event::InlineHtml(_) => drops.objects += 1,
            _ => {}
        }
    }
    out
}

// -- DOCX ---------------------------------------------------------------------

/// A `.docx` to prompter text.
///
/// A `.docx` is a zip of XML; the body is `word/document.xml`. Read with a
/// streaming XML reader over just that entry rather than a full Office model:
/// what a prompter wants is the text of every paragraph in order, and the
/// nearest thing to that in the format is exactly `<w:t>` inside `<w:p>`.
///
/// Table text is **kept** — a two-column character/line table is a script
/// format, and each cell's paragraph becomes its own line. Tracked-change
/// deletions are dropped for free: Word puts them in `<w:delText>`, not
/// `<w:t>`, so they never match.
fn parse_docx(bytes: &[u8], drops: &mut Drops) -> Result<String, String> {
    use quick_xml::events::Event;
    use quick_xml::Reader;

    let cursor = std::io::Cursor::new(bytes);
    let mut zip = zip::ZipArchive::new(cursor)
        .map_err(|err| format!("that .docx could not be opened: {err}"))?;

    // Running heads live in their own parts, so their presence is the count.
    let mut headers_footers = 0usize;
    for index in 0..zip.len() {
        let Ok(entry) = zip.by_index_raw(index) else {
            continue;
        };
        let name = entry.name();
        if name.starts_with("word/header") || name.starts_with("word/footer") {
            headers_footers += 1;
        } else if name.starts_with("word/media/") {
            drops.images += 1;
        }
    }
    drops.headers_footers += headers_footers;

    // ⚠️ Bounded, because the number in a zip's header is the ATTACKER'S
    // number. A few kilobytes of deflate expands to gigabytes — the oldest
    // trick there is against anything that opens an archive — and this runs on
    // a file the operator was handed. The limit is generous: `document.xml`
    // carries roughly ten bytes of markup per character of script, so this is
    // several times the longest script the engine will hold anyway.
    let mut document = String::new();
    zip.by_name("word/document.xml")
        .map_err(|_| "that .docx has no document body — it may be a .doc renamed".to_string())?
        .take(MAX_DOCUMENT_XML_BYTES)
        .read_to_string(&mut document)
        .map_err(|err| format!("that .docx could not be read: {err}"))?;

    let mut reader = Reader::from_str(&document);
    reader.config_mut().trim_text(false);
    let mut out = String::with_capacity(document.len() / 4);
    // Only `<w:t>` is script. That single flag is also what excludes the two
    // elements that carry text which is NOT script — `<w:instrText>` (a field
    // code such as a HYPERLINK instruction) and `<w:delText>` (a tracked-change
    // deletion) — because Word puts their content in those elements rather
    // than in a `<w:t>` inside them. An earlier version carried a second
    // `suppress` counter for the pair; it could never change the outcome.
    let mut in_text = false;

    loop {
        match reader.read_event() {
            Err(err) => return Err(format!("that .docx is not valid XML: {err}")),
            Ok(Event::Eof) => break,
            Ok(Event::Start(tag)) => match local_name(tag.name().as_ref()) {
                b"t" => in_text = true,
                b"drawing" | b"pict" => drops.images += 1,
                b"object" | b"embeddedObject" => drops.objects += 1,
                b"hyperlink" => drops.link_targets += 1,
                _ => {}
            },
            Ok(Event::End(tag)) => match local_name(tag.name().as_ref()) {
                b"t" => in_text = false,
                // A paragraph is a LINE, not a paragraph break — Word has no
                // other unit of a line, so an author writing a lyric sheet
                // presses Enter once per line and twice for a gap. Emitting a
                // blank line per `<w:p>` would double-space every script AND
                // make every single line its own section in the rehearsal
                // report and the marker jump list, which both split on blank
                // lines. An empty `<w:p>` is the gap, and arrives as one.
                b"p" | b"tr" => out.push('\n'),
                _ => {}
            },
            Ok(Event::Empty(tag)) => match local_name(tag.name().as_ref()) {
                // ⚠️ An empty paragraph is `<w:p/>`, a SELF-CLOSING tag, which
                // quick-xml reports as `Empty` and never as `Start` + `End`.
                // Handling it only in the `End` arm cost the blank line that a
                // Word author's second press of Enter puts there — i.e. every
                // paragraph break in the document, which is precisely what
                // the section split and the marker list read.
                b"p" | b"tr" => out.push('\n'),
                b"br" | b"cr" => out.push('\n'),
                b"tab" => out.push(' '),
                b"commentReference" => drops.comments += 1,
                b"footnoteReference" | b"endnoteReference" => drops.footnotes += 1,
                b"drawing" | b"pict" => drops.images += 1,
                _ => {}
            },
            Ok(Event::Text(text)) if in_text => {
                out.push_str(
                    &text
                        .decode()
                        .map_err(|err| format!("bad text run: {err}"))?,
                );
            }
            // ⚠️ An `&amp;` is NOT part of the text event. quick-xml reports a
            // general reference as its own `GeneralRef`, and the `Text` events
            // either side of it carry only what surrounds it — so a parser that
            // handles `Text` alone silently DELETES every entity in the
            // document. `Q&amp;A` imported as `QA` and `caf&#233;` as `caf`,
            // which is real script text going missing with nothing to see.
            Ok(Event::GeneralRef(entity)) if in_text => {
                if let Some(ch) = entity.resolve_char_ref().ok().flatten() {
                    out.push(ch);
                    continue;
                }
                let name = entity
                    .decode()
                    .map_err(|err| format!("bad entity: {err}"))?
                    .into_owned();
                // The five XML predefines. A DTD-declared entity is something
                // Word does not write, and inventing a value for one would be
                // a guess printed into somebody's script.
                match name.as_str() {
                    "amp" => out.push('&'),
                    "lt" => out.push('<'),
                    "gt" => out.push('>'),
                    "quot" => out.push('"'),
                    "apos" => out.push('\''),
                    _ => {}
                }
            }
            _ => {}
        }
    }
    Ok(out)
}

/// The part of an XML name after the namespace prefix — `w:t` is `t`.
fn local_name(qname: &[u8]) -> &[u8] {
    match qname.iter().rposition(|b| *b == b':') {
        Some(at) => &qname[at + 1..],
        None => qname,
    }
}

// -- RTF ----------------------------------------------------------------------

/// Destinations whose entire contents are metadata, not script.
const RTF_SKIPPED: [&str; 18] = [
    "fonttbl",
    "colortbl",
    "stylesheet",
    "listtable",
    "listoverridetable",
    "revtbl",
    "rsidtbl",
    "info",
    "themedata",
    "colorschememapping",
    "latentstyles",
    "datastore",
    "xmlnstbl",
    "filetbl",
    "generator",
    "pntext",
    "fldinst",
    "bkmkstart",
];

/// An `.rtf` to prompter text.
///
/// Written here rather than taken from a crate, because the part that matters is
/// **which destinations to skip** and **what to report** — a font table, a
/// colour table, and a megabyte of hex-encoded picture data are all "text" to a
/// tokenizer that does not know RTF's group semantics, and would otherwise
/// arrive in the operator's script.
///
/// The format is simple enough to justify that: a stream of literal bytes,
/// `\controlWords`, and `{groups}` that inherit their parent's state.
fn parse_rtf(bytes: &[u8], drops: &mut Drops) -> String {
    let mut stack = vec![RtfGroup { skip: false, uc: 1 }];
    let mut out = String::with_capacity(bytes.len() / 2);
    // How many characters the last `\uN` still wants swallowed.
    let mut pending_uc = 0usize;
    let mut i = 0usize;

    // Push one decoded character, honouring an outstanding `\ucN` swallow.
    macro_rules! emit {
        ($ch:expr) => {{
            if pending_uc > 0 {
                pending_uc -= 1;
            } else if !stack.last().map(|g| g.skip).unwrap_or(false) {
                out.push($ch);
            }
        }};
    }

    while i < bytes.len() {
        match bytes[i] {
            b'{' => {
                let top = *stack.last().unwrap_or(&RtfGroup { skip: false, uc: 1 });
                stack.push(top);
                i += 1;
            }
            b'}' => {
                if stack.len() > 1 {
                    stack.pop();
                }
                pending_uc = 0;
                i += 1;
            }
            b'\\' => {
                i += 1;
                if i >= bytes.len() {
                    break;
                }
                let next = bytes[i];
                // `\'XX` — one byte in the document's code page.
                if next == b'\'' {
                    let hex = bytes.get(i + 1..i + 3).unwrap_or(b"");
                    if hex.len() == 2 {
                        if let Ok(text) = std::str::from_utf8(hex) {
                            if let Ok(byte) = u8::from_str_radix(text, 16) {
                                emit!(cp1252(byte));
                            }
                        }
                    }
                    i += 3;
                    continue;
                }
                // An escaped literal, or one of the three punctuation controls.
                if !next.is_ascii_alphabetic() {
                    match next {
                        b'\\' | b'{' | b'}' => emit!(next as char),
                        b'~' => emit!(' '),
                        b'_' => emit!('-'),
                        // `\-` is an optional hyphen: a hint about where a word
                        // MAY break, not a hyphen anybody typed.
                        b'-' => {}
                        b'*' => {
                            // `\*` marks the group's destination as one a reader
                            // that does not understand it must skip whole.
                            if let Some(top) = stack.last_mut() {
                                top.skip = true;
                            }
                        }
                        b'\n' | b'\r' => emit!('\n'),
                        _ => {}
                    }
                    i += 1;
                    continue;
                }
                // A control word: letters, then an optional signed number, then
                // one optional space that belongs to the word, not the text.
                let start = i;
                while i < bytes.len() && bytes[i].is_ascii_alphabetic() {
                    i += 1;
                }
                let word = std::str::from_utf8(&bytes[start..i]).unwrap_or("");
                let num_start = i;
                if i < bytes.len() && bytes[i] == b'-' {
                    i += 1;
                }
                while i < bytes.len() && bytes[i].is_ascii_digit() {
                    i += 1;
                }
                let number: Option<i32> = std::str::from_utf8(&bytes[num_start..i])
                    .ok()
                    .and_then(|text| text.parse().ok());
                if i < bytes.len() && bytes[i] == b' ' {
                    i += 1;
                }
                apply_rtf_word(word, number, &mut stack, &mut out, &mut pending_uc, drops);
            }
            b'\r' | b'\n' => i += 1, // line breaks in the SOURCE are not content
            byte => {
                emit!(cp1252(byte));
                i += 1;
            }
        }
    }
    out
}

/// One `{ ... }` level. Skipping is inherited when a group is pushed, so a
/// picture inside a header is skipped once, by the outermost reason.
#[derive(Clone, Copy)]
struct RtfGroup {
    skip: bool,
    /// Characters to swallow after a `\uN`, from `\ucN`.
    uc: usize,
}

/// One RTF control word's effect. Split out to keep [`parse_rtf`]'s loop about
/// tokenizing and this about semantics.
fn apply_rtf_word(
    word: &str,
    number: Option<i32>,
    stack: &mut [RtfGroup],
    out: &mut String,
    pending_uc: &mut usize,
    drops: &mut Drops,
) {
    let skipping = stack.last().map(|g| g.skip).unwrap_or(false);
    match word {
        // Breaks. `\par` is the paragraph, and a prompter's line.
        "par" => {
            if !skipping {
                out.push('\n')
            }
        }
        "line" => {
            if !skipping {
                out.push('\n')
            }
        }
        "page" | "sect" => {
            if !skipping {
                out.push_str("\n\n")
            }
        }
        "tab" => {
            if !skipping {
                out.push(' ')
            }
        }
        "emdash" | "endash" => {
            if !skipping {
                out.push('-')
            }
        }
        "lquote" | "rquote" => {
            if !skipping {
                out.push('\'')
            }
        }
        "ldblquote" | "rdblquote" => {
            if !skipping {
                out.push('"')
            }
        }
        "bullet" => {}
        // Unicode, and how many following characters are its ANSI fallback.
        "uc" => {
            if let (Some(top), Some(n)) = (stack.last_mut(), number) {
                top.uc = n.clamp(0, 32) as usize;
            }
        }
        "u" => {
            if let Some(n) = number {
                // RTF writes code points above 32767 as negative numbers.
                let scalar = if n < 0 { (n + 65536) as u32 } else { n as u32 };
                if let Some(ch) = char::from_u32(scalar) {
                    if !skipping {
                        out.push(ch);
                    }
                }
                *pending_uc = stack.last().map(|g| g.uc).unwrap_or(1);
            }
        }
        // Destinations worth naming in the report before they are skipped.
        "pict" | "objdata" | "shppict" | "nonshppict" => {
            drops.images += 1;
            mark_skip(stack);
        }
        "object" => {
            drops.objects += 1;
            mark_skip(stack);
        }
        "footnote" => {
            drops.footnotes += 1;
            mark_skip(stack);
        }
        "annotation" | "atnid" | "atnauthor" => {
            drops.comments += 1;
            mark_skip(stack);
        }
        "header" | "headerl" | "headerr" | "headerf" | "footer" | "footerl" | "footerr"
        | "footerf" => {
            drops.headers_footers += 1;
            mark_skip(stack);
        }
        "field" => {}
        other if RTF_SKIPPED.contains(&other) => {
            // A hyperlink's target lives in the `fldinst` destination, and its
            // visible text in the `fldrslt` beside it — so counting here is
            // counting exactly the URLs that are being dropped.
            if other == "fldinst" {
                drops.link_targets += 1;
            }
            mark_skip(stack);
        }
        _ => {}
    }
}

fn mark_skip(stack: &mut [RtfGroup]) {
    if let Some(top) = stack.last_mut() {
        top.skip = true;
    }
}

// -- PDF ----------------------------------------------------------------------

/// A `.pdf` to prompter text.
///
/// Lines come out as the file lays them out and are **not re-flowed**. Guessing
/// where a hard-wrapped paragraph should join back up is exactly the kind of
/// heuristic that ruins verse and lyrics — a line in a PDF script is usually a
/// line of the script, and where it is not, the operator can see that and fix
/// it. Silently rewrapping someone's stanza is worse than leaving it.
fn parse_pdf(bytes: &[u8]) -> Result<String, String> {
    pdf_extract::extract_text_from_mem(bytes)
        .map_err(|err| format!("that .pdf could not be read: {err}"))
}

// -- the child ----------------------------------------------------------------

/// Which parser a path asks for. The extension decides, and the file's own
/// leading bytes overrule it — a `.txt` that is really a PDF is a thing people
/// are handed, and reading its raw bytes as a script would fill the prompter
/// with binary.
fn format_of(path: &Path, bytes: &[u8]) -> &'static str {
    if bytes.starts_with(b"%PDF-") {
        return "pdf";
    }
    if bytes.starts_with(b"{\\rtf") {
        return "rtf";
    }
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();
    match ext.as_str() {
        // The extension is TRUSTED here, deliberately. The magic-byte checks
        // above exist to catch a file whose extension is wrong — a PDF saved as
        // `.txt` is a thing people are handed — not to second-guess one that is
        // right. A `.docx` that is really an old `.doc` therefore reaches the
        // zip reader and comes back as "that .docx could not be opened", which
        // is the truth; falling through to the text parser instead put the
        // bytes `PK` (or a compound-file header) into somebody's script.
        "docx" => "docx",
        "md" | "markdown" | "mdown" | "mkd" => "markdown",
        "rtf" => "rtf",
        "pdf" => "pdf",
        // No useful extension: a zip can only be an Office file here.
        _ if bytes.starts_with(b"PK\x03\x04") => "docx",
        _ => "txt",
    }
}

/// A script name from the file's own stem, or empty when nothing legal is left.
///
/// Validated with the library's own [`crate::scripts::is_valid_name`] rather
/// than a second rule: a name this produced but that could not then be saved
/// would be a dead end offered by the app itself.
fn suggested_name(path: &Path) -> String {
    let stem = path.file_stem().and_then(|s| s.to_str()).unwrap_or("");
    let cleaned: String = stem
        .chars()
        .map(|c| if "/\\:*?\"<>|".contains(c) { '-' } else { c })
        .filter(|c| !c.is_control())
        .collect();
    let trimmed = cleaned.trim().trim_end_matches('.').trim();
    let bounded: String = trimmed.chars().take(64).collect();
    let bounded = bounded.trim().to_string();
    if crate::scripts::is_valid_name(&bounded) {
        bounded
    } else {
        String::new()
    }
}

/// Read and convert one document. The whole of the import, with no process or
/// IPC in it, so every format is unit-testable from a byte slice.
fn convert(path: &Path, bytes: &[u8]) -> Result<ImportResult, String> {
    let mut drops = Drops::default();
    let format = format_of(path, bytes);
    let raw = match format {
        "pdf" => parse_pdf(bytes)?,
        "docx" => parse_docx(bytes, &mut drops)?,
        "rtf" => parse_rtf(bytes, &mut drops),
        "markdown" => {
            let source = decode_text(bytes, &mut drops);
            parse_markdown(&source, &mut drops)
        }
        _ => decode_text(bytes, &mut drops),
    };

    let mut text = normalise(&raw);
    let truncated = text.chars().count() > MAX_IMPORT_CHARS;
    if truncated {
        text = text.chars().take(MAX_IMPORT_CHARS).collect();
    }

    Ok(ImportResult {
        report: ImportReport {
            format: format.to_string(),
            chars: visible_chars(&text),
            paragraphs: paragraph_count(&text),
            dropped: drops.finish(),
            truncated,
        },
        suggested_name: suggested_name(path),
        text,
    })
}

/// `--import <source> <destination>`: we are the isolated parser, not the app.
///
/// Returns whether that is what we are, so `main` can leave before a window is
/// ever built — the same contract `bugreport::run_crash_notice` has.
///
/// The outcome is written to `<destination>` as JSON, through a temp file and a
/// rename, so the parent finds either nothing or a whole answer. A child that
/// dies leaves nothing, which is exactly how the parent learns that it died.
pub fn run_import_child(args: &[String]) -> bool {
    let Some(at) = args.iter().position(|a| a == "--import") else {
        return false;
    };
    let (Some(source), Some(destination)) = (args.get(at + 1), args.get(at + 2)) else {
        return false;
    };
    let path = PathBuf::from(source);
    let outcome = match read_bounded(&path) {
        Ok(bytes) => match convert(&path, &bytes) {
            Ok(result) => ChildOutcome::Ok(result),
            Err(err) => ChildOutcome::Err(err),
        },
        Err(err) => ChildOutcome::Err(err),
    };
    let json = serde_json::to_string(&outcome).unwrap_or_else(|err| {
        format!("{{\"Err\":\"the import result could not be encoded: {err}\"}}")
    });
    let out = PathBuf::from(destination);
    let temp = out.with_extension("part");
    if std::fs::write(&temp, json).is_ok() {
        let _ = std::fs::rename(&temp, &out);
    }
    true
}

/// Read a file, refusing anything too big to be a script.
///
/// The bound is enforced on the READ, not only on the metadata: checking the
/// size and then calling `fs::read` is two separate looks at a file that
/// something else may be writing, and the second one is the one that allocates.
/// `take(MAX + 1)` cannot be raced — if more than the limit comes back, the
/// file was over it whatever the metadata said.
fn read_bounded(path: &Path) -> Result<Vec<u8>, String> {
    let meta =
        std::fs::metadata(path).map_err(|err| format!("that file could not be opened: {err}"))?;
    if !meta.is_file() {
        return Err("that is not a file".to_string());
    }
    if meta.len() > MAX_FILE_BYTES {
        return Err("that file is too large to import".to_string());
    }
    let file =
        std::fs::File::open(path).map_err(|err| format!("that file could not be opened: {err}"))?;
    let mut bytes = Vec::new();
    file.take(MAX_FILE_BYTES + 1)
        .read_to_end(&mut bytes)
        .map_err(|err| format!("that file could not be read: {err}"))?;
    if bytes.len() as u64 > MAX_FILE_BYTES {
        return Err("that file is too large to import".to_string());
    }
    Ok(bytes)
}

// -- the command --------------------------------------------------------------

/// Create a directory only this user can look inside.
///
/// `create_dir`, not `create_dir_all`: it FAILS when the name is already taken,
/// which is what makes the random name above a check rather than a hope.
///
/// On Unix the mode matters as much as the name. `/tmp` is shared, and the
/// default 0777-minus-umask leaves the imported script — which may be an
/// unreleased screenplay — readable by every other account on the machine for
/// as long as the import runs. Windows temp directories are already per-user,
/// so there is nothing to tighten there.
fn new_private_dir(dir: &Path) -> std::io::Result<()> {
    #[cfg(unix)]
    {
        use std::os::unix::fs::DirBuilderExt;
        std::fs::DirBuilder::new().mode(0o700).create(dir)
    }
    #[cfg(not(unix))]
    {
        std::fs::create_dir(dir)
    }
}

/// Import a document, in a child process that cannot take the app with it.
///
/// Returns the text and the report **without** saving anything: the operator
/// sees what was dropped and names the script before a file exists. An import
/// that wrote to the library first and asked afterwards would be a way to fill
/// somebody's script folder by mis-clicking.
///
/// # ⚠️ This takes a PATH, and `scripts.rs` deliberately does not
///
/// Every other file command in this app refuses a path outright — `scripts.rs`
/// opens its own module docs with *"the name is the whole security surface"* —
/// so this one is a real widening and is worth being explicit about rather than
/// leaving for someone to notice.
///
/// It cannot be otherwise: the feature is "open the file you were sent", and
/// that file is anywhere. So this command is an arbitrary-file **read**
/// available to the webview, and its output lands in the operator's script.
/// What makes that acceptable here:
///
/// * the webview loads **only** bundled code — no remote content, no
///   `dangerouslySetInnerHTML`, no `eval` — so there is no path by which
///   anything but the app itself can call it;
/// * the app is single-user and local-first, and the file is read with exactly
///   the privileges the person driving the app already has;
/// * it **writes** nowhere the caller chooses. The result comes back over the
///   IPC boundary, and it only becomes a file through `scripts_create`, which
///   validates a NAME and not a path.
///
/// If a future feature ever puts untrusted content into the webview, this is
/// the command to re-scope — to paths the file picker actually returned.
#[tauri::command]
pub fn import_document(path: String) -> Result<ImportResult, String> {
    let exe = std::env::current_exe().map_err(|err| format!("could not find the app: {err}"))?;
    // A private directory per import, created fresh, with an UNGUESSABLE name.
    //
    // ⚠️ Not `temp_dir().join("freally-import-<pid>.json")`, which was the
    // first version. On Linux the temp directory is world-writable and shared,
    // so a predictable name is one anything else on the machine can create
    // first — as a symlink, or simply as a file it goes on to rewrite between
    // the child's rename and the parent's read. Either way the parent would
    // parse somebody else's JSON and load it into the operator's script.
    //
    // `create_dir` (not `create_dir_all`) is the check: it FAILS if the name is
    // already taken, so a collision is an error rather than a shared directory.
    // The randomness is the OS CSPRNG — the same source the LAN mirror's
    // session key comes from, for the same reason a counter will not do.
    let mut token = [0u8; 16];
    getrandom::fill(&mut token).map_err(|err| format!("could not name a temporary file: {err}"))?;
    let name: String = token.iter().map(|byte| format!("{byte:02x}")).collect();
    let dir = std::env::temp_dir().join(format!("freally-import-{name}"));
    new_private_dir(&dir).map_err(|err| format!("could not create a temporary folder: {err}"))?;
    let out = dir.join("result.json");

    let mut child = std::process::Command::new(exe)
        .arg("--import")
        .arg(&path)
        .arg(&out)
        .spawn()
        .map_err(|err| format!("the importer could not be started: {err}"))?;

    // Wait, but not forever: a parser that never returns must become an error
    // the operator can act on rather than a spinner with no end.
    let deadline = Instant::now() + CHILD_TIMEOUT;
    let finished = loop {
        match child.try_wait() {
            Ok(Some(status)) => break Some(status),
            Ok(None) if Instant::now() < deadline => std::thread::sleep(Duration::from_millis(25)),
            Ok(None) => {
                let _ = child.kill();
                let _ = child.wait();
                break None;
            }
            Err(err) => {
                let _ = std::fs::remove_dir_all(&dir);
                return Err(format!("the importer could not be waited on: {err}"));
            }
        }
    };

    // Read, then take the whole private directory with us — including the
    // `.part` file a child that died mid-write would have left behind.
    let json = std::fs::read_to_string(&out).ok();
    let _ = std::fs::remove_dir_all(&dir);

    let Some(json) = json else {
        return Err(match finished {
            None => "that document took too long to read and was stopped".to_string(),
            // No file and a clean exit is impossible unless the child died
            // between writing and renaming; either way the parser is what
            // stopped, and saying so is more useful than an exit code.
            Some(_) => "that document could not be read — the importer stopped".to_string(),
        });
    };
    match serde_json::from_str::<ChildOutcome>(&json) {
        Ok(ChildOutcome::Ok(result)) => Ok(result),
        Ok(ChildOutcome::Err(err)) => Err(err),
        Err(err) => Err(format!("the importer's answer could not be read: {err}")),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn convert_bytes(name: &str, bytes: &[u8]) -> ImportResult {
        convert(Path::new(name), bytes).expect("conversion failed")
    }

    /// The rule the whole normalisation pass exists to guarantee: rewriting a
    /// dash must never hand the scroll engine a pause nobody wrote.
    #[test]
    fn normalising_dashes_never_creates_a_caesura() {
        // Two em dashes with a space either side is EXACTLY the caesura token
        // if each becomes one hyphen, and it is ordinary typeset punctuation.
        assert_eq!(
            normalise("hold on \u{2014}\u{2014} then go"),
            "hold on - then go"
        );
        assert_eq!(normalise("a \u{2014} b"), "a - b");
        assert_eq!(normalise("word\u{2014}word"), "word-word");
        // A run that mixes a real hyphen with a mapped one collapses too.
        assert_eq!(normalise("a -\u{2014} b"), "a - b");
        // ...and one the author actually typed is left alone, so a .txt written
        // in this app's own syntax keeps its pauses.
        assert_eq!(normalise("stop -- go"), "stop -- go");
        assert_eq!(normalise("stop --2 go"), "stop --2 go");
        // A rule of hyphens is not two hyphens and was never a caesura.
        assert_eq!(normalise("----"), "----");
    }

    #[test]
    fn typography_is_flattened_and_invisibles_are_dropped() {
        assert_eq!(normalise("\u{201c}hi,\u{201d} he said"), "\"hi,\" he said");
        assert_eq!(normalise("don\u{2019}t"), "don't");
        assert_eq!(normalise("wait\u{2026}"), "wait...");
        // A zero-width character is a VISIBLE character to the scroll engine —
        // it costs read time and shifts every offset after it.
        assert_eq!(normalise("a\u{200b}b\u{00ad}c"), "abc");
        assert_eq!(normalise("a\u{00a0}b"), "a b");
        assert_eq!(normalise("a\tb"), "a b");
    }

    #[test]
    fn blank_lines_are_collapsed_and_trimmed() {
        assert_eq!(normalise("\n\n\na\n\n\n\n\nb   \n\n\n"), "a\n\nb");
        assert_eq!(normalise("one\ntwo"), "one\ntwo");
    }

    /// Windows-1252 is the fallback, and it is REPORTED — a script read in the
    /// wrong encoding is not discovered until somebody tries to read it aloud.
    #[test]
    fn a_non_utf8_file_is_recoded_and_says_so() {
        // 0x92 is a curly apostrophe in Windows-1252 and invalid UTF-8.
        let result = convert_bytes("take.txt", b"don\x92t stop");
        assert_eq!(result.text, "don't stop");
        assert_eq!(
            result.report.dropped,
            vec![Dropped {
                kind: "encoding".to_string(),
                count: 1
            }]
        );
    }

    #[test]
    fn utf16_and_utf8_boms_are_understood() {
        let mut utf16 = vec![0xff, 0xfe];
        for unit in "hi".encode_utf16() {
            utf16.extend_from_slice(&unit.to_le_bytes());
        }
        assert_eq!(convert_bytes("a.txt", &utf16).text, "hi");
        // A UTF-8 BOM is stripped rather than kept: it is a visible character
        // to the engine, and `scripts.rs` strips it on read for the same reason.
        assert_eq!(convert_bytes("a.txt", b"\xef\xbb\xbfhi").text, "hi");
        assert!(convert_bytes("a.txt", b"\xef\xbb\xbfhi")
            .report
            .dropped
            .is_empty());
    }

    /// Markdown headings survive as `#` lines because that is what FT-M05 reads
    /// as a marker — an imported Markdown script arrives with its jump list.
    #[test]
    fn markdown_keeps_headings_and_drops_formatting() {
        let source = "# Verse 1\n\nsome **bold** words and a [link](http://x)\n\n- one\n- two\n";
        let result = convert_bytes("song.md", source.as_bytes());
        assert!(result.text.starts_with("# Verse 1"), "{}", result.text);
        assert!(result.text.contains("some bold words and a link"));
        assert!(result.text.contains("one\ntwo"));
        assert_eq!(
            result.report.dropped,
            vec![Dropped {
                kind: "linkTargets".to_string(),
                count: 1
            }]
        );
    }

    #[test]
    fn markdown_images_are_counted_and_their_alt_text_left_out() {
        let result = convert_bytes("a.md", b"before ![a photo of nothing](x.png) after");
        assert_eq!(result.text, "before  after");
        assert_eq!(result.report.dropped[0].kind, "images");
    }

    /// RTF's group semantics are the whole reason this parser is hand-written:
    /// a font table is text to anything that does not understand them.
    #[test]
    fn rtf_skips_metadata_destinations_and_keeps_the_body() {
        let rtf = br"{\rtf1\ansi{\fonttbl{\f0 Times New Roman;}}{\colortbl ;\red0\green0\blue0;}\pard Hello \par World\par}";
        let result = convert_bytes("take.rtf", rtf);
        // One `\par` is one LINE, not a blank line between two — see the
        // paragraph note in `parse_docx`; the same reasoning applies here.
        assert_eq!(result.text, "Hello\nWorld");
        assert_eq!(result.report.format, "rtf");
    }

    #[test]
    fn rtf_decodes_escapes_and_unicode() {
        // `\'92` is a Windows-1252 curly apostrophe; `\u233` is é with a `?`
        // fallback character that `\uc1` says to swallow.
        let rtf = br"{\rtf1\ansi\uc1 don\'92t caf\u233 ? end}";
        let result = convert_bytes("a.rtf", rtf);
        assert_eq!(result.text, "don't caf\u{e9} end");
    }

    #[test]
    fn rtf_counts_what_it_throws_away() {
        let rtf = br"{\rtf1{\*\generator Word}{\footnote a note}{\pict deadbeef}Body\par}";
        let result = convert_bytes("a.rtf", rtf);
        assert_eq!(result.text, "Body");
        let kinds: Vec<&str> = result
            .report
            .dropped
            .iter()
            .map(|d| d.kind.as_str())
            .collect();
        assert!(kinds.contains(&"images"), "{kinds:?}");
        assert!(kinds.contains(&"footnotes"), "{kinds:?}");
    }

    /// The magic bytes overrule the extension, because "here is the script" is
    /// how a PDF named `.txt` arrives, and reading it as text fills the
    /// prompter with binary.
    #[test]
    fn the_files_own_bytes_decide_the_format() {
        assert_eq!(format_of(Path::new("a.txt"), b"%PDF-1.7\n"), "pdf");
        assert_eq!(format_of(Path::new("a.txt"), br"{\rtf1 x}"), "rtf");
        assert_eq!(format_of(Path::new("a.docx"), b"PK\x03\x04zz"), "docx");
        assert_eq!(format_of(Path::new("a.md"), b"# hi"), "markdown");
        assert_eq!(format_of(Path::new("a.txt"), b"hi"), "txt");
        // A .docx renamed from an old .doc still goes to the docx reader, so
        // the operator is told what is wrong instead of being handed a script
        // whose first characters are a compound-file header.
        assert_eq!(format_of(Path::new("a.docx"), b"\xd0\xcf\x11\xe0"), "docx");
        let err = convert(Path::new("a.docx"), b"\xd0\xcf\x11\xe0").unwrap_err();
        assert!(err.contains("could not be opened"), "{err}");
    }

    /// The suggested name is validated by the library's own rule, so the app
    /// never proposes a name its own save would then refuse.
    #[test]
    fn a_suggested_name_is_always_one_the_library_would_accept() {
        assert_eq!(suggested_name(Path::new("/tmp/Take 2.docx")), "Take 2");
        assert_eq!(suggested_name(Path::new("/tmp/  spaced  .txt")), "spaced");
        assert_eq!(suggested_name(Path::new("/tmp/CON.txt")), "");
        assert_eq!(suggested_name(Path::new("/tmp/....txt")), "");
        let long = format!("/tmp/{}.txt", "x".repeat(200));
        assert!(crate::scripts::is_valid_name(&suggested_name(Path::new(
            &long
        ))));
    }

    /// A `.docx` with the shapes that actually turn up in a script someone was
    /// sent: a heading paragraph, a soft line break, an empty paragraph as the
    /// gap, a hyperlink, a comment, a footnote, and a tracked-change deletion.
    ///
    /// Built here rather than checked in as a binary fixture, so what the test
    /// asserts against is visible in the test.
    fn docx(body: &str) -> Vec<u8> {
        use std::io::Write;
        let mut buffer = std::io::Cursor::new(Vec::new());
        {
            let mut zip = zip::ZipWriter::new(&mut buffer);
            let options: zip::write::FileOptions<'_, ()> = zip::write::FileOptions::default()
                .compression_method(zip::CompressionMethod::Deflated);
            zip.start_file("word/document.xml", options).unwrap();
            write!(
                zip,
                r#"<?xml version="1.0"?><w:document xmlns:w="x"><w:body>{body}</w:body></w:document>"#
            )
            .unwrap();
            zip.start_file("word/header1.xml", options).unwrap();
            zip.write_all(b"<x/>").unwrap();
            zip.start_file("word/media/image1.png", options).unwrap();
            zip.write_all(b"\x89PNG").unwrap();
            zip.finish().unwrap();
        }
        buffer.into_inner()
    }

    #[test]
    fn docx_paragraphs_become_lines_and_the_rest_is_reported() {
        let body = concat!(
            r#"<w:p><w:r><w:t>Verse 1</w:t></w:r></w:p>"#,
            r#"<w:p><w:r><w:t xml:space="preserve">first line</w:t><w:br/><w:t>second line</w:t></w:r></w:p>"#,
            r#"<w:p/>"#,
            r#"<w:p><w:hyperlink r:id="rId1"><w:r><w:t>the link text</w:t></w:r></w:hyperlink></w:p>"#,
            r#"<w:p><w:r><w:commentReference w:id="1"/><w:footnoteReference w:id="2"/></w:r><w:del><w:r><w:delText>cut this</w:delText></w:r></w:del><w:r><w:t>kept</w:t></w:r></w:p>"#,
            r#"<w:p><w:r><w:fldChar/><w:instrText>HYPERLINK "http://x"</w:instrText></w:r></w:p>"#,
        );
        let result = convert_bytes("Take 3.docx", &docx(body));

        assert_eq!(result.report.format, "docx");
        assert_eq!(result.suggested_name, "Take 3");
        // The empty `<w:p/>` is the gap; every other paragraph is one line.
        assert_eq!(
            result.text,
            "Verse 1\nfirst line\nsecond line\n\nthe link text\nkept"
        );
        // A tracked-change deletion lives in `<w:delText>`, never `<w:t>`, and
        // a field's instruction is a code rather than script — neither reaches
        // the prompter.
        assert!(!result.text.contains("cut this"), "{}", result.text);
        assert!(!result.text.contains("HYPERLINK"), "{}", result.text);

        let counts: std::collections::BTreeMap<&str, usize> = result
            .report
            .dropped
            .iter()
            .map(|d| (d.kind.as_str(), d.count))
            .collect();
        assert_eq!(counts.get("images"), Some(&1));
        assert_eq!(counts.get("footnotes"), Some(&1));
        assert_eq!(counts.get("comments"), Some(&1));
        assert_eq!(counts.get("headersFooters"), Some(&1));
        assert_eq!(counts.get("linkTargets"), Some(&1));
    }

    /// ⚠️ Proven red against the first version, which handled `Event::Text`
    /// alone: quick-xml reports `&amp;` as its own `GeneralRef` event, so every
    /// entity in the document was silently DELETED. `Q&amp;A` came out as `QA`
    /// — an ampersand is ordinary in a script title, and nothing on screen
    /// would have said a character had gone.
    #[test]
    fn docx_entities_are_resolved_rather_than_dropped() {
        let body =
            r#"<w:p><w:r><w:t>Q&amp;A caf&#233; 5 &lt; 6 &quot;quoted&quot;</w:t></w:r></w:p>"#;
        let result = convert_bytes("a.docx", &docx(body));
        assert_eq!(result.text, "Q&A caf\u{e9} 5 < 6 \"quoted\"");
    }

    /// A `.docx` that is not a zip, and a zip that is not a `.docx`. Both are
    /// things people are handed, and both must fail with a sentence rather than
    /// with whatever the zip reader felt like.
    #[test]
    fn a_broken_docx_fails_with_a_readable_reason() {
        let empty_zip = {
            let mut buffer = std::io::Cursor::new(Vec::new());
            zip::ZipWriter::new(&mut buffer).finish().unwrap();
            buffer.into_inner()
        };
        let err = convert(Path::new("a.docx"), &empty_zip).unwrap_err();
        assert!(err.contains("no document body"), "{err}");
    }

    /// A real PDF, assembled here with a correct cross-reference table, so the
    /// riskiest of the five parsers is exercised by the gate rather than only
    /// by whatever file somebody happens to try.
    fn pdf(text: &str) -> Vec<u8> {
        let content = format!("BT /F1 24 Tf 72 700 Td ({text}) Tj ET");
        let objects = [
            "<</Type/Catalog/Pages 2 0 R>>".to_string(),
            "<</Type/Pages/Kids[3 0 R]/Count 1>>".to_string(),
            "<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>".to_string(),
            "<</Type/Font/Subtype/Type1/BaseFont/Helvetica/Encoding/WinAnsiEncoding>>".to_string(),
            format!("<</Length {}>>stream\n{content}\nendstream", content.len()),
        ];
        let mut out = String::from("%PDF-1.4\n");
        let mut offsets = Vec::new();
        for (index, body) in objects.iter().enumerate() {
            offsets.push(out.len());
            out.push_str(&format!("{} 0 obj\n{body}\nendobj\n", index + 1));
        }
        let xref_at = out.len();
        out.push_str(&format!(
            "xref\n0 {}\n0000000000 65535 f \n",
            objects.len() + 1
        ));
        for offset in &offsets {
            out.push_str(&format!("{offset:010} 00000 n \n"));
        }
        out.push_str(&format!(
            "trailer\n<</Size {}/Root 1 0 R>>\nstartxref\n{xref_at}\n%%EOF\n",
            objects.len() + 1
        ));
        out.into_bytes()
    }

    #[test]
    fn a_pdf_gives_up_its_text() {
        let result = convert_bytes("script.pdf", &pdf("Hello prompter"));
        assert_eq!(result.report.format, "pdf");
        assert!(result.text.contains("Hello prompter"), "{:?}", result.text);
        assert_eq!(result.suggested_name, "script");
    }

    /// The one thing about the PDF path that is not pdf-extract's business:
    /// a file that is not a PDF at all must come back as an error, not as a
    /// panic and not as binary in somebody's script.
    #[test]
    fn a_pdf_that_is_not_a_pdf_is_an_error() {
        let err = convert(Path::new("a.pdf"), b"%PDF-1.4\nnot really\n").unwrap_err();
        assert!(err.contains("could not be read"), "{err}");
    }

    #[test]
    fn oversized_text_is_cut_and_the_report_says_so() {
        let huge = "a".repeat(MAX_IMPORT_CHARS + 10);
        let result = convert_bytes("a.txt", huge.as_bytes());
        assert!(result.report.truncated);
        assert_eq!(result.text.chars().count(), MAX_IMPORT_CHARS);
    }

    /// The child's half of the contract, exercised without spawning anything:
    /// `--import` is recognised, the answer lands at the destination, and a
    /// file that cannot be read comes back as `Err` rather than as no file at
    /// all — the parent tells those two cases apart and says different things.
    #[test]
    fn the_import_child_writes_its_answer_where_it_was_told() {
        let dir = std::env::temp_dir().join("freally-teleprompt-tests");
        std::fs::create_dir_all(&dir).unwrap();
        let source = dir.join("child-source.txt");
        let destination = dir.join("child-answer.json");
        let _ = std::fs::remove_file(&destination);
        std::fs::write(&source, "spoken \u{2014} words").unwrap();

        let args = vec![
            "freally-teleprompt".to_string(),
            "--import".to_string(),
            source.to_string_lossy().into_owned(),
            destination.to_string_lossy().into_owned(),
        ];
        assert!(run_import_child(&args), "the flag was not recognised");

        let json = std::fs::read_to_string(&destination).expect("no answer was written");
        match serde_json::from_str::<ChildOutcome>(&json).unwrap() {
            ChildOutcome::Ok(result) => assert_eq!(result.text, "spoken - words"),
            ChildOutcome::Err(err) => panic!("{err}"),
        }

        // A missing source is an ERROR IN THE FILE, not a missing file: the
        // parent reads "the importer stopped" only when the child truly died,
        // so an unreadable document must not look like a crash.
        let args = vec![
            "freally-teleprompt".to_string(),
            "--import".to_string(),
            dir.join("does-not-exist.txt")
                .to_string_lossy()
                .into_owned(),
            destination.to_string_lossy().into_owned(),
        ];
        assert!(run_import_child(&args));
        let json = std::fs::read_to_string(&destination).unwrap();
        assert!(matches!(
            serde_json::from_str::<ChildOutcome>(&json).unwrap(),
            ChildOutcome::Err(_)
        ));

        // Not our flag: `main` must go on and build the app.
        assert!(!run_import_child(&["freally-teleprompt".to_string()]));
        // Our flag, but without both paths — refused rather than half-run.
        assert!(!run_import_child(&[
            "freally-teleprompt".to_string(),
            "--import".to_string()
        ]));
    }

    #[test]
    fn the_report_counts_what_the_editor_will_show() {
        let result = convert_bytes("a.txt", b"one two\n\nthree");
        assert_eq!(result.report.paragraphs, 2);
        // Newlines are not visible characters — the scroll engine's own unit.
        assert_eq!(result.report.chars, "one twothree".len());
    }
}
