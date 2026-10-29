import { Editor } from "@tiptap/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLock } from "./plain-text";
import { editorExtensions } from "./schema";
import {
  closeSpellingMenu,
  ignoreMisspelling,
  replaceMisspelling,
  type SpellTarget,
} from "./spell-check";
import type { Misspelling } from "./spelling";
import type { SpellClient } from "./spelling-worker";

// Spell check suggestions (ADR 0036, slice 5): a click or tap on an
// underlined word, or ⌘; / Ctrl+; (at the cursor, or the next misspelling),
// asks the worker for suggestions and opens the menu. Picking one replaces
// the word in one undo step and keeps its formatting; Ignore clears every
// underline of the word for the rest of the session. The word is tinted
// while its menu is open.
const BAD = ["teh", "laet"];
const SUGGESTIONS: Record<string, string[]> = {
  teh: ["the", "ten", "tea"],
  laet: ["late", "let"],
};

function fakeClient() {
  const client: SpellClient = {
    warm: vi.fn(),
    suggest: vi.fn(async (word: string) => SUGGESTIONS[word.toLowerCase()]),
    check: vi.fn(async (_block, text, options = {}) => {
      const ignore = (options.ignore ?? []).map((w: string) => w.toLowerCase());
      return [...text.matchAll(/\p{L}+/gu)]
        .filter((m) => BAD.includes(m[0].toLowerCase()))
        .filter((m) => !ignore.includes(m[0].toLowerCase()))
        .map((m): Misspelling => ({
          from: m.index,
          to: m.index + m[0].length,
          word: m[0],
        }));
    }),
  };
  return client;
}

let editors: Editor[] = [];
beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  editors.forEach((e) => e.destroy());
  editors = [];
  vi.useRealTimers();
});

async function setup(content: string, { on = true } = {}) {
  const client = fakeClient();
  const onSuggest = vi.fn<(target: SpellTarget) => void>();
  const editor = new Editor({
    extensions: editorExtensions({
      spelling: createLock(on).get,
      spellClient: () => client,
      spellIgnored: new Set(),
      onSpellSuggest: onSuggest,
    }),
    content,
  });
  editors.push(editor);
  await vi.advanceTimersByTimeAsync(400);
  return { editor, client, onSuggest };
}

const underlined = (editor: Editor) =>
  [...editor.view.dom.querySelectorAll(".rt-misspelling")].map(
    (el) => el.textContent,
  );
const tinted = (editor: Editor) =>
  [...editor.view.dom.querySelectorAll(".rt-misspelling-open")].map(
    (el) => el.textContent,
  );

function click(editor: Editor, pos: number) {
  const { view } = editor;
  const event = new MouseEvent("click");
  view.someProp("handleClick", (f) => f(view, pos, event));
}

function shortcut(editor: Editor, init: KeyboardEventInit = { metaKey: true }) {
  const event = new KeyboardEvent("keydown", {
    key: ";",
    bubbles: true,
    cancelable: true,
    ...init,
  });
  editor.view.dom.dispatchEvent(event);
  return event;
}

