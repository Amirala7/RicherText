import { displayTitle } from "./model";

// The document list (ADR 0024, 0028).
export type ListedDocument = {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
};

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

// The part after "Edited" in a row's meta: "2 min ago", "yesterday", "12 Oct".
export function sinceEdited(updatedAt: Date, now: Date): string {
  const elapsed = now.getTime() - updatedAt.getTime();
  if (elapsed < MIN) return "just now";
  if (elapsed < HOUR) return `${Math.floor(elapsed / MIN)} min ago`;
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)} h ago`;
  if (elapsed < 2 * DAY) return "yesterday";
  return updatedAt.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    ...(updatedAt.getFullYear() !== now.getFullYear()
      ? { year: "numeric" }
      : {}),
  });
}

// Titles only, case-insensitive, matching what the row shows (CONTEXT §5).
export function filterDocuments<T extends ListedDocument>(
  documents: T[],
  query: string,
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return documents;
  return documents.filter((d) =>
    displayTitle(d.title).toLowerCase().includes(q),
  );
}

// Mirrors the rules: everything on a paid plan, otherwise only the newest
// document by creation (ADR 0028).
export function editableIds(
  documents: ListedDocument[],
  paid: boolean,
): Set<string> {
  if (paid) return new Set(documents.map((d) => d.id));
  const newest = documents.reduce<ListedDocument | null>(
    (best, d) => (!best || d.createdAt > best.createdAt ? d : best),
    null,
  );
  return new Set(newest ? [newest.id] : []);
}
