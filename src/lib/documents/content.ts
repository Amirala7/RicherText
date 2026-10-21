import { emptyContent, type DocumentJson } from "./model";

// Content is stored as a JSON string, not a Firestore map: maps can't nest
// past 20 levels, which a list indented three times already reaches
// (ADR 0033). firestore.rules enforces the same cap and opening.
export const CONTENT_MAX = 900_000;

// `type` first, so the rules can check the opening of the string.
export function encodeContent(doc: DocumentJson): string {
  const { type, ...rest } = doc;
  return JSON.stringify({ type, ...rest });
}

// Strings are parsed; a map saved before ADR 0033 is used as is. Anything
// else throws, so a broken record is never shown (and saved over) as empty.
export function decodeContent(stored: unknown): DocumentJson {
  if (stored === undefined || stored === null) return emptyContent();
  const value: unknown =
    typeof stored === "string" ? JSON.parse(stored) : stored;
  if (
    typeof value !== "object" ||
    value === null ||
    (value as { type?: unknown }).type !== "doc"
  ) {
    throw new Error("Stored content is not a ProseMirror document");
  }
  return value as DocumentJson;
}
