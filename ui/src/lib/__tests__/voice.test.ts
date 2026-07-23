import { describe, expect, it } from "vitest";

import type { Caesura } from "../caesura";
import {
  nextCaesuraPos,
  voiceCommandToControl,
  VOICE_COMMAND_IDS,
  VOICE_COMMAND_LABEL,
} from "../voice";

const caesuras = (positions: number[]): Caesura[] =>
  positions.map((pos) => ({ pos, width: 2, dur: 0.75 }));

describe("nextCaesuraPos", () => {
  it("returns the first caesura strictly after the offset", () => {
    const cs = caesuras([10, 30, 50]);
    expect(nextCaesuraPos(cs, 0)).toBe(10);
    expect(nextCaesuraPos(cs, 29)).toBe(30);
    expect(nextCaesuraPos(cs, 30)).toBe(50);
  });

  it("does not match a caesura the scroll is sitting exactly on", () => {
    // "next pause" said while already on a pause must advance, not re-fire it.
    expect(nextCaesuraPos(caesuras([10, 30]), 10)).toBe(30);
  });

  it("returns null past the last caesura or with none", () => {
    expect(nextCaesuraPos(caesuras([10]), 20)).toBeNull();
    expect(nextCaesuraPos([], 0)).toBeNull();
  });
});

describe("voice command table", () => {
  it("labels every bindable command", () => {
    for (const id of VOICE_COMMAND_IDS) {
      expect(VOICE_COMMAND_LABEL[id]).toBeTruthy();
    }
  });
});

describe("voiceCommandToControl", () => {
  const noCaesuras = { caesuras: [], offset: 0 };

  it("maps a simple command to its transport action", () => {
    expect(voiceCommandToControl("play", noCaesuras)).toEqual({ action: "play" });
    expect(voiceCommandToControl("slower", noCaesuras)).toEqual({ action: "slower" });
    expect(voiceCommandToControl("top", noCaesuras)).toEqual({ action: "top" });
  });

  it("maps 'next pause' to a seek at the next caesura", () => {
    const ctx = { caesuras: caesuras([10, 30]), offset: 0 };
    expect(voiceCommandToControl("nextMarker", ctx)).toEqual({ action: "seek", value: 10 });
  });

  it("returns null for 'next pause' with none ahead, and for an unknown id", () => {
    expect(
      voiceCommandToControl("nextMarker", { caesuras: caesuras([10]), offset: 20 }),
    ).toBeNull();
    expect(voiceCommandToControl("format-c", noCaesuras)).toBeNull();
  });
});
