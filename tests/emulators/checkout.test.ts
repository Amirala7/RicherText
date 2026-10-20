import { deleteApp, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startCheckout } from "@/lib/billing/checkout-core";

// Starting Stripe Checkout (ADR 0027) against the Firestore emulator, with a
// fake Stripe, so no keys or network are needed.
let app: App;
let db: Firestore;

beforeAll(() => {
  app = initializeApp({ projectId: "demo-richertext" }, "checkout-test");
  db = getFirestore(app);
});

afterAll(async () => {
  await deleteApp(app);
});

type Call = { params: Record<string, unknown>; options?: unknown };

function fakeStripe() {
  const customers: Call[] = [];
  const sessions: Call[] = [];
  const priceLookups: string[][] = [];
  return {
    customers,
    sessions,
    priceLookups,
    client: {
      customers: {
        create: async (params: Record<string, unknown>, options?: unknown) => {
          customers.push({ params, options });
          return { id: `cus_${customers.length}` };
        },
      },
      prices: {
        list: async (params: { lookup_keys: string[] }) => {
          priceLookups.push(params.lookup_keys);
          const key = params.lookup_keys[0];
          return {
            data: ["pro_yearly", "pro_monthly"].includes(key)
              ? [{ id: `price_${key}`, lookup_key: key }]
              : [],
          };
        },
      },
      checkout: {
        sessions: {
          create: async (params: Record<string, unknown>) => {
            sessions.push({ params });
            return {
              id: "cs_test_1",
              url: "https://checkout.stripe.test/cs_test_1",
            };
          },
        },
      },
    },
  };
}

const newUid = () => `user-${crypto.randomUUID()}`;
const origin = "http://localhost:3000";

function input(uid: string, plan: "yearly" | "monthly" = "yearly") {
  return { uid, email: `${uid}@example.com`, plan, origin };
}

describe("startCheckout", () => {
  it("creates the Stripe customer once, linked to the user", async () => {
    const uid = newUid();
    const stripe = fakeStripe();

    await startCheckout(input(uid), { db, stripe: stripe.client });

    expect(stripe.customers).toHaveLength(1);
    expect(stripe.customers[0].params).toEqual({
      email: `${uid}@example.com`,
      metadata: { uid },
    });
    // A double click can't make two customers.
    expect(stripe.customers[0].options).toEqual({
      idempotencyKey: `customer-${uid}`,
    });
    const saved = await db.doc(`customers/${uid}`).get();
    expect(saved.get("stripeCustomerId")).toBe("cus_1");
  });

  it("opens a subscription Checkout for the plan's price", async () => {
    const uid = newUid();
    const stripe = fakeStripe();

    const result = await startCheckout(input(uid, "monthly"), {
      db,
      stripe: stripe.client,
    });

    expect(result).toEqual({
      kind: "checkout",
      url: "https://checkout.stripe.test/cs_test_1",
    });
    expect(stripe.priceLookups).toEqual([["pro_monthly"]]);
    expect(stripe.sessions).toHaveLength(1);
    expect(stripe.sessions[0].params).toEqual({
      mode: "subscription",
      customer: "cus_1",
      client_reference_id: uid,
      line_items: [{ price: "price_pro_monthly", quantity: 1 }],
      success_url: `${origin}/welcome`,
      cancel_url: `${origin}/plans`,
    });
  });

  it("reuses the customer it already has", async () => {
    const uid = newUid();
    await db.doc(`customers/${uid}`).set({ stripeCustomerId: "cus_old" });
    const stripe = fakeStripe();

    await startCheckout(input(uid), { db, stripe: stripe.client });

    expect(stripe.customers).toHaveLength(0);
    expect(stripe.sessions[0].params.customer).toBe("cus_old");
  });

  it("keeps the plan the webhook wrote when it saves the customer", async () => {
    const uid = newUid();
    await db.doc(`customers/${uid}`).set({ plan: "free" });

    await startCheckout(input(uid), { db, stripe: fakeStripe().client });

    const saved = await db.doc(`customers/${uid}`).get();
    expect(saved.data()).toMatchObject({
      plan: "free",
      stripeCustomerId: "cus_1",
    });
  });

  it("doesn't open a second subscription for a paid user", async () => {
    const uid = newUid();
    await db
      .doc(`customers/${uid}`)
      .set({ stripeCustomerId: "cus_paid", plan: "paid" });
    const stripe = fakeStripe();

    const result = await startCheckout(input(uid), {
      db,
      stripe: stripe.client,
    });

    expect(result).toEqual({ kind: "already-paid" });
    expect(stripe.sessions).toHaveLength(0);
    expect(stripe.customers).toHaveLength(0);
  });

  it("fails when Stripe has no price for the plan (setup not run)", async () => {
    const uid = newUid();
    const stripe = fakeStripe();
    stripe.client.prices.list = async () => ({ data: [] });

    await expect(
      startCheckout(input(uid), { db, stripe: stripe.client }),
    ).rejects.toThrow(/pnpm stripe:setup/);
    expect(stripe.sessions).toHaveLength(0);
  });
});
