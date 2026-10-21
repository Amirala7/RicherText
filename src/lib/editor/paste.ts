import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

// Paste clean-up (ADR 0030, slice 4): fixes what the schema alone can't read
// before the pasted HTML is parsed.
// - Links: no underline mark inside a link (Google Docs underlines link text
//   with a span; links look underlined anyway, and the mark would stay behind
//   if the link were removed).
// - Word (and Outlook for Windows, which writes with Word): list paragraphs
//   (mso-list, the bullet or number as text) become real nested lists, and
//   the Quote styles become quotes.
export const PasteCleanup = Extension.create({
  name: "pasteCleanup",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("pasteCleanup"),
        props: { transformPastedHTML: cleanPastedHtml },
      }),
    ];
  },
});

const UNDERLINE = /text-decoration[^;]*underline/i;
const MSO_LIST = /mso-list:\s*(l\d+)\s+level(\d+)/i;
const MSO_IGNORE = /mso-list:\s*ignore/i;
// "1." "a)" "iv." "(2)": numbered; anything else ("·", "o", "§") is a bullet.
const NUMBERED = /^\(?[0-9a-z]{1,4}[.)]$/i;

export function cleanPastedHtml(html: string): string {
  const word = /mso-list|class="?Mso(Intense)?Quote/i.test(html);
  if (!word && !/<a[\s>]/i.test(html)) return html;
  const body = new DOMParser().parseFromString(html, "text/html").body;
  unwrapLinkUnderlines(body);
  if (word) {
    wordLists(body);
    wordQuotes(body);
  }
  return body.innerHTML;
}

function unwrapLinkUnderlines(root: HTMLElement) {
  for (const a of root.querySelectorAll("a")) {
    for (const el of [a, ...a.querySelectorAll<HTMLElement>("*")]) {
      if (UNDERLINE.test(el.getAttribute("style") ?? ""))
        el.style.textDecoration = "none";
      if (el.tagName === "U") el.replaceWith(...el.childNodes);
    }
  }
}

type Open = { level: number; list: HTMLElement; numbered: boolean };

function wordLists(root: HTMLElement) {
  const doc = root.ownerDocument;
  let stack: Open[] = [];
  let listId = "";

  for (const p of [...root.querySelectorAll<HTMLElement>("p")]) {
    const match = MSO_LIST.exec(p.getAttribute("style") ?? "");
    if (!match) continue;
    // A run goes on while the paragraphs follow each other in one Word list.
    if (match[1] !== listId || p.previousElementSibling !== stack[0]?.list)
      stack = [];
    listId = match[1];
    const level = Number(match[2]);
    const numbered = NUMBERED.test(takeMarker(p));

    while (stack.length && stack[stack.length - 1].level > level) stack.pop();
    const top = stack[stack.length - 1];
    if (top?.level === level && top.numbered !== numbered) stack.pop();
    if (stack[stack.length - 1]?.level !== level) {
      const list = doc.createElement(numbered ? "ol" : "ul");
      const parent = stack[stack.length - 1];
      if (parent) parent.list.lastElementChild!.append(list);
      else p.before(list);
      stack.push({ level, list, numbered });
    }

    const item = doc.createElement("li");
    const text = doc.createElement("p");
    text.append(...p.childNodes);
    item.append(text);
    stack[stack.length - 1].list.append(item);
    p.remove();
  }
}

// Removes Word's bullet or number (the mso-list:Ignore span) and returns it.
function takeMarker(p: HTMLElement): string {
  for (const span of p.querySelectorAll<HTMLElement>("span")) {
    if (!MSO_IGNORE.test(span.getAttribute("style") ?? "")) continue;
    const marker = (span.firstChild?.textContent ?? "").trim();
    let gone: Element = span;
    while (
      gone.parentElement &&
      gone.parentElement !== p &&
      gone.parentElement.textContent === gone.textContent
    )
      gone = gone.parentElement;
    gone.remove();
    return marker;
  }
  return "";
}

function wordQuotes(root: HTMLElement) {
  for (const p of root.querySelectorAll("p.MsoQuote, p.MsoIntenseQuote")) {
    const previous = p.previousElementSibling;
    if (previous?.tagName === "BLOCKQUOTE") previous.append(p);
    else {
      const quote = root.ownerDocument.createElement("blockquote");
      p.before(quote);
      quote.append(p);
    }
  }
}
