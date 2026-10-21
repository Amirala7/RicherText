// The document model (ADR 0004, 0028). The list info lives at
// users/{uid}/documents/{id}; the editor JSON at …/{id}/content/current.
// firestore.rules enforces the same limits.

export const TITLE_MAX = 200;
export const SNIPPET_MAX = 200;

export type DocumentMeta = {
  title: string;
  snippet: string;
  createdAt: Date;
  updatedAt: Date;
};

// ProseMirror JSON, as Tiptap stores it (ADR 0006).
export type DocumentJson = {
  type: "doc";
  content?: Record<string, unknown>[];
};

// Firestore auto ids are 20 letters and digits; anything else could name
// another path.
export function isValidDocId(id: unknown): id is string {
  return typeof id === "string" && /^[A-Za-z0-9]{1,64}$/.test(id);
}

export function displayTitle(title: string): string {
  return title.trim() || "Untitled";
}

export function emptyContent(): DocumentJson {
  return { type: "doc", content: [{ type: "paragraph" }] };
}
