import { Editor } from "@tiptap/core";
import { afterEach, describe, expect, it } from "vitest";
import { isFormattingShortcut } from "./plain-text";
import { editorExtensions } from "./schema";

// Free plan is plain text (ADR 0035): formatting shortcuts do nothing,
// pasted text comes in without its formatting, typed addresses aren't linked
// and the markdown shortcuts ("# ", "- ", "**") are off. Paid is unchanged.
let editors: Editor[] = [];
afterEach(() => {
  editors.forEach((e) => e.destroy());
  editors = [];
});

function editor(locked: boolean, content = "<p>hello</p>") {
  const e = new Editor({
    extensions: editorExtensions({ locked: () => locked }),
    enableInputRules: !locked,
    enablePasteRules: !locked,
    content,
  });
  editors.push(e);
  return e;
}

const key = (code: string, mods: Partial<KeyboardEvent> = {}) =>
  new KeyboardEvent("keydown", {
    code,
    key: code.replace(/^(Key|Digit)/, "").toLowerCase(),
    ctrlKey: true,
    ...mods,
  });

describe("isFormattingShortcut", () => {
  it("knows the toolbar's shortcuts, with ⌘ or Ctrl", () => {
    for (const e of [
      key("KeyB"),
      key("KeyI"),
      key("KeyU"),
      key("KeyK"),
      key("KeyB", { ctrlKey: false, metaKey: true }),
      key("KeyS", { shiftKey: true }),
      key("KeyB", { shiftKey: true }),
      key("Digit7", { shiftKey: true }),
      key("Digit8", { shiftKey: true }),
      key("Digit1", { altKey: true }),
      key("Digit3", { altKey: true }),
      key("Digit0", { altKey: true }),
    ])
      expect(isFormattingShortcut(e), `${e.code}`).toBe(true);
  });

  it("leaves editing and browser shortcuts alone", () => {
    for (const e of [
      key("KeyZ"),
      key("KeyZ", { shiftKey: true }),
      key("KeyY"),
      key("KeyA"),
      key("KeyC"),
      key("KeyV"),
      key("KeyX"),
      key("KeyF"),
      key("KeyR"),
      key("KeyB", { ctrlKey: false }),
      key("Enter"),
    ])
      expect(isFormattingShortcut(e), `${e.code}`).toBe(false);
  });
});

describe("editor on the Free plan", () => {
  const press = (e: Editor, event: KeyboardEvent) =>
    e.view.someProp("handleKeyDown", (f) => f(e.view, event)) ?? false;

  it("swallows formatting shortcuts, so nothing is formatted", () => {
    const e = editor(true);
    e.commands.selectAll();
    expect(press(e, key("KeyB"))).toBe(true);
    expect(press(e, key("Digit1", { altKey: true }))).toBe(true);
    expect(e.getHTML()).toBe("<p>hello</p>");
  });

  it("keeps undo working", () => {
    const e = editor(true);
    e.commands.insertContentAt(6, " world");
    press(e, key("KeyZ"));
    expect(e.getHTML()).toBe("<p>hello</p>");
  });

  it("pastes formatted text as plain text", () => {
    const e = editor(true, "<p></p>");
    // jsdom has no ClipboardEvent (pasting again as text makes one) and no
    // DataTransfer; this is the part the editor reads.
    globalThis.ClipboardEvent ??= class extends Event {
      clipboardData = null;
    } as unknown as typeof ClipboardEvent;
    const types: Record<string, string> = {
      "text/html": "<h1>Big</h1><p><strong>bold</strong></p>",
      "text/plain": "Big\n\nbold",
    };
    const data = {
      types: Object.keys(types),
      getData: (t: string) => types[t],
    };
    const event = new Event("paste") as ClipboardEvent;
    Object.defineProperty(event, "clipboardData", { value: data });
    e.view.someProp("handlePaste", (f) =>
      f(e.view, event, e.state.doc.slice(0, 0)),
    );
    expect(e.getHTML()).not.toMatch(/<h1|<strong/);
    expect(e.getText()).toContain("Big");
    expect(e.getText()).toContain("bold");
  });

  it("doesn't turn markdown shortcuts into formatting", () => {
    const space = (e: Editor) =>
      e.view.someProp("handleTextInput", (f) =>
        f(e.view, 2, 2, " ", () => e.state.tr.insertText(" ", 2, 2)),
      ) ?? false;
    const free = editor(true, "<p>#</p>");
    expect(space(free)).toBe(false);
    expect(free.getHTML()).not.toMatch(/<h1/);
    const paid = editor(false, "<p>#</p>");
    expect(space(paid)).toBe(true);
    expect(paid.getHTML()).toMatch(/<h1/);
  });

  it("doesn't link a typed address", () => {
    const e = editor(true, "<p></p>");
    e.commands.insertContent("see https://studio.co ");
    expect(e.getHTML()).not.toMatch(/<a /);
  });
});

describe("editor on a paid plan", () => {
  it("still formats with shortcuts and links typed addresses", () => {
    const e = editor(false, "<p></p>");
    expect(
      e.view.someProp("handleKeyDown", (f) => f(e.view, key("KeyB"))) ?? false,
    ).toBe(true);
    e.commands.insertContent("see https://studio.co ");
    expect(e.getHTML()).toMatch(/<a /);
  });
});
