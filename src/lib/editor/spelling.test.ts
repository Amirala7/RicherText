import { describe, expect, it } from "vitest";
import {
  findMisspellings,
  suggestionsFor,
  type SpellDictionary,
} from "./spelling";

// Spell checker core (ADR 0036): finds the words the dictionary doesn't know
// in one block of text, and ranks the dictionary's suggestions for one word.
// A small fixed dictionary keeps these fast and always the same; the real
// one (nspell + dictionary-en) sits behind the same two methods.
const WORDS = [
  "the",
  "launch",
  "is",
  "on",
  "a",
  "well",
  "known",
  "client",
  "client's",
  "don't",
  "see",
  "and",
  "or",
  "at",
  "email",
  "me",
  "read",
  "notes",
  "receive",
];

function dictionary(suggestions: Record<string, string[]> = {}) {
  const words = new Set(WORDS);
  const dict: SpellDictionary = {
    correct: (word) => words.has(word) || words.has(word.toLowerCase()),
    suggest: (word) => suggestions[word] ?? [],
  };
  return dict;
}

const find = (
  text: string,
  options: { ignore?: string[]; skip?: [number, number][] } = {},
) =>
  findMisspellings(text, {
    dict: dictionary(),
    ignore: new Set(options.ignore ?? []),
    skip: options.skip,
  });

describe("findMisspellings", () => {
  it("finds an unknown word, with offsets inside the block", () => {
    expect(find("the launch is on Wensday")).toEqual([
      { from: 17, to: 24, word: "Wensday" },
    ]);
  });

  it("finds every unknown word in order, and nothing in correct text", () => {
    expect(find("teh launch is on Wensday.")).toEqual([
      { from: 0, to: 3, word: "teh" },
      { from: 17, to: 24, word: "Wensday" },
    ]);
    expect(find("The launch is on.")).toEqual([]);
    expect(find("")).toEqual([]);
  });

  it("checks words next to punctuation", () => {
    expect(find("(recieve), “recieve”")).toEqual([
      { from: 1, to: 8, word: "recieve" },
      { from: 12, to: 19, word: "recieve" },
    ]);
  });

  it("skips web addresses and email addresses", () => {
    expect(
      find(
        "see https://studio.co/q4brief at www.studiox.co or studiox.com/notez",
      ),
    ).toEqual([]);
    expect(find("email maya@studiox.co")).toEqual([]);
  });

  it("skips ALL CAPS words, words with digits and single letters", () => {
    expect(find("the NASDQ launch is on 2nd x a4 q4brief")).toEqual([]);
  });

  it("skips the words in the ignore list, every time and in any case", () => {
    expect(find("Zorvex is a zorvex client", { ignore: ["zorvex"] })).toEqual(
      [],
    );
    expect(find("Zorvex is on", { ignore: ["Zorvex"] })).toEqual([]);
  });

  it("skips the ranges it's told to skip, like link text", () => {
    expect(find("see Zorvex and Qwop", { skip: [[4, 10]] })).toEqual([
      { from: 15, to: 19, word: "Qwop" },
    ]);
    // a word that only partly overlaps a skipped range is skipped too
    expect(find("see Zorvex", { skip: [[6, 7]] })).toEqual([]);
  });

  it("checks words with apostrophes as one word, straight or curly", () => {
    expect(find("don't see the client's notes")).toEqual([]);
    expect(find("don’t see the client’s notes")).toEqual([]);
    expect(find("the clinet’s notes")).toEqual([
      { from: 4, to: 12, word: "clinet’s" },
    ]);
  });

  it("checks each part of a hyphenated word on its own", () => {
    expect(find("a well-known client")).toEqual([]);
    expect(find("a well-knwon client")).toEqual([
      { from: 7, to: 12, word: "knwon" },
    ]);
  });
});

describe("suggestionsFor", () => {
  const nspellOrder = {
    teh: ["ten", "eh", "meh", "tea", "tech", "ted", "tee", "tel", "the"],
    Teh: ["Ten", "Eh", "the", "The", "Tea"],
    recieve: ["receive", "relieve", "receive"],
    "clinet's": ["client's", "clinic's"],
  };
  const dict = dictionary(nspellOrder);

  it("gives at most 5 suggestions", () => {
    expect(suggestionsFor("teh", dict)).toHaveLength(5);
  });

  it("puts a word with two letters swapped first", () => {
    expect(suggestionsFor("teh", dict)).toEqual([
      "the",
      "ten",
      "eh",
      "meh",
      "tea",
    ]);
  });

  it("prefers the typed word's capitalisation", () => {
    expect(suggestionsFor("Teh", dict)[0]).toBe("The");
  });

  it("keeps the dictionary's order otherwise, without repeats", () => {
    expect(suggestionsFor("recieve", dict)).toEqual(["receive", "relieve"]);
  });

  it("keeps a curly apostrophe if the word was typed with one", () => {
    expect(suggestionsFor("clinet’s", dict)).toEqual(["client’s", "clinic’s"]);
  });

  it("gives nothing when the dictionary has nothing", () => {
    expect(suggestionsFor("Zorvex", dict)).toEqual([]);
  });
});
