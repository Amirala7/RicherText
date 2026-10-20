import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { readFileSync } from "node:fs";
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

// Billing records are written only by the webhook; a user can read their own
// and nothing else (ADR 0003, 0027).
let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-richertext",
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

// Seeds overwrite in place; clearing the emulator would race other test files.
beforeEach(async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "customers/alice"), {
      stripeCustomerId: "cus_alice",
      plan: "paid",
    });
    await setDoc(doc(db, "customers/alice/subscriptions/sub_1"), {
      status: "active",
    });
    await setDoc(doc(db, "stripeEvents/evt_1"), { type: "x" });
  });
});

describe("firestore rules: customers", () => {
  it("lets a user read their own customer record", async () => {
    const db = env.authenticatedContext("alice").firestore();
    await assertSucceeds(getDoc(doc(db, "customers/alice")));
  });

  it("lets a user read their own subscriptions", async () => {
    const db = env.authenticatedContext("alice").firestore();
    await assertSucceeds(
      getDoc(doc(db, "customers/alice/subscriptions/sub_1")),
    );
  });

  it("denies reading someone else's records", async () => {
    const db = env.authenticatedContext("bob").firestore();
    await assertFails(getDoc(doc(db, "customers/alice")));
    await assertFails(getDoc(doc(db, "customers/alice/subscriptions/sub_1")));
  });

  it("denies signed-out reads", async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, "customers/alice")));
  });

  it("denies a user writing their own customer record", async () => {
    const db = env.authenticatedContext("alice").firestore();
    await assertFails(updateDoc(doc(db, "customers/alice"), { plan: "free" }));
    await assertFails(setDoc(doc(db, "customers/alice"), { plan: "paid" }));
    await assertFails(deleteDoc(doc(db, "customers/alice")));
  });

  it("denies a user creating a customer record", async () => {
    const db = env.authenticatedContext("carol").firestore();
    await assertFails(setDoc(doc(db, "customers/carol"), { plan: "paid" }));
  });

  it("denies a user writing their own subscriptions", async () => {
    const db = env.authenticatedContext("alice").firestore();
    await assertFails(
      setDoc(doc(db, "customers/alice/subscriptions/sub_2"), {
        status: "active",
      }),
    );
    await assertFails(
      updateDoc(doc(db, "customers/alice/subscriptions/sub_1"), {
        status: "canceled",
      }),
    );
  });

  it("denies any access to processed Stripe events", async () => {
    const db = env.authenticatedContext("alice").firestore();
    await assertFails(getDoc(doc(db, "stripeEvents/evt_1")));
    await assertFails(setDoc(doc(db, "stripeEvents/evt_2"), { type: "x" }));
  });
});
