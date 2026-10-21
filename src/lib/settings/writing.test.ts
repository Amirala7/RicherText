import { describe, expect, it } from "vitest";
import { WRITING_FONTS, fontLabel, writingFont } from "./writing";

// Writing font (ADR 0010, 0031): a per-user display setting, Geist by default,
// IBM Plex Serif offered; not stored in documents.
describe("writing font", () => {
  it("offers Geist and IBM Plex Serif, Geist first", () => {
    expect(WRITING_FONTS.map((f) => [f.id, f.label])).toEqual([
      ["geist", "Geist"],
      ["plex-serif", "IBM Plex Serif"],
    ]);
  });

  it("reads a stored font, falling back to Geist", () => {
    expect(writingFont("plex-serif")).toBe("plex-serif");
    expect(writingFont("geist")).toBe("geist");
    expect(writingFont(undefined)).toBe("geist");
    expect(writingFont("comic-sans")).toBe("geist");
  });

  it("names each font", () => {
    expect(fontLabel("plex-serif")).toBe("IBM Plex Serif");
    expect(fontLabel("geist")).toBe("Geist");
  });
});
