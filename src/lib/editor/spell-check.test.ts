import { Editor } from "@tiptap/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLock } from "./plain-text";
import { editorExtensions } from "./schema";
import { refreshSpelling } from "./spell-check";
import type { Misspelling } from "./spelling";
import type { SpellClient } from "./spelling-worker";

// Spell check plugin (ADR 0036, slice 4): misspellings are decorations, so
// the saved document never changes. Blocks are checked 400 ms after the
// last change, only the ones that changed; underlines move with the text and
// an edited word loses its underline until it's checked again. Paid plans
// only, never on read-only documents.
type Call = {
  text: string;
  skip: (readonly [number, number])[];
  resolve: (m: Misspelling[] | null) => void;
};

// A worker client standing in for the real one: the dictionary knows every
// word except the ones in BAD, and the test decides when replies arrive.
const BAD = ["teh", "laet", "knwon"];
function fakeClient() {
  const calls: Call[] = [];
  const client: SpellClient = {
    warm: vi.fn(),
    suggest: vi.fn(async () => []),
    check: vi.fn((_block, text, options = {}) => {
      const result = new Promise<Misspelling[] | null>((resolve) =>
        calls.push({ text, skip: options.skip ?? [], resolve }),
      );
      return result;
    }),
  };
  const answer = (call: Call) =>
    call.resolve(
      [...call.text.matchAll(/\p{L}+/gu)]
        .filter((m) => BAD.includes(m[0].toLowerCase()))
        .filter((m) => !call.skip.some(([a, b]) => m.index < b && m.index >= a))
        .map((m) => ({ from: m.index, to: m.index + m[0].length, word: m[0] })),
    );
  const answerAll = async () => {
    calls.splice(0).forEach(answer);
    await vi.runAllTimersAsync();
  };
  return { client, calls, answer, answerAll };
}

let editors: Editor[] = [];
beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  editors.forEach((e) => e.destroy());
  editors = [];
  vi.useRealTimers();
});

function setup(content: string, { on = true, editable = true } = {}) {
  const fake = fakeClient();
  const spelling = createLock(on);
  const editor = new Editor({
    extensions: editorExtensions({
      spelling: spelling.get,
      spellClient: () => fake.client,
    }),
    content,
    editable,
  });
  editors.push(editor);
  return { editor, spelling, ...fake };
}

const underlined = (editor: Editor) =>
  [...editor.view.dom.querySelectorAll(".rt-misspelling")].map(
    (el) => el.textContent,
  );

function typeAt(editor: Editor, pos: number, text: string) {
  editor.view.dispatch(editor.state.tr.insertText(text, pos));
}

