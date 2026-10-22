import type { Extensions } from "@tiptap/core";
import { Placeholder } from "@tiptap/extensions";
import StarterKit from "@tiptap/starter-kit";
import { PasteCleanup } from "./paste";
import { PlainTextLock } from "./plain-text";
import { TextColorMark, TextSizeMark, TextStyleClipboard } from "./text-style";

// The one document schema (ADR 0006), exactly CONTEXT §5: paragraphs,
// headings 1–3, bold, italic, underline, strikethrough, lists, links, quotes,
// and text size and colour (ADR 0031).
// Shared by the editor and anything that renders saved documents, so a paste
// can't bring in anything else (code, rules, images, tables are dropped,
// their text kept). Changing it needs a migration plan for saved documents.
const LINK = /^(https?:|mailto:)/i;

// `locked` is the Free plan's plain-text lock (ADR 0035): while it's true,
// typed addresses aren't linked.
type Options = { locked?: () => boolean };

export function documentExtensions({
  locked = () => false,
}: Options = {}): Extensions {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      code: false,
      codeBlock: false,
      horizontalRule: false,
      // No invisible empty paragraph at the end: Select All would format it
      // too, and saved documents stay as written.
      trailingNode: false,
      link: {
        openOnClick: false,
        autolink: true,
        isAllowedUri: (url) => LINK.test(url.trim()),
        shouldAutoLink: (url) => !locked() && LINK.test(url.trim()),
      },
    }),
    TextSizeMark,
    TextColorMark,
  ];
}

// The editor adds what only matters while writing: the empty-document
// placeholder (ADR 0024), the paste clean-up (ADR 0030) and copying text
// size and colour as inline styles (ADR 0031), and the Free plan's
// plain-text lock (ADR 0035).
export function editorExtensions(options: Options = {}): Extensions {
  return [
    ...documentExtensions(options),
    PlainTextLock.configure({ locked: options.locked ?? (() => false) }),
    Placeholder.configure({ placeholder: "Start writing…" }),
    PasteCleanup,
    TextStyleClipboard,
  ];
}
