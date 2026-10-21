import { Editor } from "@tiptap/core";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { documentExtensions } from "@/lib/editor/schema";
import { EditorToolbar } from "./editor-toolbar";

// Editor toolbar groups (ADR 0015): undo redo · H1 H2 H3 · B I U S · bullets,
// numbers, quote · link. Toggles show what's on at the cursor; headings are
// exclusive; every toggle names its shortcut. The link button opens the link
// editor (slice 4).
let editor: Editor;

function setup(html = "<p>hello world</p>", disabled = false) {
  editor = new Editor({ extensions: documentExtensions(), content: html });
  editor.commands.selectAll();
  render(<EditorToolbar editor={editor} disabled={disabled} />);
}

afterEach(() => editor?.destroy());

const toggle = (name: string) => screen.getByRole("button", { name });

describe("EditorToolbar", () => {
  it("has the v1 toggles in order", () => {
    setup();
    expect(
      screen.getByRole("toolbar", { name: "Formatting" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("button").map((b) => b.ariaLabel)).toEqual([
      "Undo",
      "Redo",
      "Heading 1",
      "Heading 2",
      "Heading 3",
      "Bold",
      "Italic",
      "Underline",
      "Strikethrough",
      "Bulleted list",
      "Numbered list",
      "Quote",
      "Writing font",
      "Text size",
      "Text colour",
      "Link",
    ]);
  });

  it("names each shortcut", () => {
    setup();
    expect(toggle("Bold")).toHaveAttribute("aria-keyshortcuts", "Control+B");
    expect(toggle("Heading 2")).toHaveAttribute(
      "aria-keyshortcuts",
      "Control+Alt+2",
    );
    expect(toggle("Numbered list")).toHaveAttribute(
      "aria-keyshortcuts",
      "Control+Shift+7",
    );
    expect(toggle("Redo")).toHaveAttribute(
      "aria-keyshortcuts",
      "Control+Shift+Z",
    );
  });

  it("formats the selection and shows the toggle on", () => {
    setup();
    expect(toggle("Bold")).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(toggle("Bold"));
    expect(editor.isActive("bold")).toBe(true);
    expect(toggle("Bold")).toHaveAttribute("aria-pressed", "true");
  });

  it("follows formatting made with the keyboard", () => {
    setup();
    act(() => {
      editor.chain().toggleItalic().run();
    });
    expect(toggle("Italic")).toHaveAttribute("aria-pressed", "true");
  });

  it("keeps headings exclusive, and turns one off again", () => {
    setup();
    fireEvent.click(toggle("Heading 1"));
    fireEvent.click(toggle("Heading 2"));
    expect(toggle("Heading 1")).toHaveAttribute("aria-pressed", "false");
    expect(toggle("Heading 2")).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(toggle("Heading 2"));
    expect(editor.isActive("heading")).toBe(false);
    expect(editor.isActive("paragraph")).toBe(true);
  });

  it("makes lists and quotes", () => {
    setup();
    fireEvent.click(toggle("Bulleted list"));
    expect(editor.isActive("bulletList")).toBe(true);
    fireEvent.click(toggle("Numbered list"));
    expect(editor.isActive("orderedList")).toBe(true);
    fireEvent.click(toggle("Quote"));
    expect(editor.isActive("blockquote")).toBe(true);
  });

  it("undoes and redoes, and is disabled when there's nothing to do", () => {
    setup();
    expect(toggle("Undo")).toBeDisabled();
    fireEvent.click(toggle("Bold"));
    expect(toggle("Undo")).toBeEnabled();
    fireEvent.click(toggle("Undo"));
    expect(editor.isActive("bold")).toBe(false);
    fireEvent.click(toggle("Redo"));
    expect(editor.isActive("bold")).toBe(true);
  });

  it("opens the link editor with the Link button (⌘K)", () => {
    const onLink = vi.fn();
    editor = new Editor({
      extensions: documentExtensions(),
      content: "<p>hello world</p>",
    });
    render(<EditorToolbar editor={editor} onLink={onLink} />);
    expect(toggle("Link")).toHaveAttribute("aria-keyshortcuts", "Control+K");
    fireEvent.click(toggle("Link"));
    expect(onLink).toHaveBeenCalledTimes(1);
  });

  it("shows Link on when the cursor is in a link", () => {
    setup('<p><a href="https://studio.co">studio</a> and more</p>');
    expect(toggle("Link")).toHaveAttribute("aria-pressed", "false");
    act(() => {
      editor.commands.setTextSelection(3);
    });
    expect(toggle("Link")).toHaveAttribute("aria-pressed", "true");
  });

  it("is fully disabled on a read-only document", () => {
    setup("<p>hello</p>", true);
    for (const b of screen.getAllByRole("button")) expect(b).toBeDisabled();
  });
});

// Text size and colour (ADR 0031): two toggles before Link, each opening a
// menu; the choice applies to the selection and is a mark in the document.
describe("EditorToolbar: text size and colour", () => {
  const open = (name: string) =>
    fireEvent.pointerDown(toggle(name), { button: 0, ctrlKey: false });

  it("Text size offers Small, Default and Large, and sets the size", () => {
    setup();
    open("Text size");
    const items = screen.getAllByRole("menuitemradio");
    expect(items.map((i) => i.textContent)).toEqual([
      "Small",
      "Default",
      "Large",
    ]);
    expect(items[1]).toHaveAttribute("aria-checked", "true");
    fireEvent.click(items[2]);
    expect(editor.isActive("textSize", { size: "large" })).toBe(true);
    open("Text size");
    fireEvent.click(screen.getByRole("menuitemradio", { name: "Default" }));
    expect(editor.isActive("textSize")).toBe(false);
  });

  it("Text colour offers Default and six colours, and sets the colour", () => {
    setup();
    open("Text colour");
    expect(
      screen.getAllByRole("menuitemradio").map((i) => i.ariaLabel),
    ).toEqual(["Default", "Grey", "Red", "Orange", "Green", "Blue", "Violet"]);
    fireEvent.click(screen.getByRole("menuitemradio", { name: "Red" }));
    expect(editor.isActive("textColor", { color: "red" })).toBe(true);
    open("Text colour");
    expect(screen.getByRole("menuitemradio", { name: "Red" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    fireEvent.click(screen.getByRole("menuitemradio", { name: "Default" }));
    expect(editor.isActive("textColor")).toBe(false);
  });
});

// Writing font (ADR 0032): a toggle before Text size opening the fonts as
// checked items; the font belongs to the document, so the pick goes up.
describe("EditorToolbar: writing font", () => {
  const open = () =>
    fireEvent.pointerDown(toggle("Writing font"), {
      button: 0,
      ctrlKey: false,
    });

  it("offers Geist and IBM Plex Serif, the current one checked", () => {
    editor = new Editor({ extensions: documentExtensions() });
    render(<EditorToolbar editor={editor} font="plex-serif" />);
    open();
    const items = screen.getAllByRole("menuitemradio");
    expect(items.map((i) => i.textContent)).toEqual([
      "Geist",
      "IBM Plex Serif",
    ]);
    expect(items[1]).toHaveAttribute("aria-checked", "true");
  });

  it("passes the picked font up", () => {
    const onFont = vi.fn();
    editor = new Editor({ extensions: documentExtensions() });
    render(<EditorToolbar editor={editor} onFont={onFont} />);
    open();
    expect(
      screen.getByRole("menuitemradio", { name: "Geist" }),
    ).toHaveAttribute("aria-checked", "true");
    fireEvent.click(
      screen.getByRole("menuitemradio", { name: "IBM Plex Serif" }),
    );
    expect(onFont).toHaveBeenCalledWith("plex-serif");
  });
});
