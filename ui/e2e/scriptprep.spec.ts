import { expect, test, type Page } from "@playwright/test";

import { ipcCalls, lastCall, mockTauri, waitForShell } from "./mock-ipc";

/**
 * The script-preparation Must-Haves — FT-M01 import, FT-M03 statistics,
 * FT-M05 section markers, FT-M07 find & replace.
 *
 * The logic under all four is unit-tested without a DOM (`import.rs`'s own
 * suite for the five parsers, and `stats.test.ts` / `markers.test.ts` /
 * `find.test.ts` for the rest). What is checked HERE is the half a unit test
 * cannot reach: that the controls exist, that they are wired to the engine and
 * to the editor's undo stack, and that a replacement lands in the script rather
 * than only in a function's return value.
 */

const SHOTS = "e2e/screenshots";

/** The app shell has booted and the engine's script has arrived. */
/** The editor's text as the ENGINE has it — the script that would be saved,
 * not the DOM's rendering of it. The two differ: a caesura is a chip and the
 * find highlight is a span, so reading `textContent` would assert the pill
 * glyph and the markup rather than the script. */
async function engineScript(page: Page): Promise<string> {
  const calls = await ipcCalls(page);
  const writes = calls.filter((call) => call.cmd === "teleprompter_set_script");
  return writes.length > 0 ? String(writes[writes.length - 1].args.text ?? "") : "";
}

// ---------------------------------------------------------------------------
// FT-M03 — script statistics
// ---------------------------------------------------------------------------

test.describe("FT-M03 script statistics", () => {
  test("counts words and characters beside the read time", async ({ page }) => {
    await mockTauri(page, { script: "one two three\nfour" });
    await page.goto("/");
    await waitForShell(page);

    await expect(page.getByTestId("script-stats")).toContainText("4 words");
    await expect(page.getByTestId("script-stats")).toContainText("17 characters");
  });

  /** The counts are of what is PERFORMED. A count that included the labels the
   * duration beside it ignores would put two numbers about the same script,
   * on the same line, disagreeing with each other. */
  test("does not count a caesura as a word", async ({ page }) => {
    await mockTauri(page, { script: "hold -- on" });
    await page.goto("/");
    await waitForShell(page);

    await expect(page.getByTestId("script-stats")).toContainText("2 words");
  });

  test("warns about a very long line, and only then", async ({ page }) => {
    await mockTauri(page, { script: "a short line" });
    await page.goto("/");
    await waitForShell(page);
    await expect(page.getByTestId("stats-long-line")).toHaveCount(0);

    // A paste out of a word processor puts a whole paragraph on one line.
    await mockTauri(page, { script: `${"word ".repeat(60)}end` });
    await page.goto("/");
    await waitForShell(page);
    await expect(page.getByTestId("stats-long-line")).toBeVisible();
    await expect(page.getByTestId("stats-long-line")).toContainText("Line 1");
  });

  test("updates as the script is edited", async ({ page }) => {
    await mockTauri(page, { script: "one" });
    await page.goto("/");
    await waitForShell(page);
    await expect(page.getByTestId("script-stats")).toContainText("1 words");

    const editor = page.getByTestId("caesura-editor");
    await editor.click();
    await page.keyboard.press("End");
    await page.keyboard.type(" two");
    await expect(page.getByTestId("script-stats")).toContainText("2 words");
  });
});

// ---------------------------------------------------------------------------
// FT-M05 — section markers with jump-to
// ---------------------------------------------------------------------------

