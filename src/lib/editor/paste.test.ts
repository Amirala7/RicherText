import { Editor } from "@tiptap/core";
import { afterEach, describe, expect, it } from "vitest";
import { gmail, googleDocs, outlookWeb, word } from "./__fixtures__/clipboard";
import { editorExtensions } from "./schema";

// Paste fidelity (CONTEXT §5, ADR 0006, 0030): pasting from Google Docs, Word,
// Outlook and Gmail keeps headings, marks, links, lists (with nesting) and
// quotes, and drops the source's fonts, colours and spacing; copying out
// gives clean HTML that pastes back the same, and readable plain text.
let editors: Editor[] = [];
afterEach(() => {
  editors.forEach((e) => e.destroy());
  editors = [];
});

function editor(content = "") {
  const e = new Editor({ extensions: editorExtensions(), content });
  editors.push(e);
  return e;
}

// The document as HTML, with only href kept, so tests read like the result.
const shape = (e: Editor) =>
  e.getHTML().replace(/ (?!href=)[\w-]+="[^"]*"/g, "");

// jsdom has no ClipboardEvent; a plain paste event does the same job here.
const event = () => new Event("paste") as ClipboardEvent;

function paste(html: string) {
  const e = editor();
  e.view.pasteHTML(html, event());
  return shape(e);
}

const title = "<h1>Q4 plan</h1>";
const marks =
  '<p>Plain, <strong>bold</strong>, <em>italic</em>, <u>underlined</u>, <s>struck</s> and <a href="https://example.com/">a link</a>.</p>';
const lists =
  "<ul><li><p>First</p><ul><li><p>Nested</p></li></ul></li><li><p>Second</p></li></ul>" +
  "<ol><li><p>One</p></li><li><p>Two</p></li></ol>";
const quote = "<blockquote><p>Quoted</p></blockquote>";

describe("paste from other apps", () => {
  it("Google Docs: heading, marks, link, nested lists", () => {
    expect(paste(googleDocs)).toBe(title + marks + lists);
  });

  it("Word and Outlook for Windows: heading, marks, link, lists, quote", () => {
    expect(paste(word)).toBe(title + marks + lists + quote);
  });

  it("Gmail: lines, marks, link, lists, quote; empty lines dropped", () => {
    expect(paste(gmail)).toBe("<p>Q4 plan</p>" + marks + lists + quote);
  });

  it("Outlook on the web: lines, marks, link, lists, quote", () => {
    expect(paste(outlookWeb)).toBe("<p>Q4 plan</p>" + marks + lists + quote);
  });

  it("drops fonts, sizes, colours and classes", () => {
    for (const html of [googleDocs, word, gmail, outlookWeb]) {
      const e = editor();
      e.view.pasteHTML(html, event());
      expect(e.getHTML()).not.toMatch(/style=|class=|font|color/i);
    }
  });

  it("plain text: each line becomes a paragraph", () => {
    const e = editor();
    e.view.pasteText("Line one\nLine two\n\nLine three", event());
    expect(shape(e)).toBe("<p>Line one</p><p>Line two</p><p>Line three</p>");
  });
});

describe("copy out", () => {
  function copyAll() {
    const e = editor(title + marks + lists + quote);
    e.commands.selectAll();
    return e.view.serializeForClipboard(e.state.selection.content());
  }

  it("gives clean HTML: the right tags, no styles or classes", () => {
    const { dom } = copyAll();
    const html = dom.innerHTML;
    expect(html).not.toMatch(/style=|class=/);
    for (const tag of ["<h1", "<strong", "<em", "<u", "<s", "<ul", "<ol"])
      expect(html).toContain(tag);
    expect(html).toContain("<blockquote");
    expect(html).toContain('href="https://example.com/"');
  });

  it("pastes back into RicherText unchanged", () => {
    const { dom } = copyAll();
    expect(paste(dom.innerHTML)).toBe(title + marks + lists + quote);
  });

  it("gives plain text with a blank line between blocks", () => {
    const { text } = copyAll();
    expect(text).not.toMatch(/</);
    expect(text.startsWith("Q4 plan\n\nPlain, bold, italic, underlined")).toBe(
      true,
    );
    expect(text).toContain("Quoted");
  });
});
