import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// The scrim behind dialogs (DESIGN.md §3 "New tokens", ADR 0016).
const css = readFileSync(join(__dirname, "globals.css"), "utf8").replace(
  /\s+/g,
  " ",
);

describe("scrim token", () => {
  it("is a theme colour", () => {
    expect(css).toContain("--color-scrim: var(--scrim);");
  });

  it("has the light and dark values from DESIGN.md", () => {
    expect(css).toMatch(
      /:root \{[^}]*--scrim: oklch\(0\.2 0\.025 292 \/ 0?\.4\);/,
    );
    expect(css).toMatch(/\.dark \{[^}]*--scrim: rgb\(0 0 0 \/ 0?\.6\);/);
  });
});
