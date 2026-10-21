import type { Extensions } from "@tiptap/core";
import { Placeholder } from "@tiptap/extensions";
import StarterKit from "@tiptap/starter-kit";

// The one document schema (ADR 0006), exactly CONTEXT §5: paragraphs,
// headings 1–3, bold, italic, underline, strikethrough, lists, links, quotes.
// Shared by the editor and anything that renders saved documents, so a paste
// can't bring in anything else (code, rules, images, tables are dropped,
// their text kept). Changing it needs a migration plan for saved documents.
const LINK = /^(https?:|mailto:)/i;

export function documentExtensions(): Extensions {
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
      },
    }),
  ];
}

// The editor adds what only matters while writing (ADR 0024, empty document).
export function editorExtensions(): Extensions {
  return [
    ...documentExtensions(),
    Placeholder.configure({ placeholder: "Start writing…" }),
  ];
}
