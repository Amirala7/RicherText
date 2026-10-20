import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// The warning colour from the approved atoms page (ADR 0013): billing chips
// and the payment-due notice only (DESIGN.md §1, §3).
const css = readFileSync(join(__dirname, "globals.css"), "utf8");

function valueIn(selector: string, prop: string) {
  const start = css.indexOf(`${selector} {`);
  const body = css.slice(start, css.indexOf("}", start));
  return body.match(new RegExp(`${prop}\\s*:\\s*([^;]+);`))?.[1].trim();
}

describe("warning token", () => {
  it("is set for light and dark", () => {
    expect(valueIn(":root", "--warning")).toBe("oklch(0.53 0.12 65)");
    expect(valueIn(".dark", "--warning")).toBe("oklch(0.82 0.12 80)");
  });

  it("is a Tailwind colour", () => {
    expect(css).toMatch(/--color-warning:\s*var\(--warning\);/);
  });
});
