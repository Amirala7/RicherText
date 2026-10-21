import { deleteApp, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDocument, deleteDocument } from "@/lib/documents/core";

// Creating and deleting documents on the server (ADR 0028), against the
// Firestore emulator: the Free limit of one document at a time (ADR 0020)
// and the newestDocId pointer the rules use to keep one document editable.
let app: App;
let db: Firestore;

beforeAll(() => {
  app = initializeApp({ projectId: "demo-richertext" }, "documents-test");
  db = getFirestore(app);
});

afterAll(async () => {
  await deleteApp(app);
});

const newUid = () => `user-${crypto.randomUUID()}`;

async function paidUser() {
  const uid = newUid();
  await db.doc(`customers/${uid}`).set({ plan: "paid" });
  return uid;
}

async function created(uid: string) {
  const result = await createDocument({ uid }, { db });
  if (result.kind !== "created") throw new Error(`not created: ${result.kind}`);
  return result.id;
}

const newest = async (uid: string) =>
  (await db.doc(`users/${uid}`).get()).get("newestDocId");
const docIds = async (uid: string) =>
  (await db.collection(`users/${uid}/documents`).get()).docs.map((d) => d.id);

describe("createDocument", () => {
  it("creates an untitled document with empty content", async () => {
    const uid = newUid();
    const id = await created(uid);

    const meta = await db.doc(`users/${uid}/documents/${id}`).get();
    expect(meta.get("title")).toBe("");
    expect(meta.get("snippet")).toBe("");
    expect(meta.get("createdAt")).toBeDefined();
    expect(meta.get("updatedAt")).toBeDefined();
    const content = await db
      .doc(`users/${uid}/documents/${id}/content/current`)
      .get();
    // Stored as a JSON string (ADR 0033).
    expect(JSON.parse(content.get("doc"))).toEqual({
      type: "doc",
      content: [{ type: "paragraph" }],
    });
  });

  it("points newestDocId at the new document", async () => {
    const uid = await paidUser();
    await created(uid);
    const second = await created(uid);
    expect(await newest(uid)).toBe(second);
  });

  it("refuses a second document on Free", async () => {
    const uid = newUid();
    const first = await created(uid);

    expect(await createDocument({ uid }, { db })).toEqual({ kind: "limit" });
    expect(await docIds(uid)).toEqual([first]);
    expect(await newest(uid)).toBe(first);
  });

  it("treats a customers record that says free as Free", async () => {
    const uid = newUid();
    await db.doc(`customers/${uid}`).set({ plan: "free" });
    await created(uid);
    expect(await createDocument({ uid }, { db })).toEqual({ kind: "limit" });
  });

  it("lets only one of two simultaneous Free creates through", async () => {
    const uid = newUid();
    const results = await Promise.all([
      createDocument({ uid }, { db }),
      createDocument({ uid }, { db }),
    ]);
    expect(results.map((r) => r.kind).sort()).toEqual(["created", "limit"]);
    expect(await docIds(uid)).toHaveLength(1);
  });

  it("lets a paid user create as many as they like", async () => {
    const uid = await paidUser();
    for (let i = 0; i < 3; i++) await created(uid);
    expect(await docIds(uid)).toHaveLength(3);
  });

  it("lets a Free user create again after deleting their document", async () => {
    const uid = newUid();
    const first = await created(uid);
    await deleteDocument({ uid, id: first }, { db });
    const second = await created(uid);
    expect(await docIds(uid)).toEqual([second]);
  });
});

describe("deleteDocument", () => {
  it("deletes the document and its content", async () => {
    const uid = await paidUser();
    const id = await created(uid);

    expect(await deleteDocument({ uid, id }, { db })).toEqual({
      kind: "deleted",
    });
    expect((await db.doc(`users/${uid}/documents/${id}`).get()).exists).toBe(
      false,
    );
    expect(
      (await db.doc(`users/${uid}/documents/${id}/content/current`).get())
        .exists,
    ).toBe(false);
  });

  it("says not-found for a document that isn't there", async () => {
    const uid = newUid();
    expect(await deleteDocument({ uid, id: "missing" }, { db })).toEqual({
      kind: "not-found",
    });
  });

  it("never touches another user's document", async () => {
    const owner = newUid();
    const id = await created(owner);
    expect(await deleteDocument({ uid: newUid(), id }, { db })).toEqual({
      kind: "not-found",
    });
    expect(await docIds(owner)).toEqual([id]);
  });

  it("moves newestDocId to the next newest when the newest goes", async () => {
    const uid = await paidUser();
    const first = await created(uid);
    const second = await created(uid);
    const third = await created(uid);

    await deleteDocument({ uid, id: third }, { db });
    expect(await newest(uid)).toBe(second);
    await deleteDocument({ uid, id: first }, { db });
    expect(await newest(uid)).toBe(second);
  });

  it("clears newestDocId when the last document goes", async () => {
    const uid = newUid();
    const id = await created(uid);
    await deleteDocument({ uid, id }, { db });
    expect(await newest(uid)).toBeNull();
  });

  it("after a downgrade, deleting down to one keeps the newest editable", async () => {
    const uid = await paidUser();
    const first = await created(uid);
    const second = await created(uid);
    await db.doc(`customers/${uid}`).set({ plan: "free" });

    expect(await createDocument({ uid }, { db })).toEqual({ kind: "limit" });
    expect(await newest(uid)).toBe(second);
    await deleteDocument({ uid, id: second }, { db });
    expect(await newest(uid)).toBe(first);
    expect(await createDocument({ uid }, { db })).toEqual({ kind: "limit" });
  });
});
