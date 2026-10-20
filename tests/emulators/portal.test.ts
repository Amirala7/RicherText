import { deleteApp, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startPortal } from "@/lib/billing/portal-core";

// Opening the Stripe Customer Portal (ADR 0027) against the Firestore
// emulator, with a fake Stripe, so no keys or network are needed.
let app: App;
let db: Firestore;

beforeAll(() => {
  app = initializeApp({ projectId: "demo-richertext" }, "portal-test");
  db = getFirestore(app);
});

afterAll(async () => {
  await deleteApp(app);
});

function fakeStripe(
  configurations = [
    { id: "bpc_other", metadata: {} },
    { id: "bpc_richertext", metadata: { app: "richertext" } },
  ],
) {
  const sessions: Record<string, unknown>[] = [];
  const configLookups: Record<string, unknown>[] = [];
  return {
    sessions,
    configLookups,
    client: {
      billingPortal: {
        configurations: {
          list: async (params: Record<string, unknown>) => {
            configLookups.push(params);
            return { data: configurations };
          },
        },
        sessions: {
          create: async (params: Record<string, unknown>) => {
            sessions.push(params);
            return { url: "https://billing.stripe.test/p/session_1" };
          },
        },
      },
    },
  };
}

const newUid = () => `user-${crypto.randomUUID()}`;
const origin = "http://localhost:3000";

describe("startPortal", () => {
  it("opens the Portal for the user's customer with the app's configuration", async () => {
    const uid = newUid();
    await db
      .doc(`customers/${uid}`)
      .set({ stripeCustomerId: "cus_1", plan: "paid" });
    const stripe = fakeStripe();

    const result = await startPortal(
      { uid, origin },
      { db, stripe: stripe.client },
    );

    expect(result).toEqual({
      kind: "portal",
      url: "https://billing.stripe.test/p/session_1",
    });
    expect(stripe.configLookups).toEqual([{ active: true, limit: 100 }]);
    expect(stripe.sessions).toEqual([
      {
        customer: "cus_1",
        configuration: "bpc_richertext",
        return_url: `${origin}/account`,
      },
    ]);
  });

  it("has nothing to open for a user who never went to Checkout", async () => {
    const uid = newUid();
    const stripe = fakeStripe();

    const result = await startPortal(
      { uid, origin },
      { db, stripe: stripe.client },
    );

    expect(result).toEqual({ kind: "no-customer" });
    expect(stripe.sessions).toHaveLength(0);
  });

  it("fails when the Portal isn't set up (setup not run)", async () => {
    const uid = newUid();
    await db.doc(`customers/${uid}`).set({ stripeCustomerId: "cus_2" });
    const stripe = fakeStripe([{ id: "bpc_other", metadata: {} }]);

    await expect(
      startPortal({ uid, origin }, { db, stripe: stripe.client }),
    ).rejects.toThrow(/pnpm stripe:setup/);
    expect(stripe.sessions).toHaveLength(0);
  });
});
