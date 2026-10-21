import { describe, expect, it } from "vitest";
import { SNIPPET_MAX } from "@/lib/documents/model";
import { snippetOf } from "./snippet";

// The snippet (ADR 0028): the document's opening text, saved with the list
// info so the list never has to load content.
const p = (text: string) => ({
  type: "paragraph",
  content: [{ type: "text", text }],
});

describe("snippetOf", () => {
  it("joins the text of the blocks with spaces", () => {
    expect(
      snippetOf({
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: { level: 1 },
            content: [p("Plan").content[0]],
          },
          p("First   line"),
          {
            type: "bulletList",
            content: [{ type: "listItem", content: [p("item")] }],
          },
        ],
      }),
    ).toBe("Plan First line item");
  });

  it("is empty for an empty document", () => {
    expect(snippetOf({ type: "doc", content: [{ type: "paragraph" }] })).toBe(
      "",
    );
  });

  it("stops at the snippet limit", () => {
    const snippet = snippetOf({ type: "doc", content: [p("a".repeat(500))] });
    expect(snippet).toHaveLength(SNIPPET_MAX);
  });

  it("never cuts a character in half", () => {
    const snippet = snippetOf({
      type: "doc",
      content: [p("a".repeat(SNIPPET_MAX - 1) + "😀")],
    });
    expect(snippet).toBe("a".repeat(SNIPPET_MAX - 1));
  });
});
