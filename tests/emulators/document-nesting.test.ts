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
  serverTimestamp,
  setDoc,
  type Firestore,
} from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { loadDocument, saveDocument } from "@/lib/documents/client";
import type { DocumentJson } from "@/lib/documents/model";

// Content as a JSON string (ADR 0033): lists nest past Firestore's 20-level
// map limit, and the rules check the string instead of the map.
let env: RulesTestEnvironment;

const PAID = "nest-paid";
const created = Timestamp.fromDate(new Date("2026-10-01T00:00:00Z"));

const nested = (levels: number): DocumentJson => {
  let item: Record<string, unknown> = {
    type: "listItem",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "deep",
            marks: [{ type: "textStyle", attrs: { color: "red" } }],
          },
        ],
      },
    ],
  };
  for (let i = 0; i < levels; i++) {
    item = {
      type: "listItem",
      content: [{ type: "paragraph" }, { type: "bulletList", content: [item] }],
    };
  }
  return { type: "doc", content: [{ type: "bulletList", content: [item] }] };
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
    await setDoc(doc(db, `customers/${PAID}`), { plan: "paid" });
    await setDoc(doc(db, `users/${PAID}`), { newestDocId: "d1" });
    await setDoc(doc(db, `users/${PAID}/documents/d1`), {
      title: "",
      snippet: "",
      createdAt: created,
      updatedAt: created,
    });
    await setDoc(doc(db, `users/${PAID}/documents/d1/content/current`), {
      doc: '{"type":"doc","content":[{"type":"paragraph"}]}',
      updatedAt: created,
    });
  });
});

const db = () =>
  env.authenticatedContext(PAID).firestore() as unknown as Firestore;
const content = () => doc(db(), `users/${PAID}/documents/d1/content/current`);

describe("deeply nested content", () => {
  it("saves and reloads a list indented eight times", async () => {
    const body = nested(8);
    await assertSucceeds(saveDocument(db(), PAID, "d1", { doc: body }));
    expect((await loadDocument(db(), PAID, "d1"))?.doc).toEqual(body);
  });

  it("still opens content saved as a map before ADR 0033", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(
        doc(ctx.firestore(), `users/${PAID}/documents/d1/content/current`),
        { doc: nested(1), updatedAt: created },
      );
    });
    expect((await loadDocument(db(), PAID, "d1"))?.doc).toEqual(nested(1));
  });
});

describe("content rules for the JSON string", () => {
  it("accept a ProseMirror document as a string", async () => {
    await assertSucceeds(
      setDoc(content(), {
        doc: '{"type":"doc","content":[]}',
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it("reject a map, a non-document string and an oversized string", async () => {
    await assertFails(
      setDoc(content(), {
        doc: { type: "doc", content: [] },
        updatedAt: serverTimestamp(),
      }),
    );
    await assertFails(
      setDoc(content(), {
        doc: '{"type":"paragraph"}',
        updatedAt: serverTimestamp(),
      }),
    );
    await assertFails(
      setDoc(content(), {
        doc: `{"type":"doc","content":[],"x":"${"a".repeat(900_000)}"}`,
        updatedAt: serverTimestamp(),
      }),
    );
  });
});
