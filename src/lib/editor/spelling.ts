// Spell checker core (ADR 0036): finds the words the dictionary doesn't know
// in one block of text, and ranks suggestions for one word. Plain functions,
// no editor or worker; the dictionary (nspell + dictionary-en) is passed in.

export type SpellDictionary = {
  correct(word: string): boolean;
  suggest(word: string): string[];
};

// Offsets are relative to the block's text.
export type Misspelling = { from: number; to: number; word: string };

const MAX_SUGGESTIONS = 5;
// Letters and digits, with apostrophes inside ("don't", "client’s"). Hyphens
// aren't part of a word, so each part of "well-known" is checked on its own.
const WORD = /[\p{L}\p{M}\p{N}]+(?:['’][\p{L}\p{M}\p{N}]+)*/gu;
const CHUNK = /\S+/g;
const WEB = /^\W*(https?:\/\/|www\.)/i;
const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/;
// A host with a dot ("studio.co/q4"), but not the end of a sentence.
const DOMAIN = /[\p{L}\p{N}-]+\.[a-z]{2,}(?:[/:?#]|$)/iu;
const DIGIT = /\p{N}/u;

const straight = (word: string) => word.replace(/’/g, "'");

export function findMisspellings(
  text: string,
  options: {
    dict: SpellDictionary;
    ignore: ReadonlySet<string>;
    skip?: readonly (readonly [number, number])[];
  },
): Misspelling[] {
  const { dict, skip = [] } = options;
  const ignore = new Set([...options.ignore].map((w) => w.toLowerCase()));
  const found: Misspelling[] = [];
  for (const chunk of text.matchAll(CHUNK)) {
    const [part] = chunk;
    if (WEB.test(part) || EMAIL.test(part) || DOMAIN.test(part)) continue;
    for (const match of part.matchAll(WORD)) {
      const word = match[0];
      const from = chunk.index + match.index;
      const to = from + word.length;
      if (
        word.length < 2 ||
        DIGIT.test(word) ||
        word === word.toUpperCase() ||
        ignore.has(word.toLowerCase()) ||
        skip.some(([a, b]) => from < b && to > a) ||
        dict.correct(straight(word))
      ) {
        continue;
      }
      found.push({ from, to, word });
    }
  }
  return found;
}

// nspell's own order is poor ("teh" → "the" comes 9th), so: two letters
// swapped first, then the typed word's capitalisation, then nspell's order.
export function suggestionsFor(word: string, dict: SpellDictionary): string[] {
  const curly = word.includes("’");
  const typed = word.toLowerCase();
  const seen = new Set<string>();
  return dict
    .suggest(straight(word))
    .map((s) => (curly ? s.replace(/'/g, "’") : s))
    .filter((s) => !seen.has(s) && seen.add(s))
    .map((s, i) => ({
      s,
      i,
      rank:
        (swapped(typed, s.toLowerCase()) ? 0 : 2) +
        (capitalised(s) === capitalised(word) ? 0 : 1),
    }))
    .sort((a, b) => a.rank - b.rank || a.i - b.i)
    .slice(0, MAX_SUGGESTIONS)
    .map(({ s }) => s);
}

function capitalised(word: string) {
  return word[0] !== word[0].toLowerCase();
}

// True when b is a with two letters next to each other swapped.
function swapped(a: string, b: string) {
  if (a.length !== b.length) return false;
  const diff: number[] = [];
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) diff.push(i);
  const [i, j] = diff;
  return diff.length === 2 && j === i + 1 && a[i] === b[j] && a[j] === b[i];
}
