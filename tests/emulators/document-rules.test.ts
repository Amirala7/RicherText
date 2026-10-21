import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { readFileSync } from "node:fs";
import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

// Documents (ADR 0004, 0020, 0028): the owner reads their own; documents are
// created and deleted only by the server route; the browser saves the title
// and the content. On Free only the newest document (users/{uid}.newestDocId,
// server-written) is editable; paid users edit them all.
let env: RulesTestEnvironment;

// Own uids, so other test files seeding customers/alice can't race these.
const FREE = "docs-free"; // customers record says free
const PAID = "docs-paid";
const NEW = "docs-new"; // no customers record at all
const OTHER = "docs-other";

const created = Timestamp.fromDate(new Date("2026-10-01T00:00:00Z"));

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
    for (const uid of [FREE, PAID, NEW]) {
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

const as = (uid: string) => env.authenticatedContext(uid).firestore();
const meta = (uid: string, id: string) =>
  doc(as(uid), `users/${uid}/documents/${id}`);
const content = (uid: string, id: string) =>
  doc(as(uid), `users/${uid}/documents/${id}/content/current`);
const rename = (title: unknown) => ({
  title,
  snippet: "",
  updatedAt: serverTimestamp(),
});
const body = (text: string) => ({
  doc: {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  },
  updatedAt: serverTimestamp(),
});

describe("document rules: reading", () => {
  it("lets the owner read and list their documents and content", async () => {
    await assertSucceeds(getDoc(meta(FREE, "d1")));
    await assertSucceeds(getDoc(content(FREE, "d1")));
    await assertSucceeds(
      getDocs(collection(as(FREE), `users/${FREE}/documents`)),
    );
  });

  it("denies other users and signed-out reads", async () => {
    const other = as(OTHER);
    await assertFails(getDoc(doc(other, `users/${FREE}/documents/d1`)));
    await assertFails(
      getDoc(doc(other, `users/${FREE}/documents/d1/content/current`)),
    );
    await assertFails(getDocs(collection(other, `users/${FREE}/documents`)));
    const anon = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(anon, `users/${FREE}/documents/d1`)));
  });
});

describe("document rules: creating and deleting is server-only", () => {
  it("denies the browser creating a document or its content", async () => {
    await assertFails(
      setDoc(meta(PAID, "d3"), {
        title: "",
        snippet: "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    );
    await assertFails(setDoc(content(PAID, "d3"), body("hi")));
  });

  it("denies the browser deleting a document or its content", async () => {
    await assertFails(deleteDoc(meta(PAID, "d1")));
    await assertFails(deleteDoc(content(PAID, "d1")));
  });

  it("denies other content paths than current", async () => {
    await assertFails(
      setDoc(
        doc(as(PAID), `users/${PAID}/documents/d1/content/old`),
        body("x"),
      ),
    );
  });
});

describe("document rules: editing on Free", () => {
  it("lets a Free user rename and write the newest document", async () => {
    await assertSucceeds(updateDoc(meta(FREE, "d2"), rename("Plan")));
    await assertSucceeds(setDoc(content(FREE, "d2"), body("hello")));
  });

  it("keeps older documents read-only on Free", async () => {
    await assertFails(updateDoc(meta(FREE, "d1"), rename("Plan")));
    await assertFails(setDoc(content(FREE, "d1"), body("hello")));
  });

  it("treats a user with no billing record as Free", async () => {
    await assertSucceeds(updateDoc(meta(NEW, "d2"), rename("Plan")));
    await assertFails(updateDoc(meta(NEW, "d1"), rename("Plan")));
    await assertFails(setDoc(content(NEW, "d1"), body("hello")));
  });
});

describe("document rules: editing on a paid plan", () => {
  it("lets a paid user edit any of their documents", async () => {
    await assertSucceeds(updateDoc(meta(PAID, "d1"), rename("Old")));
    await assertSucceeds(setDoc(content(PAID, "d1"), body("hello")));
  });

  it("denies editing someone else's document", async () => {
    await assertFails(
      updateDoc(doc(as(OTHER), `users/${PAID}/documents/d1`), rename("x")),
    );
    await assertFails(
      setDoc(
        doc(as(OTHER), `users/${PAID}/documents/d1/content/current`),
        body("x"),
      ),
    );
  });
});

describe("document rules: what an edit may contain", () => {
  it("accepts a title of up to 200 characters", async () => {
    await assertSucceeds(updateDoc(meta(PAID, "d1"), rename("x".repeat(200))));
    await assertFails(updateDoc(meta(PAID, "d1"), rename("x".repeat(201))));
    await assertFails(updateDoc(meta(PAID, "d1"), rename(42)));
  });

  it("accepts a snippet of up to 200 characters", async () => {
    await assertSucceeds(
      updateDoc(meta(PAID, "d1"), {
        snippet: "x".repeat(200),
        updatedAt: serverTimestamp(),
      }),
    );
    await assertFails(
      updateDoc(meta(PAID, "d1"), {
        snippet: "x".repeat(201),
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it("requires updatedAt to be the server time", async () => {
    await assertFails(updateDoc(meta(PAID, "d1"), { title: "x" }));
    await assertFails(
      updateDoc(meta(PAID, "d1"), { title: "x", updatedAt: created }),
    );
    await assertFails(
      setDoc(content(PAID, "d1"), {
        doc: { type: "doc", content: [] },
        updatedAt: created,
      }),
    );
  });

  it("denies changing createdAt or adding fields", async () => {
    await assertFails(
      updateDoc(meta(PAID, "d1"), {
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    );
    await assertFails(
      updateDoc(meta(PAID, "d1"), {
        plan: "paid",
        updatedAt: serverTimestamp(),
      }),
    );
    await assertFails(
      setDoc(content(PAID, "d1"), { ...body("x"), extra: true }),
    );
  });

  it("requires the content to be a ProseMirror doc", async () => {
    await assertFails(
      setDoc(content(PAID, "d1"), {
        doc: "plain text",
        updatedAt: serverTimestamp(),
      }),
    );
    await assertFails(
      setDoc(content(PAID, "d1"), {
        doc: { type: "paragraph" },
        updatedAt: serverTimestamp(),
      }),
    );
  });
});

describe("document rules: the editable pointer", () => {
  it("denies the browser reading or moving newestDocId", async () => {
    await assertFails(getDoc(doc(as(FREE), `users/${FREE}`)));
    await assertFails(
      setDoc(doc(as(FREE), `users/${FREE}`), { newestDocId: "d1" }),
    );
  });
});