describe("spell check plugin", () => {
  it("checks the document 400 ms after it opens and underlines misspellings", async () => {
    const { editor, calls, answerAll } = setup(
      "<p>teh launch</p><p>is laet</p>",
    );
    expect(calls).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(399);
    expect(calls).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(calls.map((c) => c.text)).toEqual(["teh launch", "is laet"]);
    await answerAll();
    expect(underlined(editor)).toEqual(["teh", "laet"]);
  });

  it("waits until typing pauses, then checks only the block that changed", async () => {
    const { editor, calls, answerAll } = setup("<p>one</p><p>two</p>");
    await vi.advanceTimersByTimeAsync(400);
    await answerAll();
    typeAt(editor, 4, " teh"); // end of "one"
    await vi.advanceTimersByTimeAsync(300);
    typeAt(editor, 8, " x");
    await vi.advanceTimersByTimeAsync(300);
    expect(calls).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(100);
    expect(calls.map((c) => c.text)).toEqual(["one teh x"]);
    await answerAll();
    expect(underlined(editor)).toEqual(["teh"]);
  });

  it("moves underlines along when text is typed above them", async () => {
    const { editor, answerAll } = setup("<p>a</p><p>teh launch</p>");
    await vi.advanceTimersByTimeAsync(400);
    await answerAll();
    typeAt(editor, 2, "bc");
    expect(underlined(editor)).toEqual(["teh"]);
  });

  it("drops the underline of a word as soon as it's edited", async () => {
    const { editor, answerAll } = setup("<p>teh launch</p>");
    await vi.advanceTimersByTimeAsync(400);
    await answerAll();
    typeAt(editor, 3, "x"); // "texh"
    expect(underlined(editor)).toEqual([]);
  });

  it("ignores a reply for a block that changed after it was sent", async () => {
    const { editor, calls, answer } = setup("<p>teh launch</p>");
    await vi.advanceTimersByTimeAsync(400);
    const [stale] = calls.splice(0);
    typeAt(editor, 11, " now");
    answer(stale);
    await vi.advanceTimersByTimeAsync(0);
    expect(underlined(editor)).toEqual([]);
  });

  it("ignores a reply the client marks out of date", async () => {
    const { editor, calls } = setup("<p>teh launch</p>");
    await vi.advanceTimersByTimeAsync(400);
    calls[0].resolve(null);
    await vi.advanceTimersByTimeAsync(0);
    expect(underlined(editor)).toEqual([]);
  });

  it("never changes the saved document", async () => {
    const { editor, answerAll } = setup("<p>teh launch is laet</p>");
    const before = editor.getJSON();
    await vi.advanceTimersByTimeAsync(400);
    await answerAll();
    expect(underlined(editor)).toEqual(["teh", "laet"]);
    expect(editor.getJSON()).toEqual(before);
    expect(editor.getHTML()).not.toContain("rt-misspelling");
  });

  it("skips link text", async () => {
    const { editor, calls, answerAll } = setup(
      '<p>see <a href="https://teh.example">teh</a> and teh</p>',
    );
    await vi.advanceTimersByTimeAsync(400);
    expect(calls[0].skip).toEqual([[4, 7]]);
    await answerAll();
    expect(underlined(editor)).toEqual(["teh"]);
  });

  it("puts the underline in the right place after a line break", async () => {
    const { editor, calls, answerAll } = setup("<p>launch<br>teh</p>");
    await vi.advanceTimersByTimeAsync(400);
    expect(calls[0].text).toBe("launch\nteh");
    await answerAll();
    expect(underlined(editor)).toEqual(["teh"]);
  });

  it("checks headings and list items too", async () => {
    const { editor, answerAll } = setup(
      "<h1>teh</h1><ul><li><p>laet</p></li></ul><blockquote><p>knwon</p></blockquote>",
    );
    await vi.advanceTimersByTimeAsync(400);
    await answerAll();
    expect(underlined(editor)).toEqual(["teh", "laet", "knwon"]);
  });

  it("turns the browser's own spellcheck off while ours is on", () => {
    const { editor } = setup("<p>hello</p>");
    expect(editor.view.dom.getAttribute("spellcheck")).toBe("false");
  });
});

describe("spell check off (Free plan or read-only)", () => {
  it("does nothing on the Free plan and leaves the browser's spellcheck on", async () => {
    const { editor, client } = setup("<p>teh</p>", { on: false });
    typeAt(editor, 4, " laet");
    await vi.advanceTimersByTimeAsync(1000);
    expect(client.check).not.toHaveBeenCalled();
    expect(underlined(editor)).toEqual([]);
    expect(editor.view.dom.getAttribute("spellcheck")).not.toBe("false");
  });

  it("does nothing on a read-only document", async () => {
    const { editor, client } = setup("<p>teh</p>", { editable: false });
    await vi.advanceTimersByTimeAsync(1000);
    expect(client.check).not.toHaveBeenCalled();
    expect(underlined(editor)).toEqual([]);
    expect(editor.view.dom.getAttribute("spellcheck")).not.toBe("false");
  });

  it("checks the whole document once switched on (after upgrading)", async () => {
    const { editor, spelling, calls, answerAll } = setup("<p>teh</p>", {
      on: false,
    });
    await vi.advanceTimersByTimeAsync(1000);
    spelling.set(true);
    refreshSpelling(editor.view);
    expect(editor.view.dom.getAttribute("spellcheck")).toBe("false");
    await vi.advanceTimersByTimeAsync(400);
    expect(calls.map((c) => c.text)).toEqual(["teh"]);
    await answerAll();
    expect(underlined(editor)).toEqual(["teh"]);
  });

  it("hides the underlines once switched off (after downgrading)", async () => {
    const { editor, spelling, answerAll } = setup("<p>teh</p>");
    await vi.advanceTimersByTimeAsync(400);
    await answerAll();
    spelling.set(false);
    refreshSpelling(editor.view);
    expect(underlined(editor)).toEqual([]);
  });

  it("hides the underlines when the document becomes read-only", async () => {
    const { editor, answerAll } = setup("<p>teh</p>");
    await vi.advanceTimersByTimeAsync(400);
    await answerAll();
    editor.setEditable(false);
    expect(underlined(editor)).toEqual([]);
  });
});
