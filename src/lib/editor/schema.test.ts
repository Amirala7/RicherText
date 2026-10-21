import { generateJSON, getSchema } from "@tiptap/core";
import { describe, expect, it } from "vitest";
import { documentExtensions } from "./schema";

// One shared schema, exactly CONTEXT §5 (ADR 0006): headings 1–3, paragraphs,
// bold, italic, underline, strikethrough, lists, links, quotes. Nothing else
// can enter a document, also not by pasting.
const schema = getSchema(documentExtensions());

type Json = { type?: string; marks?: Json[]; content?: Json[] };
function types(node: Json, found = new Set<string>()) {
  if (node.type) found.add(node.type);
  node.marks?.forEach((m) => types(m, found));
  node.content?.forEach((c) => types(c, found));
  return found;
}

describe("document schema", () => {
  it("has exactly the v1 blocks", () => {
    expect(Object.keys(schema.nodes).sort()).toEqual(
      [
        "blockquote",
        "bulletList",
        "doc",
        "hardBreak",
        "heading",
        "listItem",
        "orderedList",
        "paragraph",
        "text",
      ].sort(),
    );
  });

  it("has exactly the v1 marks", () => {
    expect(Object.keys(schema.marks).sort()).toEqual(
      ["bold", "italic", "link", "strike", "underline"].sort(),
    );
  });

  it("keeps the formatting it supports when pasted", () => {
    const json = generateJSON(
      '<h2>Plan</h2><p><b>bold</b> <i>it</i> <u>u</u> <s>s</s> <a href="https://studio.co">link</a></p><ul><li>a</li></ul><ol><li>b</li></ol><blockquote><p>q</p></blockquote>',
      documentExtensions(),
    );
    expect([...types(json)].sort()).toEqual(
      [
        "blockquote",
        "bold",
        "bulletList",
        "doc",
        "heading",
        "italic",
        "link",
        "listItem",
        "orderedList",
        "paragraph",
        "strike",
        "text",
        "underline",
      ].sort(),
    );
  });

  it("drops what v1 doesn't support when pasted, keeping the text", () => {
    const json = generateJSON(
      '<h4>Small</h4><pre><code>x = 1</code></pre><hr><img src="a.png"><p>see <code>y</code></p><table><tr><td>cell</td></tr></table>',
      documentExtensions(),
    );
    const found = types(json);
    for (const t of ["codeBlock", "code", "horizontalRule", "image", "table"]) {
      expect(found.has(t)).toBe(false);
    }
    expect(JSON.stringify(json)).toContain("Small");
    expect(JSON.stringify(json)).toContain("x = 1");
    expect(JSON.stringify(json)).toContain("cell");
  });

  it("allows only heading levels 1 to 3", () => {
    const json = generateJSON("<h1>a</h1><h3>c</h3>", documentExtensions());
    expect(json.content.map((n: { attrs: unknown }) => n.attrs)).toEqual([
      { level: 1 },
      { level: 3 },
    ]);
    expect(schema.nodes.heading.spec.attrs?.level).toBeDefined();
  });

  it("only keeps web and mail links", () => {
    const json = generateJSON(
      '<p><a href="javascript:alert(1)">bad</a> <a href="mailto:a@b.co">mail</a></p>',
      documentExtensions(),
    );
    const hrefs = JSON.stringify(json).match(/"href":"[^"]*"/g) ?? [];
    expect(hrefs).toEqual(['"href":"mailto:a@b.co"']);
  });
});
