// The hero's typed line and keyboard (ADR 0021, DESIGN.md §4 Hero): the copy,
// the Mac keyboard layout, and the pure helpers the hero animation uses.
export type Mark = "" | "b" | "i" | "u";
export type Segment = [text: string, mark: Mark];
export type Line = Segment[];
export type TypedChar = { c: string; m: Mark };

export const HEADLINE = "Rich text, minus the clutter.";

export const ROTATION: Line[] = [
  [
    ["Draft the ", ""],
    ["proposal", "b"],
    [".", ""],
  ],
  [
    ["Never", "i"],
    [" lose a sentence.", ""],
  ],
  [
    ["Paste it ", ""],
    ["anywhere", "u"],
    [", intact.", ""],
  ],
];

export type Key = {
  id: string;
  label: string;
  width?: number;
  mod?: boolean;
  centred?: boolean;
  accent?: boolean;
};

const chars = (s: string): Key[] =>
  s.split("").map((c) => ({ id: c, label: c }));

export const KEY_ROWS: Key[][] = [
  [
    { id: "esc", label: "esc", width: 1.5, mod: true },
    ...chars("1234567890-="),
    { id: "delete", label: "delete", width: 1.5, mod: true },
  ],
  [
    { id: "tab", label: "tab", width: 1.5, mod: true },
    ...chars("qwertyuiop[]"),
    { id: "\\", label: "\\", width: 1.5 },
  ],
  [
    { id: "caps", label: "caps lock", width: 1.75, mod: true },
    ...chars("asdfghjkl;'"),
    { id: "return", label: "return", width: 2.25, mod: true, accent: true },
  ],
  [
    { id: "shiftl", label: "shift", width: 2.25, mod: true },
    ...chars("zxcvbnm,./"),
    { id: "shiftr", label: "shift", width: 2.75, mod: true },
  ],
  [
    { id: "fn", label: "fn", mod: true },
    { id: "ctrl", label: "control", mod: true },
    { id: "optl", label: "option", mod: true },
    { id: "cmdl", label: "⌘", width: 1.25, mod: true, centred: true },
    { id: "space", label: "", width: 4.5 },
    { id: "cmdr", label: "⌘", width: 1.25, mod: true, centred: true },
    { id: "optr", label: "option", mod: true },
    { id: "left", label: "←", centred: true },
    { id: "up", label: "↑", centred: true },
    { id: "down", label: "↓", centred: true },
    { id: "right", label: "→", centred: true },
  ],
];

const SHIFTED: Record<string, string> = {
  "!": "1",
  "@": "2",
  "#": "3",
  $: "4",
  "%": "5",
  "^": "6",
  "&": "7",
  "*": "8",
  "(": "9",
  ")": "0",
  _: "-",
  "+": "=",
  "{": "[",
  "}": "]",
  "|": "\\",
  ":": ";",
  '"': "'",
  "<": ",",
  ">": ".",
  "?": "/",
};

const CODES: Record<string, string> = {
  Minus: "-",
  Equal: "=",
  BracketLeft: "[",
  BracketRight: "]",
  Backslash: "\\",
  Semicolon: ";",
  Quote: "'",
  Comma: ",",
  Period: ".",
  Slash: "/",
  Space: "space",
  Backspace: "delete",
  Enter: "return",
  Tab: "tab",
  CapsLock: "caps",
  ShiftLeft: "shiftl",
  ShiftRight: "shiftr",
  MetaLeft: "cmdl",
  MetaRight: "cmdr",
  AltLeft: "optl",
  AltRight: "optr",
  ControlLeft: "ctrl",
  ControlRight: "ctrl",
  Escape: "esc",
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "up",
  ArrowDown: "down",
};

/** The keycaps pressed to type one character. */
export function charKeys(ch: string): string[] {
  if (ch === " ") return ["space"];
  if (/[A-Z]/.test(ch)) return ["shiftl", ch.toLowerCase()];
  if (SHIFTED[ch]) return ["shiftl", SHIFTED[ch]];
  return [ch.toLowerCase()];
}

/** The keycap for a physical key (KeyboardEvent.code), if the keyboard has one. */
export function codeToKeyId(code: string): string | undefined {
  if (/^Key[A-Z]$/.test(code)) return code[3].toLowerCase();
  if (/^Digit\d$/.test(code)) return code[5];
  return CODES[code];
}

export function lineToChars(line: Line): TypedChar[] {
  return line.flatMap(([text, m]) => [...text].map((c) => ({ c, m })));
}

function runs(typed: TypedChar[]): Line {
  const line: Line = [];
  for (const { c, m } of typed) {
    const last = line[line.length - 1];
    if (last && last[1] === m) last[0] += c;
    else line.push([c, m]);
  }
  return line;
}

/** Typed characters as a line; null when there's nothing but spaces. */
export function charsToLine(typed: TypedChar[]): Line | null {
  return typed.some(({ c }) => c.trim()) ? runs(typed) : null;
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** HTML for the typed line: runs of one mark share a <b>, <i> or <u>. */
export function renderChars(typed: TypedChar[]): string {
  return runs(typed)
    .map(([text, m]) =>
      m ? `<${m}>${escapeHtml(text)}</${m}>` : escapeHtml(text),
    )
    .join("");
}

/** The visitor's lines join the rotation: last three, no repeats. */
export function rememberLine(queue: Line[], line: Line): Line[] {
  const key = JSON.stringify(line);
  return queue
    .filter((l) => JSON.stringify(l) !== key)
    .concat([line])
    .slice(-3);
}
