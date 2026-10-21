import { describe, expect, it } from "vitest";
import {
  SNIPPET_MAX,
  TITLE_MAX,
  displayTitle,
  emptyContent,
  isValidDocId,
} from "./model";

// The document model shared by the app, the server routes and the rules
// (ADR 0004, 0028).
describe("document ids", () => {
  it("accept Firestore auto ids", () => {
    expect(isValidDocId("aZ09bY18cX27dW36eV45")).toBe(true);
  });

  it("reject anything that could leave the documents collection", () => {
    for (const id of ["", "../x", "a/b", "a.b", " ", "x".repeat(65)]) {
      expect(isValidDocId(id)).toBe(false);
    }
  });

  it("reject non-strings", () => {
    expect(isValidDocId(undefined)).toBe(false);
    expect(isValidDocId(42)).toBe(false);
  });
});

describe("document fields", () => {
  it("cap the title and the snippet at 200 characters", () => {
    expect(TITLE_MAX).toBe(200);
    expect(SNIPPET_MAX).toBe(200);
  });

  it("show an empty title as Untitled", () => {
    expect(displayTitle("")).toBe("Untitled");
    expect(displayTitle("   ")).toBe("Untitled");
    expect(displayTitle("Plan")).toBe("Plan");
  });

  it("start a new document with one empty paragraph", () => {
    expect(emptyContent()).toEqual({
      type: "doc",
      content: [{ type: "paragraph" }],
    });
  });
});
