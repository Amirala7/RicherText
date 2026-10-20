import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Design tokens from docs/DESIGN.md §1, as they must appear in globals.css.
const css = readFileSync(join(__dirname, "globals.css"), "utf8");

function block(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`No "${selector}" block in globals.css`);
  let depth = 0;
  let end = start;
  for (let i = css.indexOf("{", start); i < css.length; i++) {
    if (css[i] === "{") depth++;
    if (css[i] === "}") depth--;
    if (depth === 0) {
      end = i;
      break;
    }
  }
  const body = css.slice(css.indexOf("{", start) + 1, end);
  const props: Record<string, string> = {};
  for (const match of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    props[match[1]] = match[2].trim();
  }
  return props;
}

const colours = {
  light: {
    bg: "oklch(0.997 0.002 292)",
    fg: "oklch(0.2 0.025 292)",
    subtle: "oklch(0.966 0.008 292)",
    border: "oklch(0.912 0.014 292)",
    muted: "oklch(0.53 0.03 292)",
    primary: "#6440D8",
    onPrimary: "#FFFFFF",
    danger: "oklch(0.52 0.19 25)",
  },
  dark: {
    bg: "oklch(0.17 0.012 292)",
    fg: "oklch(0.965 0.006 292)",
    subtle: "oklch(0.215 0.016 292)",
    border: "oklch(0.29 0.02 292)",
    muted: "oklch(0.71 0.025 292)",
    primary: "#B3A1FF",
    onPrimary: "#100B1F",
    danger: "oklch(0.74 0.14 25)",
  },
};

describe.each([
  ["light", ":root", colours.light],
  ["dark", ".dark", colours.dark],
] as const)("%s theme colours", (_name, selector, c) => {
  const props = block(selector);

  it.each([
    ["--background", c.bg],
    ["--card", c.bg],
    ["--popover", c.bg],
    ["--foreground", c.fg],
    ["--card-foreground", c.fg],
    ["--popover-foreground", c.fg],
    ["--secondary-foreground", c.fg],
    ["--accent-foreground", c.fg],
    ["--muted", c.subtle],
    ["--secondary", c.subtle],
    ["--accent", c.subtle],
    ["--border", c.border],
    ["--input", c.border],
    ["--muted-foreground", c.muted],
    ["--primary", c.primary],
    ["--ring", c.primary],
    ["--primary-foreground", c.onPrimary],
    ["--destructive", c.danger],
  ])("%s is %s", (prop, value) => {
    expect(props[prop]).toBe(value);
  });
});

describe("theme scale", () => {
  const theme = block("@theme inline");

  it.each([
    ["--text-xs", "12px", "1.4"],
    ["--text-sm", "14px", "1.4"],
    ["--text-base", "16px", "1.55"],
    ["--text-lg", "21px", "1.3"],
    ["--text-xl", "28px", "1.2"],
    ["--text-2xl", "38px", "1.15"],
    ["--text-3xl", "clamp(34px, 8vw, 50px)", "1.1"],
    ["--text-display", "clamp(44px, 12vw, 84px)", "1.02"],
  ])("type %s is %s with line-height %s", (token, size, lineHeight) => {
    expect(theme[token]).toBe(size);
    expect(theme[`${token}--line-height`]).toBe(lineHeight);
  });

  it.each([
    ["--text-lg", "-0.01em"],
    ["--text-xl", "-0.02em"],
    ["--text-2xl", "-0.025em"],
    ["--text-3xl", "-0.03em"],
    ["--text-display", "-0.035em"],
  ])("type %s tracks %s at weight 600", (token, tracking) => {
    expect(theme[`${token}--letter-spacing`]).toBe(tracking);
    expect(theme[`${token}--font-weight`]).toBe("600");
  });

  it.each([
    ["--radius-sm", "5px"],
    ["--radius-md", "7px"],
    ["--radius-lg", "10px"],
  ])("radius %s is %s", (token, value) => {
    expect(theme[token]).toBe(value);
  });

  it.each([
    ["--spacing-control-sm", "32px"],
    ["--spacing-control-md", "36px"],
    ["--spacing-control-lg", "44px"],
  ])("control height %s is %s", (token, value) => {
    expect(theme[token]).toBe(value);
  });

  it("uses Geist as the only sans and heading font", () => {
    expect(theme["--font-sans"]).toMatch(/^var\(--font-geist\)/);
    expect(theme["--font-heading"]).toBe("var(--font-sans)");
  });

  it("has the standard easing", () => {
    expect(theme["--ease-standard"]).toBe("cubic-bezier(0.2, 0, 0, 1)");
  });
});

describe("motion", () => {
  it("has two durations, 120ms and 200ms", () => {
    const root = block(":root");
    expect(root["--dur-1"]).toBe("120ms");
    expect(root["--dur-2"]).toBe("200ms");
  });

  it("drops all durations to 0 under reduced motion", () => {
    const reduced = css.slice(
      css.indexOf("@media (prefers-reduced-motion: reduce)"),
    );
    expect(reduced).toMatch(/--dur-1:\s*0ms/);
    expect(reduced).toMatch(/--dur-2:\s*0ms/);
  });
});