test.describe("FT-M05 section markers", () => {
  test("stays out of the way until the script has a marker", async ({ page }) => {
    await mockTauri(page, { script: "no markers here\njust lyrics" });
    await page.goto("/");
    await waitForShell(page);

    await expect(page.getByTestId("marker-jump")).toHaveCount(0);
    await expect(page.getByTestId("seek-marker")).toHaveCount(0);
  });

  test("lists `#` headings with no configuration at all", async ({ page }) => {
    await mockTauri(page, { script: "# Verse 1\nwords here\n# Q&A\nmore words" });
    await page.goto("/");
    await waitForShell(page);

    const list = page.getByTestId("marker-list");
    await expect(list).toBeVisible();
    await expect(list.locator("option")).toHaveText(["Verse 1", "Q&A"]);
    // And each one is ruled onto the seek bar.
    await expect(page.getByTestId("seek-marker")).toHaveCount(2);
  });

  /** The jump is a SEEK, in the engine's own visible-character unit — so the
   * projector and the LAN mirror follow it like every other move. */
  test("jumping seeks the shared engine to the marker's own line", async ({ page }) => {
    await mockTauri(page, { script: "# Verse 1\nwords here\n# Chorus\nmore words" });
    await page.goto("/");
    await waitForShell(page);

    await page.getByTestId("marker-list").selectOption({ label: "Chorus" });
    const seek = await lastCall(page, "teleprompter_control");
    expect(seek?.action).toBe("seek");
    // "# Verse 1" (9) + "words here" (10) — newlines are not visible chars.
    expect(seek?.value).toBe(19);
  });

  test("next and previous walk the markers", async ({ page }) => {
    await mockTauri(page, { script: "# One\naaa\n# Two\nbbb\n# Three" });
    await page.goto("/");
    await waitForShell(page);

    // At the top there is nothing behind, and the control says so rather than
    // silently doing nothing.
    await expect(page.getByTestId("marker-previous")).toBeDisabled();
    await page.getByTestId("marker-next").click();
    // "# One" (5) + "aaa" (3) — the start of the `# Two` line itself, so the
    // marker lands on the reading guide rather than just above it.
    expect((await lastCall(page, "teleprompter_control"))?.value).toBe(8);
  });

  /**
   * ⚠️ "Next" is relative to where the read is NOW, not to where it started.
   *
   * `state.offset` is an ANCHOR: the engine broadcasts on events and never on a
   * timer, so during a read it holds the offset play began at while every
   * surface animates locally from it. The first version of these controls read
   * it directly, and this case is what it looks like — pressing Next a minute
   * into a script jumped to the marker after the one you pressed play on.
   *
   * Proven red against that version: it seeks to 9 (the second marker) instead
   * of 164 (the third), because from a stale offset of 0 the second marker is
   * still ahead.
   */
  test("next is relative to where the read is now, not where it started", async ({ page }) => {
    // Markers at visible-char 0, 9 and 164. At the default 12 characters a
    // second the read is past the second one within a second and nowhere near
    // the third for another twelve, so the window this asserts in is wide.
    await mockTauri(page, {
      script: `# One\naaaa\n# Two\n${"b".repeat(150)}\n# Three`,
      playing: true,
    });
    await page.goto("/");
    await waitForShell(page);

    await page.waitForTimeout(1500);
    await page.getByTestId("marker-next").click();
    expect((await lastCall(page, "teleprompter_control"))?.value).toBe(164);
  });

  /** A skip label is already a landmark on a lyric sheet, and FT-M02 already
   * knows how to recognise one — so a marker list needs no new syntax for it. */
  test("treats a configured skip label as a marker too", async ({ page }) => {
    await mockTauri(page, {
      script: "[Verse 1]\nwords\nChorus\nmore",
      skipWords: ["Verse", "Chorus"],
    });
    await page.goto("/");
    await waitForShell(page);

    await expect(page.getByTestId("marker-list").locator("option")).toHaveText([
      "Verse 1",
      "Chorus",
    ]);
  });

  test("looks right", async ({ page }) => {
    await mockTauri(page, {
      script: "# Verse 1\nI woke up this morning\n# Chorus\nhold me closer",
    });
    await page.goto("/");
    await waitForShell(page);
    await expect(page.getByTestId("marker-jump")).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/markers.png` });
  });
});

// ---------------------------------------------------------------------------
// FT-M07 — find & replace
// ---------------------------------------------------------------------------

test.describe("FT-M07 find and replace", () => {
  /** Open the dialog and search for `query`. */
  async function search(page: Page, query: string) {
    await page.getByTestId("toolbar-find").click();
    await expect(page.getByTestId("find-replace")).toBeVisible();
    await page.getByTestId("find-query").fill(query);
  }

  test("counts matches as they are typed", async ({ page }) => {
    await mockTauri(page, { script: "cat sat on the cat mat" });
    await page.goto("/");
    await waitForShell(page);

    await search(page, "cat");
    await expect(page.getByTestId("find-count")).toHaveText("1 of 2");
    await page.getByTestId("find-next").click();
    await expect(page.getByTestId("find-count")).toHaveText("2 of 2");
    // Wrapping, rather than stopping and making the operator work out where
    // they are before they can carry on.
    await page.getByTestId("find-next").click();
    await expect(page.getByTestId("find-count")).toHaveText("1 of 2");
  });

  test("says so when there is nothing to find", async ({ page }) => {
    await mockTauri(page, { script: "cat sat" });
    await page.goto("/");
    await waitForShell(page);

    await search(page, "dog");
    await expect(page.getByTestId("find-count")).toHaveText("No matches");
    await expect(page.getByTestId("find-next")).toBeDisabled();
    await expect(page.getByTestId("find-replace-all")).toBeDisabled();
  });

  test("honours match case and whole words", async ({ page }) => {
    await mockTauri(page, { script: "Cat cat cats" });
    await page.goto("/");
    await waitForShell(page);

    await search(page, "cat");
    await expect(page.getByTestId("find-count")).toHaveText("1 of 3");
    await page.getByTestId("find-case").check();
    await expect(page.getByTestId("find-count")).toHaveText("1 of 2");
    await page.getByTestId("find-whole-word").check();
    await expect(page.getByTestId("find-count")).toHaveText("1 of 1");
  });

  /**
   * ⚠️ The trap this whole design is built around: showing the match by
   * SELECTING it moves focus into the contenteditable in Blink, which would
   * take the operator's typing out of the field they are typing in on every
   * press of Next. The editor paints the range instead.
   */
  test("shows the match without taking focus out of the search field", async ({ page }) => {
    await mockTauri(page, { script: "one target two target three" });
    await page.goto("/");
    await waitForShell(page);

    await search(page, "target");
    await expect(page.getByTestId("caesura-editor").locator("[data-find]")).toHaveText("target");
    await page.getByTestId("find-next").click();
    await expect(page.getByTestId("find-count")).toHaveText("2 of 2");
    // Still exactly one match lit...
    await expect(page.getByTestId("caesura-editor").locator("[data-find]")).toHaveCount(1);
    // ...and focus is still in the DIALOG. Asserting it is on the search field
    // would be asserting the wrong thing — clicking Next legitimately focuses
    // the button. What must never happen is focus landing in the EDITOR, which
    // is what selecting the match would do, and which would send the next
    // thing the operator types into their script instead of into the search.
    await expect(page.getByTestId("caesura-editor")).not.toBeFocused();
    await expect(page.getByTestId("find-replace")).toContainText("target");
  });

  test("the highlight goes when the dialog does", async ({ page }) => {
    await mockTauri(page, { script: "one target two" });
    await page.goto("/");
    await waitForShell(page);

    await search(page, "target");
    await expect(page.getByTestId("caesura-editor").locator("[data-find]")).toHaveCount(1);
    await page.getByTestId("find-replace").getByRole("button", { name: "Close" }).click();
    await expect(page.getByTestId("caesura-editor").locator("[data-find]")).toHaveCount(0);
  });

  test("replaces one match, and the script reaches the engine", async ({ page }) => {
    await mockTauri(page, { script: "cat sat on the cat mat" });
    await page.goto("/");
    await waitForShell(page);

    await search(page, "cat");
    await page.getByTestId("find-replacement").fill("dog");
    await page.getByTestId("find-replace-one").click();

    await expect.poll(() => engineScript(page)).toBe("dog sat on the cat mat");
    // One left, and the cursor stayed on the same ORDINAL — which after a
    // replacement is the NEXT match, already under it. Advancing as well would
    // step over a match without ever showing it.
    await expect(page.getByTestId("find-count")).toHaveText("1 of 1");
  });

  test("replaces every match in one step", async ({ page }) => {
    await mockTauri(page, { script: "cat sat on the cat mat" });
    await page.goto("/");
    await waitForShell(page);

    await search(page, "cat");
    await page.getByTestId("find-replacement").fill("dog");
    await page.getByTestId("find-replace-all").click();

    await expect(page.getByTestId("find-count")).toHaveText("Replaced 2");
    await expect.poll(() => engineScript(page)).toBe("dog sat on the dog mat");
  });

  /**
   * A replacement is ONE step of undo, not a hole in the stack. That is the
   * lesson dictation paid for: a new write path has to re-earn every guard the
   * old ones have, and going around `snapshot()` is how the first Ctrl+Z after
   * an edit throws away far more than the edit.
   */
  test("a replace-all is undone in one step", async ({ page }) => {
    await mockTauri(page, { script: "cat sat on the cat mat" });
    await page.goto("/");
    await waitForShell(page);

    await search(page, "cat");
    await page.getByTestId("find-replacement").fill("dog");
    await page.getByTestId("find-replace-all").click();
    await expect.poll(() => engineScript(page)).toBe("dog sat on the dog mat");

    await page.getByTestId("find-replace").getByRole("button", { name: "Close" }).click();
    await page.getByTestId("caesura-editor").click();
    await page.keyboard.press("Control+z");
    await expect.poll(() => engineScript(page)).toBe("cat sat on the cat mat");
  });

  /**
   * ⚠️ Proven red: Replace deliberately stayed on the same ORDINAL, which only
   * reads correctly while the replacement does not itself match. Replace "the"
   * with "there" and ordinal `at` is the SAME occurrence again — three presses
   * turned one word into "therere" while the other two sat untouched, and the
   * count read "1 of 3" throughout.
   */
  test("replacing with text that contains the query still walks the matches", async ({ page }) => {
    await mockTauri(page, { script: "the cat and the dog and the bird" });
    await page.goto("/");
    await waitForShell(page);

    await search(page, "the");
    await page.getByTestId("find-replacement").fill("there");
    await expect(page.getByTestId("find-count")).toHaveText("1 of 3");

    await page.getByTestId("find-replace-one").click();
    await page.getByTestId("find-replace-one").click();
    await page.getByTestId("find-replace-one").click();

    await expect.poll(() => engineScript(page)).toBe("there cat and there dog and there bird");
  });

  /**
   * ⚠️ The same property with the matches ADJACENT, which is what made the
   * first version of this test vacuous.
   *
   * `the cat and the dog…` spaces the hits far enough apart that resolving the
   * resume point against the pre-edit offsets lands on the right match anyway.
   * With `the the the` it does not: the anchor was measured against the stale
   * match list, the second occurrence was silently stepped over, and pressing
   * Replace three times left one untouched.
   */
  test("replacing adjacent matches leaves none behind", async ({ page }) => {
    await mockTauri(page, { script: "the the the" });
    await page.goto("/");
    await waitForShell(page);

    await search(page, "the");
    await page.getByTestId("find-replacement").fill("there");
    await expect(page.getByTestId("find-count")).toHaveText("1 of 3");

    await page.getByTestId("find-replace-one").click();
    await expect.poll(() => engineScript(page)).toBe("there the the");
    await page.getByTestId("find-replace-one").click();
    await expect.poll(() => engineScript(page)).toBe("there there the");
    await page.getByTestId("find-replace-one").click();
    await expect.poll(() => engineScript(page)).toBe("there there there");
  });

  /** ⚠️ An anchor left over from a replacement must not steer the NEXT search:
   * it opened partway down the script reading "2 of 2" instead of at the top. */
  test("a replacement does not move where the next search starts", async ({ page }) => {
    await mockTauri(page, { script: "the cat XYZ and the dog" });
    await page.goto("/");
    await waitForShell(page);

    await search(page, "XYZ");
    await page.getByTestId("find-replacement").fill("");
    await page.getByTestId("find-replace-one").click();

    // The dialog is already open, so type the new query straight into it
    // rather than going through `search`, which would click Find again.
    await page.getByTestId("find-query").fill("the");
    await expect(page.getByTestId("find-count")).toHaveText("1 of 2");
  });

  test("Ctrl+F opens it", async ({ page }) => {
    await mockTauri(page, { script: "anything" });
    await page.goto("/");
    await waitForShell(page);

    await expect(page.getByTestId("find-replace")).toHaveCount(0);
    await page.keyboard.press("Control+f");
    await expect(page.getByTestId("find-replace")).toBeVisible();
  });

  test("looks right", async ({ page }) => {
    await mockTauri(page, { script: "one target two target three" });
    await page.goto("/");
    await waitForShell(page);
    await search(page, "target");
    await page.getByTestId("find-replacement").fill("mark");
    await page.screenshot({ path: `${SHOTS}/find-replace.png` });
  });
});

// ---------------------------------------------------------------------------
// FT-M01 — document import
// ---------------------------------------------------------------------------

test.describe("FT-M01 document import", () => {
  const RESULT = {
    text: "# Verse 1\nI woke up this morning\n\n# Chorus\nhold me closer now",
    suggestedName: "Take 3",
    report: {
      format: "docx",
      chars: 58,
      paragraphs: 2,
      dropped: [
        { kind: "images", count: 2 },
        { kind: "footnotes", count: 1 },
      ],
      truncated: false,
      itemised: true,
    },
  };

  test("shows the report and what was dropped before anything is saved", async ({ page }) => {
    await mockTauri(page, { importPick: "/tmp/Take 3.docx", importResult: RESULT });
    await page.goto("/");
    await waitForShell(page);

    await page.getByTestId("toolbar-import").click();
    await page.getByTestId("import-choose").click();

    const report = page.getByTestId("import-report");
    await expect(report).toContainText("Word document");
    await expect(report).toContainText("58 characters");
    await expect(report).toContainText("Pictures left out: 2");
    await expect(report).toContainText("Footnotes left out: 1");
    await expect(report).toContainText("flattened");

    // ⚠️ NOTHING has been written yet. An import that saved first and asked
    // afterwards would be a way to fill somebody's library by mis-clicking a
    // file chooser.
    const calls = await ipcCalls(page);
    expect(calls.filter((c) => c.cmd === "scripts_create")).toHaveLength(0);
    expect(calls.filter((c) => c.cmd === "scripts_save")).toHaveLength(0);
  });

  test("creates, writes and opens the script only on confirm", async ({ page }) => {
    await mockTauri(page, { importPick: "/tmp/Take 3.docx", importResult: RESULT });
    await page.goto("/");
    await waitForShell(page);

    await page.getByTestId("toolbar-import").click();
    await page.getByTestId("import-choose").click();
    // The name is suggested from the file's own stem, already legal.
    await expect(page.getByTestId("import-name")).toHaveValue("Take 3");
    await page.getByTestId("import-confirm").click();

    await expect(page.getByTestId("import-document")).toHaveCount(0);
    const calls = await ipcCalls(page);
    const save = calls.find((c) => c.cmd === "scripts_save");
    expect(save?.args.name).toBe("Take 3");
    expect(save?.args.text).toBe(RESULT.text);
    expect(calls.find((c) => c.cmd === "scripts_open")?.args.name).toBe("Take 3");
  });

  /** An import must never be a silent way to erase yesterday's take, so the
   * library's own refusal is surfaced rather than swallowed. */
  test("refuses to overwrite a script that already exists", async ({ page }) => {
    await mockTauri(page, {
      importPick: "/tmp/Take 3.docx",
      importResult: RESULT,
      scripts: [{ name: "Take 3", bytes: 10, modifiedMs: 1 }],
    });
    await page.goto("/");
    await waitForShell(page);

    await page.getByTestId("toolbar-import").click();
    await page.getByTestId("import-choose").click();
    await page.getByTestId("import-confirm").click();

    await expect(page.getByRole("alert")).toContainText("already exists");
    // The dialog stays open, with the name field ready to be changed.
    await expect(page.getByTestId("import-document")).toBeVisible();
  });

  test("a cancelled file chooser changes nothing", async ({ page }) => {
    await mockTauri(page, { importResult: RESULT });
    await page.goto("/");
    await waitForShell(page);

    await page.getByTestId("toolbar-import").click();
    await page.getByTestId("import-choose").click();

    await expect(page.getByTestId("import-report")).toHaveCount(0);
    await expect(page.getByRole("alert")).toHaveCount(0);
    await expect(page.getByTestId("import-confirm")).toBeDisabled();
  });

  test("surfaces a failed import instead of a blank dialog", async ({ page }) => {
    // No `importResult`, so `import_document` rejects — which is what a
    // malformed document, or a killed importer child, looks like from here.
    await mockTauri(page, { importPick: "/tmp/broken.pdf" });
    await page.goto("/");
    await waitForShell(page);

    await page.getByTestId("toolbar-import").click();
    await page.getByTestId("import-choose").click();

    await expect(page.getByRole("alert")).toContainText("could not be read");
    await expect(page.getByTestId("import-confirm")).toBeDisabled();
  });

  test("says when the document was too long to fit", async ({ page }) => {
    await mockTauri(page, {
      importPick: "/tmp/huge.pdf",
      importResult: { ...RESULT, report: { ...RESULT.report, truncated: true, dropped: [] } },
    });
    await page.goto("/");
    await waitForShell(page);

    await page.getByTestId("toolbar-import").click();
    await page.getByTestId("import-choose").click();

    await expect(page.getByRole("alert")).toContainText("cut short");
    await expect(page.getByTestId("import-report")).toContainText("Nothing else was left behind");
  });

  /** ⚠️ Proven red: `create` succeeded and `save` failed, leaving an empty
   * script in the library under the operator's chosen name — so retrying under
   * that name then failed with "already exists" and the import could not be
   * completed without deleting the stub by hand. */
  test("a failed save takes back the script it created", async ({ page }) => {
    await mockTauri(page, {
      importPick: "/tmp/Take 3.docx",
      importResult: RESULT,
      saveFails: true,
    });
    await page.goto("/");
    await waitForShell(page);

    await page.getByTestId("toolbar-import").click();
    await page.getByTestId("import-choose").click();
    await page.getByTestId("import-confirm").click();

    // The real error is shown, not the rollback's.
    await expect(page.getByRole("alert")).toContainText("read-only");
    const calls = await ipcCalls(page);
    expect(calls.filter((c) => c.cmd === "scripts_create")).toHaveLength(1);
    expect(calls.find((c) => c.cmd === "scripts_delete")?.args.name).toBe("Take 3");
    // And nothing was opened, so the operator's current script is untouched.
    expect(calls.filter((c) => c.cmd === "scripts_open")).toHaveLength(0);
  });

  /**
   * ⚠️ The other side of that rollback, and the reason its `.catch` sits on the
   * SAVE rather than after the open: a failure to OPEN a script whose bytes
   * were written perfectly well — a sync client holding the file for a moment
   * is enough — used to delete the import that had just succeeded, and the
   * whole forty-page document had to be imported again.
   */
  test("a failed open does not delete the script it just wrote", async ({ page }) => {
    await mockTauri(page, {
      importPick: "/tmp/Take 3.docx",
      importResult: RESULT,
      openFails: true,
    });
    await page.goto("/");
    await waitForShell(page);

    await page.getByTestId("toolbar-import").click();
    await page.getByTestId("import-choose").click();
    await page.getByTestId("import-confirm").click();

    await expect(page.getByRole("alert")).toContainText("locked");
    const calls = await ipcCalls(page);
    expect(calls.filter((c) => c.cmd === "scripts_save")).toHaveLength(1);
    expect(
      calls.filter((c) => c.cmd === "scripts_delete"),
      "the bytes are on disk — nothing after that may remove them",
    ).toHaveLength(0);
  });

  /** ⚠️ Proven red: an import can take up to ninety seconds, and its promise
   * had no staleness guard — so a slow document resolving after the dialog was
   * closed and pointed at another file swapped the report, the preview AND the
   * name field under the operator's hand. */
  test("a slow import that lands after a reopen is ignored", async ({ page }) => {
    await mockTauri(page, {
      importPick: "/tmp/slow.pdf",
      importDelayMs: 1500,
      importResult: { ...RESULT, suggestedName: "slow", text: "the SLOW document" },
    });
    await page.goto("/");
    await waitForShell(page);

    await page.getByTestId("toolbar-import").click();
    await page.getByTestId("import-choose").click();
    // Close before it resolves, then reopen — the reopen bumps the token.
    await page.getByTestId("import-cancel").click();
    await page.getByTestId("toolbar-import").click();

    // Wait past the slow import's landing.
    await page.waitForTimeout(2200);
    await expect(page.getByTestId("import-report")).toHaveCount(0);
    await expect(page.getByTestId("import-confirm")).toBeDisabled();
  });

  /** A PDF has no structure to enumerate, so an empty drop list means "could
   * not tell" — saying "nothing was left behind" was a false reassurance on the
   * format most likely to be carrying figures. */
  test("a PDF says its contents cannot be listed", async ({ page }) => {
    await mockTauri(page, {
      importPick: "/tmp/script.pdf",
      importResult: {
        ...RESULT,
        report: { ...RESULT.report, format: "pdf", dropped: [], itemised: false },
      },
    });
    await page.goto("/");
    await waitForShell(page);

    await page.getByTestId("toolbar-import").click();
    await page.getByTestId("import-choose").click();

    const report = page.getByTestId("import-report");
    await expect(report).toContainText("cannot be listed");
    await expect(report).not.toContainText("Nothing else was left behind");
  });

  test("looks right", async ({ page }) => {
    await mockTauri(page, { importPick: "/tmp/Take 3.docx", importResult: RESULT });
    await page.goto("/");
    await waitForShell(page);
    await page.getByTestId("toolbar-import").click();
    await page.getByTestId("import-choose").click();
    await expect(page.getByTestId("import-report")).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/import.png` });
  });
});
