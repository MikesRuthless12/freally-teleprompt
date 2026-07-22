import { describe, expect, it } from "vitest";

import { complete, completeWith, indexDict, loadDict } from "../suggest";

/**
 * FT-20/FT-21 — the autocomplete seam.
 *
 * Most of this runs against a tiny hand-built table so the assertions are exact
 * and say what they mean. The last block loads a REAL shipped table, because
 * every check above it would pass just as happily against 18 files of garbage:
 * the seam working and the data being usable are different claims.
 */
const DICT = indexDict({
  // Frequency order matters — the first prefix hit is what gets suggested.
  words: ["through", "the", "there", "their", "thing", "prompt", "prompter", "a"],
  phrases: ["thank you very much", "thank you", "good evening everyone"],
});

describe("completeWith — words", () => {
  it("completes a partial word with what is missing, not the whole word", () => {
    expect(completeWith(DICT, "thr")).toEqual(["ough"]);
  });

  it("offers the most frequent match first", () => {
    // "through" is listed ahead of "the"/"there"/"their", so it wins on "th".
    expect(completeWith(DICT, "th")).toEqual(["rough"]);
  });

  it("returns several in frequency order when asked", () => {
    expect(completeWith(DICT, "the", 3)).toEqual(["re", "ir"]);
  });

  it("says nothing after a single character", () => {
    // One letter is not enough to guess usefully, and it is also the point at
    // which a bucket scan would be at its widest.
    expect(completeWith(DICT, "t")).toEqual([]);
  });

  it("never suggests a word the user has already finished typing", () => {
    expect(completeWith(DICT, "the")).not.toContain("");
    expect(completeWith(DICT, "prompt")).toEqual(["er"]);
  });

  it("says nothing when the bucket has no match", () => {
    expect(completeWith(DICT, "zz")).toEqual([]);
    expect(completeWith(DICT, "xylophone")).toEqual([]);
  });

  it("is case-insensitive about what was typed", () => {
    expect(completeWith(DICT, "TH")).toEqual(["rough"]);
    expect(completeWith(DICT, "Prompt")).toEqual(["er"]);
  });

  it("completes only the word at the caret, ignoring earlier text", () => {
    expect(completeWith(DICT, "read this thr")).toEqual(["ough"]);
  });
});

describe("completeWith — phrases", () => {
  it("continues a phrase once a word and a space are typed", () => {
    expect(completeWith(DICT, "thank ")).toEqual(["you very much"]);
  });

  it("does not offer a phrase mid-word", () => {
    // "thank" with no trailing space is a partial WORD, so the word path runs.
    expect(completeWith(DICT, "thank")).toEqual([]);
  });

  it("says nothing after a word that starts no phrase", () => {
    expect(completeWith(DICT, "prompter ")).toEqual([]);
  });

  it("says nothing at the very start of an empty script", () => {
    expect(completeWith(DICT, "")).toEqual([]);
    expect(completeWith(DICT, "   ")).toEqual([]);
  });
});

describe("completeWith — the caesura grammar must survive it", () => {
  // The chip token is dashes, and the word class deliberately excludes them.
  // If a `--` ever looked like a partial word, the editor would offer to
  // complete a caesura into a word and FT-11's grammar would be corrupted.
  it("never treats a caesura token as a word to complete", () => {
    expect(completeWith(DICT, "hello --")).toEqual([]);
    expect(completeWith(DICT, "hello --2.5")).toEqual([]);
  });

  it("still completes the word after a caesura", () => {
    expect(completeWith(DICT, "hello -- thr")).toEqual(["ough"]);
  });
});

describe("completeWith — no table", () => {
  it("yields nothing rather than throwing", () => {
    expect(completeWith(null, "th")).toEqual([]);
  });
});

describe("complete — the locale-aware seam", () => {
  it("yields nothing on the first call for a cold locale, then works", async () => {
    // Synchronous by contract: it cannot await a chunk mid-keystroke. The first
    // call warms the table; by the next one the suggestion is there.
    expect(complete("th", "en")).toEqual([]);
    await loadDict("en");
    expect(complete("th", "en").length).toBe(1);
  });

  it("yields nothing for a locale we ship no table for", async () => {
    expect(await loadDict("kl-GL")).toBeNull();
    expect(complete("th", "kl-GL")).toEqual([]);
  });
});

describe("the shipped tables are actually usable", () => {
  // Guards the pipeline's OUTPUT, not its code. A table can parse, load and
  // index and still be useless — dict-lint proves it is well-formed, this
  // proves it completes real prose in the language it claims to be.
  it("completes common English words and phrases", async () => {
    await loadDict("en");
    for (const stem of ["th", "wh", "peo", "bec"]) {
      expect(complete(stem, "en"), `no completion for "${stem}"`).toHaveLength(1);
    }
  });

  it("completes a language that is not English", async () => {
    await loadDict("pl");
    // Polish is the table that had to be rebuilt from scratch for licensing.
    expect(complete("dzie", "pl")).toHaveLength(1);
    expect(complete("prz", "pl")).toHaveLength(1);
  });

  it("keeps each locale's suggestions in its own language", async () => {
    await Promise.all([loadDict("en"), loadDict("ru")]);
    const [ru] = complete("чт", "ru");
    expect(ru, "Russian table returned nothing for a common Cyrillic stem").toBeTruthy();
    expect(ru).toMatch(/^[\p{L}\p{M}' ]+$/u);
    // The English table has no Cyrillic in it at all.
    expect(complete("чт", "en")).toEqual([]);
  });
});