describe("opening the suggestions menu", () => {
  it("opens on a click on an underlined word, with its suggestions", async () => {
    const { editor, onSuggest } = await setup("<p>so teh plan</p>");
    click(editor, 5); // inside "teh"
    await vi.advanceTimersByTimeAsync(0);
    expect(onSuggest).toHaveBeenCalledWith({
      from: 4,
      to: 7,
      word: "teh",
      suggestions: ["the", "ten", "tea"],
    });
  });

  it("does nothing on a click on a correct word", async () => {
    const { editor, onSuggest, client } = await setup("<p>so teh plan</p>");
    click(editor, 9); // inside "plan"
    await vi.advanceTimersByTimeAsync(0);
    expect(client.suggest).not.toHaveBeenCalled();
    expect(onSuggest).not.toHaveBeenCalled();
  });

  it("opens with ⌘; on the misspelling at the cursor", async () => {
    const { editor, onSuggest } = await setup("<p>teh and laet</p>");
    editor.commands.setTextSelection(10); // inside "laet"
    const event = shortcut(editor);
    await vi.advanceTimersByTimeAsync(0);
    expect(event.defaultPrevented).toBe(true);
    expect(onSuggest).toHaveBeenCalledWith(
      expect.objectContaining({ from: 9, to: 13, word: "laet" }),
    );
  });

  it("opens with Ctrl+; on the next misspelling after the cursor", async () => {
    const { editor, onSuggest } = await setup("<p>teh and laet</p>");
    editor.commands.setTextSelection(6); // inside "and"
    shortcut(editor, { ctrlKey: true });
    await vi.advanceTimersByTimeAsync(0);
    expect(onSuggest).toHaveBeenCalledWith(
      expect.objectContaining({ word: "laet" }),
    );
  });

  it("goes back to the first misspelling when none is after the cursor", async () => {
    const { editor, onSuggest } = await setup("<p>teh and laet ok</p>");
    editor.commands.setTextSelection(15); // inside "ok"
    shortcut(editor);
    await vi.advanceTimersByTimeAsync(0);
    expect(onSuggest).toHaveBeenCalledWith(
      expect.objectContaining({ from: 1, to: 4, word: "teh" }),
    );
  });

  it("still takes ⌘; when there's nothing to fix, so the browser's check doesn't run", async () => {
    const { editor, onSuggest } = await setup("<p>all fine</p>");
    const event = shortcut(editor);
    await vi.advanceTimersByTimeAsync(0);
    expect(event.defaultPrevented).toBe(true);
    expect(onSuggest).not.toHaveBeenCalled();
  });

  it("tints the word while its menu is open", async () => {
    const { editor } = await setup("<p>so teh plan</p>");
    click(editor, 5);
    await vi.advanceTimersByTimeAsync(0);
    expect(tinted(editor)).toEqual(["teh"]);
    closeSpellingMenu(editor.view);
    expect(tinted(editor)).toEqual([]);
    expect(underlined(editor)).toEqual(["teh"]);
  });
});

describe("spell check menu off (Free plan)", () => {
  it("leaves ⌘; and clicks to the browser", async () => {
    const { editor, onSuggest, client } = await setup("<p>so teh plan</p>", {
      on: false,
    });
    const event = shortcut(editor);
    click(editor, 5);
    await vi.advanceTimersByTimeAsync(0);
    expect(event.defaultPrevented).toBe(false);
    expect(client.suggest).not.toHaveBeenCalled();
    expect(onSuggest).not.toHaveBeenCalled();
  });
});

describe("picking a suggestion", () => {
  it("replaces the word in one undo step", async () => {
    const { editor } = await setup("<p>so teh plan</p>");
    replaceMisspelling(editor.view, { from: 4, to: 7 }, "the");
    expect(editor.getText()).toBe("so the plan");
    editor.commands.undo();
    expect(editor.getText()).toBe("so teh plan");
  });

  it("keeps the word's bold and italic", async () => {
    const { editor } = await setup(
      "<p>so <strong><em>teh</em></strong> plan</p>",
    );
    replaceMisspelling(editor.view, { from: 4, to: 7 }, "the");
    expect(editor.getHTML()).toBe(
      "<p>so <strong><em>the</em></strong> plan</p>",
    );
  });

  it("removes the underline and the tint", async () => {
    const { editor } = await setup("<p>so teh plan</p>");
    click(editor, 5);
    await vi.advanceTimersByTimeAsync(0);
    replaceMisspelling(editor.view, { from: 4, to: 7 }, "the");
    expect(underlined(editor)).toEqual([]);
    expect(tinted(editor)).toEqual([]);
  });
});

describe("ignoring a word", () => {
  it("clears every underline of the word, whatever its case", async () => {
    const { editor } = await setup("<p>Teh plan</p><p>teh laet teh</p>");
    expect(underlined(editor)).toEqual(["Teh", "teh", "laet", "teh"]);
    ignoreMisspelling(editor.view, "teh");
    expect(underlined(editor)).toEqual(["laet"]);
  });

  it("keeps it unflagged when its block is checked again", async () => {
    const { editor, client } = await setup("<p>teh plan</p>");
    ignoreMisspelling(editor.view, "teh");
    editor.commands.insertContentAt(9, " teh");
    await vi.advanceTimersByTimeAsync(400);
    expect(client.check).toHaveBeenLastCalledWith(
      expect.any(String),
      "teh plan teh",
      expect.objectContaining({ ignore: ["teh"] }),
    );
    expect(underlined(editor)).toEqual([]);
  });

  it("doesn't change the document", async () => {
    const { editor } = await setup("<p>teh plan</p>");
    const before = editor.getJSON();
    ignoreMisspelling(editor.view, "teh");
    expect(editor.getJSON()).toEqual(before);
  });
});
