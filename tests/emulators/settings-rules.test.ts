import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { readFileSync } from "node:fs";
import { deleteDoc, doc, getDoc, setDoc } from "firebase/firestore";
import { afterAll, beforeAll, describe, it } from "vitest";

// Writing settings (ADR 0010, 0031): users/{uid}/settings/writing holds the
// writing font, one of the offered fonts. Only its owner reads and writes it.
let env: RulesTestEnvironment;
const ME = "settings-me";
const OTHER = "settings-other";

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-richertext",
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

const writing = (as: string, uid = as) =>
  doc(
    env.authenticatedContext(as).firestore(),
    `users/${uid}/settings/writing`,
  );

describe("writing settings rules", () => {
  it("lets the owner set and read the writing font", async () => {
    await assertSucceeds(setDoc(writing(ME), { font: "plex-serif" }));
    await assertSucceeds(setDoc(writing(ME), { font: "geist" }));
    await assertSucceeds(getDoc(writing(ME)));
  });

  it("refuses fonts that aren't offered and other fields", async () => {
    await assertFails(setDoc(writing(ME), { font: "comic-sans" }));
    await assertFails(setDoc(writing(ME), { font: 3 }));
    await assertFails(setDoc(writing(ME), { font: "geist", theme: "dark" }));
  });

  it("keeps other users and signed-out visitors out", async () => {
    await assertFails(getDoc(writing(OTHER, ME)));
    await assertFails(setDoc(writing(OTHER, ME), { font: "geist" }));
    const anon = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(anon, `users/${ME}/settings/writing`)));
  });

  it("doesn't open other settings documents or deleting", async () => {
    await assertFails(
      setDoc(
        doc(
          env.authenticatedContext(ME).firestore(),
          `users/${ME}/settings/other`,
        ),
        {
          font: "geist",
        },
      ),
    );
    await assertFails(deleteDoc(writing(ME)));
  });
});
