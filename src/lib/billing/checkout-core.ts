import type { Firestore } from "firebase-admin/firestore";
import { PAID_PLANS, type PaidPlan } from "./plans";

// Starts Stripe Checkout for a paid plan (ADR 0027). The Stripe customer is
// made once per user and carries the uid, which is how the webhook finds the
// user. A paid user never gets a second subscription.

// The parts of the Stripe client used here, so tests can pass a fake.
export type CheckoutStripe = {
  customers: {
    create(
      params: { email?: string; metadata: { uid: string } },
      options: { idempotencyKey: string },
    ): Promise<{ id: string }>;
  };
  prices: {
    list(params: {
      lookup_keys: string[];
      active: boolean;
      limit: number;
    }): Promise<{ data: { id: string }[] }>;
  };
  checkout: {
    sessions: {
      create(params: {
        mode: "subscription";
        customer: string;
        client_reference_id: string;
        line_items: { price: string; quantity: number }[];
        success_url: string;
        cancel_url: string;
      }): Promise<{ url: string | null }>;
    };
  };
};

export type CheckoutInput = {
  uid: string;
  email: string | null;
  plan: PaidPlan;
  origin: string;
};

export type CheckoutResult =
  { kind: "checkout"; url: string } | { kind: "already-paid" };

export async function startCheckout(
  { uid, email, plan, origin }: CheckoutInput,
  { db, stripe }: { db: Firestore; stripe: CheckoutStripe },
): Promise<CheckoutResult> {
  const ref = db.doc(`customers/${uid}`);
  const record = await ref.get();
  if (record.get("plan") === "paid") return { kind: "already-paid" };

  let customerId = record.get("stripeCustomerId") as string | undefined;
  if (!customerId) {
    const customer = await stripe.customers.create(
      { ...(email ? { email } : {}), metadata: { uid } },
      { idempotencyKey: `customer-${uid}` },
    );
    customerId = customer.id;
    // Merge, so a plan the webhook already wrote is kept.
    await ref.set({ stripeCustomerId: customerId }, { merge: true });
  }

  const { lookupKey } = PAID_PLANS[plan];
  const prices = await stripe.prices.list({
    lookup_keys: [lookupKey],
    active: true,
    limit: 1,
  });
  const price = prices.data[0];
  if (!price) {
    throw new Error(
      `No Stripe price with lookup key ${lookupKey}; run pnpm stripe:setup`,
    );
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: uid,
    line_items: [{ price: price.id, quantity: 1 }],
    success_url: `${origin}/welcome`,
    cancel_url: `${origin}/plans`,
  });
  if (!session.url) throw new Error("Stripe returned no Checkout URL");
  return { kind: "checkout", url: session.url };
}
