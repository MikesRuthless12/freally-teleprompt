import { describe, expect, it } from "vitest";

import { adjacentMarker, currentMarker, isMarkerLine, markerName, markers } from "../markers";
import { sections } from "../rehearsal";

/** Section markers with jump-to (FT-M05). */
describe("markers", () => {
  it("finds `#` headings with no configuration at all", () => {
    const script = "# Verse 1\nlyrics here\n# Q&A\nquestions";
    expect(markers(script).map((m) => m.name)).toEqual(["Verse 1", "Q&A"]);
  });

  it("finds skip labels too, so a lyric sheet needs no new syntax", () => {
    const script = "[Verse 1]\nwords\nChorus\nmore words";
    expect(markers(script, ["Verse", "Chorus"]).map((m) => m.name)).toEqual(["Verse 1", "Chorus"]);
  });

  /** The offset is the start of the marker's OWN line, so jumping to Chorus
   * puts the word Chorus on the reading guide. */
  it("reports offsets in visible characters, newlines excluded", () => {
    // "abc" = 3 visible chars, then the marker line starts at 3.
    const found = markers("abc\n# Two\nxy");
    expect(found[0].offset).toBe(3);
    // And the marker's own line is 5 visible chars ("# Two"), so anything
    // measured after it starts at 8 — the same unit `seek` takes.
    expect(markers("abc\n# Two\n# Three")[1].offset).toBe(8);
  });

  it("names a marker without its decoration", () => {
    expect(markerName("## Bridge")).toBe("Bridge");
    expect(markerName("[Verse 2]")).toBe("Verse 2");
    expect(markerName("  # Q&A  ")).toBe("Q&A");
    expect(markerName("Chorus:")).toBe("Chorus");
    // Stripping must never leave nothing to click on.
    expect(markerName("###")).toBe("###");
    expect(markerName("[]")).toBe("[]");
  });

  /** A `#` mid-line is a hashtag, not a landmark — the whole reason the test
   * is on the first non-space character rather than on "contains a #". */
  it("only treats a leading hash as a heading", () => {
    expect(isMarkerLine("# Verse", [])).toBe(true);
    expect(isMarkerLine("   # Verse", [])).toBe(true);
    expect(isMarkerLine("meet me at #4", [])).toBe(false);
    expect(isMarkerLine("ordinary lyric", [])).toBe(false);
  });

  describe("next and previous", () => {
    const list = markers("# One\naaa\n# Two\nbbb\n# Three");

    it("goes forward to the next marker after the read", () => {
      expect(adjacentMarker(list, 0, 1)?.name).toBe("Two");
      expect(adjacentMarker(list, list[1].offset, 1)?.name).toBe("Three");
    });

    /** Previous means "the top of what I am in", not "the marker just behind
     * me" — a third of the way into the chorus, Previous takes you to the top
     * of the chorus, and pressing it again to the verse before. */
    it("goes back to the top of what the read is inside, then past it", () => {
      // Inside Two: back to the top of Two, not past it to One.
      expect(adjacentMarker(list, list[1].offset + 2, -1)?.name).toBe("Two");
      // Already at the top of Two: now it goes to One. Two presses, two
      // different answers — which is what a previous-track button does.
      expect(adjacentMarker(list, list[1].offset, -1)?.name).toBe("One");
    });

    /** Null rather than a jump to the top: "previous" at the start of a script
     * has no answer, and inventing one moves the scroll under the operator. */
    it("has nowhere to go at either end", () => {
      expect(adjacentMarker(list, 0, -1)).toBeNull();
      expect(adjacentMarker(list, list[2].offset, 1)).toBeNull();
      expect(adjacentMarker([], 5, 1)).toBeNull();
    });

    it("says which marker the read is currently inside", () => {
      expect(currentMarker(list, 0)?.name).toBe("One");
      expect(currentMarker(list, list[2].offset + 1)?.name).toBe("Three");
      // Above the first marker there is no answer, and null says so.
      expect(currentMarker(markers("intro\n# One"), 0)).toBeNull();
    });
  });

  /**
   * The point of building this over `isMarkerLine` rather than a parser of its
   * own: the jump list and the rehearsal report must agree about where a
   * section starts, or the report names rows the operator cannot jump to.
   */
  it("agrees with the rehearsal report's section boundaries", () => {
    const script = "# Verse 1\naaa\nbbb\n# Chorus\nccc";
    const jumpTo = markers(script);
    const rows = sections(script);
    expect(rows.map((r) => r.label)).toEqual(jumpTo.map((m) => m.name));
    // A section starts one marker-line later than the marker itself — the
    // line names the section and belongs to neither side of it.
    expect(rows[0].start).toBe(jumpTo[0].offset + "# Verse 1".length);
  });
});
