import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { readFileSync } from "node:fs";
import {
  Timestamp,
  doc,
  getDoc,
  setDoc,
  type Firestore,
} from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { loadDocument, saveDocument } from "@/lib/documents/client";

// Autosave's write (Phase 4 slice 3, ADR 0028): title, snippet and content in
// one batch from the browser, accepted by the document rules.
let env: RulesTestEnvironment;

const FREE = "save-free";
const PAID = "save-paid";
const created = Timestamp.fromDate(new Date("2026-10-01T00:00:00Z"));
const body = {
  type: "doc" as const,
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "Plan" }],
    },
    { type: "paragraph", content: [{ type: "text", text: "Ship it." }] },
  ],
};

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-richertext",
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, `customers/${FREE}`), { plan: "free" });
    await setDoc(doc(db, `customers/${PAID}`), { plan: "paid" });
    for (const uid of [FREE, PAID]) {
      await setDoc(doc(db, `users/${uid}`), { newestDocId: "d2" });
      for (const id of ["d1", "d2"]) {
        await setDoc(doc(db, `users/${uid}/documents/${id}`), {
          title: "",
          snippet: "",
          createdAt: created,
          updatedAt: created,
        });
        await setDoc(doc(db, `users/${uid}/documents/${id}/content/current`), {
          doc: { type: "doc", content: [{ type: "paragraph" }] },
          updatedAt: created,
        });
      }
    }
  });
});

const as = (uid: string) =>
  env.authenticatedContext(uid).firestore() as unknown as Firestore;

describe("saveDocument", () => {
  it("saves title, snippet and content together", async () => {
    const db = as(PAID);
    await assertSucceeds(
      saveDocument(db, PAID, "d1", { title: "Q4 plan", doc: body }),
    );
    const meta = await getDoc(doc(db, `users/${PAID}/documents/d1`));
    expect(meta.get("title")).toBe("Q4 plan");
    expect(meta.get("snippet")).toBe("Plan Ship it.");
    expect(meta.get("updatedAt").toMillis()).toBeGreaterThan(
      created.toMillis(),
    );
    const content = await getDoc(
      doc(db, `users/${PAID}/documents/d1/content/current`),
    );
    expect(content.get("doc")).toEqual(body);
  });

  it("saves a title on its own without touching the content", async () => {
    const db = as(PAID);
    await assertSucceeds(saveDocument(db, PAID, "d1", { title: "Only" }));
    const content = await getDoc(
      doc(db, `users/${PAID}/documents/d1/content/current`),
    );
    expect(content.get("updatedAt").toMillis()).toBe(created.toMillis());
  });

  it("saves the newest document on Free", async () => {
    await assertSucceeds(saveDocument(as(FREE), FREE, "d2", { doc: body }));
  });

  it("is refused for an older document on Free (read-only)", async () => {
    await assertFails(saveDocument(as(FREE), FREE, "d1", { doc: body }));
  });

  it("is refused for someone else's document", async () => {
    await assertFails(saveDocument(as(FREE), PAID, "d1", { title: "x" }));
  });
});

// Writing font (ADR 0032): saved with the document by autosave; a document
// that never had one opens in Geist.
describe("the document's writing font", () => {
  it("opens in Geist when none was saved", async () => {
    const opened = await loadDocument(as(PAID), PAID, "d1");
    expect(opened?.font).toBe("geist");
  });

  it("saves the font on its own and opens with it", async () => {
    const db = as(PAID);
    await assertSucceeds(saveDocument(db, PAID, "d1", { font: "plex-serif" }));
    const content = await getDoc(
      doc(db, `users/${PAID}/documents/d1/content/current`),
    );
    expect(content.get("updatedAt").toMillis()).toBe(created.toMillis());
    expect((await loadDocument(db, PAID, "d1"))?.font).toBe("plex-serif");
    expect((await loadDocument(db, PAID, "d2"))?.font).toBe("geist");
  });

  it("is refused for an older document on Free (read-only)", async () => {
    await assertFails(
      saveDocument(as(FREE), FREE, "d1", { font: "plex-serif" }),
    );
  });
});
