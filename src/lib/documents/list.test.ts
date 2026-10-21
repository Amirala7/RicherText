import { describe, expect, it } from "vitest";
import { editableIds, filterDocuments, sinceEdited } from "./list";

// The document list (ADR 0024, 0028): "Edited 2 min ago", the title filter,
// and which documents can be edited (all on a paid plan, otherwise only the
// newest by creation).
const now = new Date("2026-10-21T12:00:00Z");
const ago = (ms: number) => new Date(now.getTime() - ms);
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe("sinceEdited", () => {
  it("says just now under a minute", () => {
    expect(sinceEdited(ago(30_000), now)).toBe("just now");
    expect(sinceEdited(ago(-5_000), now)).toBe("just now");
  });

  it("counts minutes, then hours", () => {
    expect(sinceEdited(ago(MIN), now)).toBe("1 min ago");
    expect(sinceEdited(ago(59 * MIN), now)).toBe("59 min ago");
    expect(sinceEdited(ago(HOUR), now)).toBe("1 h ago");
    expect(sinceEdited(ago(23 * HOUR), now)).toBe("23 h ago");
  });

  it("says yesterday, then the date", () => {
    expect(sinceEdited(ago(DAY + HOUR), now)).toBe("yesterday");
    expect(sinceEdited(new Date("2026-10-12T09:00:00Z"), now)).toBe("12 Oct");
  });

  it("adds the year for earlier years", () => {
    expect(sinceEdited(new Date("2025-03-04T09:00:00Z"), now)).toBe(
      "4 Mar 2025",
    );
  });
});

const docs = [
  {
    id: "a",
    title: "Meeting notes",
    createdAt: ago(3 * DAY),
    updatedAt: ago(MIN),
  },
  { id: "b", title: "", createdAt: ago(DAY), updatedAt: ago(2 * DAY) },
  { id: "c", title: "Q4 plan", createdAt: ago(2 * DAY), updatedAt: ago(HOUR) },
];

describe("filterDocuments", () => {
  it("keeps everything for an empty filter", () => {
    expect(filterDocuments(docs, "  ").map((d) => d.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("matches titles case-insensitively, Untitled included", () => {
    expect(filterDocuments(docs, "PLAN").map((d) => d.id)).toEqual(["c"]);
    expect(filterDocuments(docs, "untit").map((d) => d.id)).toEqual(["b"]);
  });
});

describe("editableIds", () => {
  it("lets a paid user edit everything", () => {
    expect([...editableIds(docs, true)].sort()).toEqual(["a", "b", "c"]);
  });

  it("on Free, only the newest by creation", () => {
    expect([...editableIds(docs, false)]).toEqual(["b"]);
    expect([...editableIds([], false)]).toEqual([]);
  });
});
