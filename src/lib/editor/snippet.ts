import { SNIPPET_MAX, type DocumentJson } from "@/lib/documents/model";

type Node = { text?: string; content?: Node[] };

function textOf(node: Node): string {
  if (node.text) return node.text;
  return (node.content ?? []).map(textOf).join(" ");
}

// The opening text, saved beside the title (ADR 0028). Cut by code point, so
// an emoji is never split in half.
export function snippetOf(doc: DocumentJson): string {
  const text = textOf(doc as Node)
    .replace(/\s+/g, " ")
    .trim();
  const chars = Array.from(text);
  let out = "";
  for (const c of chars) {
    if (out.length + c.length > SNIPPET_MAX) break;
    out += c;
  }
  return out;
}
