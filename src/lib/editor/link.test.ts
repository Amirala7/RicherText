import { describe, expect, it } from "vitest";
import { normalizeLink } from "./link";

// Link editor addresses (slice 4, user 2026-10-21): only http(s) and mailto
// links, like the schema allows; an address without a scheme gets https://,
// an email address gets mailto:; anything else is refused.
describe("normalizeLink", () => {
  it("keeps full http, https and mailto addresses", () => {
    expect(normalizeLink("https://studio.co/q4")).toBe("https://studio.co/q4");
    expect(normalizeLink("http://example.com")).toBe("http://example.com");
    expect(normalizeLink("mailto:maya@studio.co")).toBe(
      "mailto:maya@studio.co",
    );
  });

  it("adds https:// to an address without a scheme", () => {
    expect(normalizeLink("example.com")).toBe("https://example.com");
    expect(normalizeLink("  studio.co/q4?draft=2#goals ")).toBe(
      "https://studio.co/q4?draft=2#goals",
    );
    expect(normalizeLink("www.example.com:8080/x")).toBe(
      "https://www.example.com:8080/x",
    );
  });

  it("turns an email address into a mailto link", () => {
    expect(normalizeLink("maya@studio.co")).toBe("mailto:maya@studio.co");
  });

  it("refuses empty input, other schemes and things that aren't addresses", () => {
    for (const input of [
      "",
      "   ",
      "javascript:alert(1)",
      "ftp://example.com",
      "data:text/html,hi",
      "hello world",
      "notalink",
      "https://",
    ])
      expect(normalizeLink(input), input).toBeNull();
  });
});
