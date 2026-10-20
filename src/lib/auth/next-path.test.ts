import { describe, expect, it } from "vitest";
import { safeNextPath } from "./next-path";

// After sign in we only ever go to a path on this site (ADR 0026).
describe("safeNextPath", () => {
  it.each([
    ["/documents", "/documents"],
    ["/account?tab=writing", "/account?tab=writing"],
    ["/editor/abc#top", "/editor/abc#top"],
  ])("keeps the local path %s", (value, expected) => {
    expect(safeNextPath(value)).toBe(expected);
  });

  it.each([
    [null],
    [undefined],
    [""],
    ["documents"],
    ["https://evil.example/documents"],
    ["//evil.example"],
    ["/\\evil.example"],
    ["/%5Cevil.example"],
    ["javascript:alert(1)"],
    ["/sign-in"],
    ["/sign-up?next=/documents"],
  ])("falls back to the documents page for %s", (value) => {
    expect(safeNextPath(value)).toBe("/documents");
  });
});
