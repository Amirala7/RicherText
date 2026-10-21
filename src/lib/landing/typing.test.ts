import { describe, expect, it } from "vitest";
import {
  HEADLINE,
  KEY_ROWS,
  ROTATION,
  charKeys,
  charsToLine,
  codeToKeyId,
  lineToChars,
  rememberLine,
  renderChars,
} from "./typing";

// The hero's typed line and keyboard (ADR 0021, DESIGN.md §4 Hero).
describe("hero copy", () => {
  it("rests on the approved headline, then rotates three lines", () => {
    expect(HEADLINE).toBe("Rich text, minus the clutter.");
    expect(ROTATION.map((l) => l.map(([t]) => t).join(""))).toEqual([
      "Draft the proposal.",
      "Never lose a sentence.",
      "Paste it anywhere, intact.",
    ]);
  });

  it("formats one word in each rotating line with B, I or U", () => {
    const marks = ROTATION.map((l) =>
      l.filter(([, m]) => m).map(([t, m]) => [t, m]),
    );
    expect(marks).toEqual([
      [["proposal", "b"]],
      [["Never", "i"]],
      [["anywhere", "u"]],
    ]);
  });
});

describe("keyboard", () => {
  it("is a Mac layout with five rows, return as the accent key", () => {
    expect(KEY_ROWS).toHaveLength(5);
    const ret = KEY_ROWS.flat().find((k) => k.id === "return");
    expect(ret?.accent).toBe(true);
    expect(KEY_ROWS.flat().filter((k) => k.accent)).toHaveLength(1);
  });

  it("gives every key a unique id", () => {
    const ids = KEY_ROWS.flat().map((k) => k.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("presses shift for capitals and shifted symbols", () => {
    expect(charKeys("a")).toEqual(["a"]);
    expect(charKeys("A")).toEqual(["shiftl", "a"]);
    expect(charKeys("?")).toEqual(["shiftl", "/"]);
    expect(charKeys(" ")).toEqual(["space"]);
    expect(charKeys(",")).toEqual([","]);
  });

  it("maps physical key codes to keycaps", () => {
    expect(codeToKeyId("KeyQ")).toBe("q");
    expect(codeToKeyId("Digit7")).toBe("7");
    expect(codeToKeyId("Backspace")).toBe("delete");
    expect(codeToKeyId("MetaLeft")).toBe("cmdl");
    expect(codeToKeyId("Enter")).toBe("return");
    expect(codeToKeyId("F13")).toBeUndefined();
  });
});

describe("typed line", () => {
  it("renders runs of the same mark in one tag and escapes text", () => {
    const chars = lineToChars([
      ["a <b> & ", ""],
      ["bold", "b"],
      ["!", ""],
    ]);
    expect(renderChars(chars)).toBe("a &lt;b&gt; &amp; <b>bold</b>!");
  });

  it("turns typed characters back into a line, or null when blank", () => {
    const chars = lineToChars([
      ["Hi ", ""],
      ["there", "i"],
    ]);
    expect(charsToLine(chars)).toEqual([
      ["Hi ", ""],
      ["there", "i"],
    ]);
    expect(charsToLine(lineToChars([["   ", ""]]))).toBeNull();
    expect(charsToLine([])).toBeNull();
  });

  it("keeps the visitor's last three lines, without repeats", () => {
    const line = (t: string) => [[t, ""]] as [string, ""][];
    let queue = rememberLine([], line("one"));
    queue = rememberLine(queue, line("two"));
    queue = rememberLine(queue, line("one"));
    expect(queue).toEqual([line("two"), line("one")]);
    queue = rememberLine(queue, line("three"));
    queue = rememberLine(queue, line("four"));
    expect(queue).toEqual([line("one"), line("three"), line("four")]);
  });
});
