import { describe, expect, it } from "vitest";
import { CONTENT_MAX, decodeContent, encodeContent } from "./content";
import { emptyContent, type DocumentJson } from "./model";

// Content is stored as a JSON string, not a Firestore map, so lists can nest
// past Firestore's 20-level limit (ADR 0033).
const nested = (levels: number): DocumentJson => {
  let item: Record<string, unknown> = {
    type: "listItem",
    content: [{ type: "paragraph", content: [{ type: "text", text: "deep" }] }],
  };
  for (let i = 0; i < levels; i++) {
    item = {
      type: "listItem",
      content: [{ type: "paragraph" }, { type: "bulletList", content: [item] }],
    };
  }
  return { type: "doc", content: [{ type: "bulletList", content: [item] }] };
};

describe("document content encoding", () => {
  it("round-trips a deeply nested document", () => {
    const doc = nested(8);
    expect(decodeContent(encodeContent(doc))).toEqual(doc);
  });

  it("puts type first, as the rules expect", () => {
    const doc = {
      content: [{ type: "paragraph" }],
      type: "doc",
    } as DocumentJson;
    expect(encodeContent(doc).startsWith('{"type":"doc"')).toBe(true);
  });

  it("reads content saved as a map before ADR 0033", () => {
    expect(decodeContent(emptyContent())).toEqual(emptyContent());
  });

  it("reads missing content as an empty document", () => {
    expect(decodeContent(undefined)).toEqual(emptyContent());
  });

  it("refuses content that isn't a ProseMirror document", () => {
    expect(() => decodeContent("not json")).toThrow();
    expect(() => decodeContent('{"type":"paragraph"}')).toThrow();
  });

  it("caps content below Firestore's 1 MiB record limit", () => {
    expect(CONTENT_MAX).toBe(900_000);
  });
});
