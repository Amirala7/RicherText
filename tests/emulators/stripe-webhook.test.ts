import { deleteApp, initializeApp, type App } from "firebase-admin/app";
import {
  getFirestore,
  Timestamp,
  type Firestore,
} from "firebase-admin/firestore";
import Stripe from "stripe";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { handleStripeWebhook } from "../../functions/src/billing/webhook";

// The webhook against the Firestore emulator, with events signed locally and a
// fake Stripe client, so no network or keys are needed (ADR 0003, 0027).
const secret = "whsec_test_secret";

let app: App;
let db: Firestore;

beforeAll(() => {
  app = initializeApp({ projectId: "demo-richertext" }, "stripe-webhook-test");
  db = getFirestore(app);
});

afterAll(async () => {
  await deleteApp(app);
});

const periodEnd = 1_900_000_000;

type SubOptions = {
  id?: string;
  status?: string;
  uid?: string | null;
  customer?: string;
  interval?: "month" | "year";
  cancelAtPeriodEnd?: boolean;
};

function subscription(opts: SubOptions = {}) {
  const interval = opts.interval ?? "month";
  return {
    id: opts.id ?? `sub_${crypto.randomUUID()}`,
    object: "subscription",
    status: opts.status ?? "active",
    cancel_at_period_end: opts.cancelAtPeriodEnd ?? false,
    customer: {
      id: opts.customer ?? "cus_test",
      object: "customer",
      metadata: opts.uid === null ? {} : { uid: opts.uid ?? "nobody" },
    },
    items: {
      object: "list",
      data: [
        {
          id: "si_1",
          current_period_end: periodEnd,
          price: {
            id: interval === "month" ? "price_m" : "price_y",
            lookup_key: interval === "month" ? "pro_monthly" : "pro_yearly",
            recurring: { interval },
          },
        },
      ],
    },
  } as unknown as Stripe.Subscription;
}

// Stripe as it is "now": the webhook re-reads subscriptions from here.
function fakeStripe(subs: Stripe.Subscription[]) {
  const byId = new Map(subs.map((s) => [s.id, s]));
  const calls: string[] = [];
  return {
    calls,
    set(sub: Stripe.Subscription) {
      byId.set(sub.id, sub);
    },
    retrieveSubscription: async (id: string) => {
      calls.push(id);
      const sub = byId.get(id);
      if (!sub) throw new Error(`no such subscription: ${id}`);
      return sub;
    },
  };
}

function event(
  type: string,
  object: unknown,
  id = `evt_${crypto.randomUUID()}`,
) {
  return {
    id,
    object: "event",
    type,
    created: 1_800_000_000,
    data: { object },
  };
}

function signed(payload: unknown) {
  const body = JSON.stringify(payload);
  const signature = Stripe.webhooks.generateTestHeaderString({
    payload: body,
    secret,
  });
  return { body: Buffer.from(body), signature };
}

async function deliver(
  payload: unknown,
  stripe: ReturnType<typeof fakeStripe>,
) {
  const { body, signature } = signed(payload);
  return handleStripeWebhook(body, signature, {
    db,
    webhookSecret: secret,
    retrieveSubscription: stripe.retrieveSubscription,
  });
}

const newUid = () => `user-${crypto.randomUUID()}`;
const customerDoc = (uid: string) => db.doc(`customers/${uid}`).get();
const subDoc = (uid: string, id: string) =>
  db.doc(`customers/${uid}/subscriptions/${id}`).get();

describe("stripe webhook: signature", () => {
  it("rejects a request without a signature", async () => {
    const res = await handleStripeWebhook(Buffer.from("{}"), undefined, {
      db,
      webhookSecret: secret,
      retrieveSubscription: fakeStripe([]).retrieveSubscription,
    });
    expect(res).toEqual({ status: 400, outcome: "invalid" });
  });

  it("rejects an event signed with another secret", async () => {
    const uid = newUid();
    const sub = subscription({ uid });
    const stripe = fakeStripe([sub]);
    const body = JSON.stringify(event("customer.subscription.created", sub));
    const signature = Stripe.webhooks.generateTestHeaderString({
      payload: body,
      secret: "whsec_someone_else",
    });
    const res = await handleStripeWebhook(Buffer.from(body), signature, {
      db,
      webhookSecret: secret,
      retrieveSubscription: stripe.retrieveSubscription,
    });
    expect(res).toEqual({ status: 400, outcome: "invalid" });
    expect((await customerDoc(uid)).exists).toBe(false);
    expect(stripe.calls).toEqual([]);
  });

  it("rejects a body changed after signing", async () => {
    const uid = newUid();
    const sub = subscription({ uid });
    const stripe = fakeStripe([sub]);
    const { signature } = signed(event("customer.subscription.created", sub));
    const tampered = Buffer.from(
      JSON.stringify(event("customer.subscription.created", sub, "evt_other")),
    );
    const res = await handleStripeWebhook(tampered, signature, {
      db,
      webhookSecret: secret,
      retrieveSubscription: stripe.retrieveSubscription,
    });
    expect(res).toEqual({ status: 400, outcome: "invalid" });
    expect((await customerDoc(uid)).exists).toBe(false);
  });
});

describe("stripe webhook: subscription state", () => {
  it("writes a new active subscription and makes the plan paid", async () => {
    const uid = newUid();
    const sub = subscription({ uid, customer: "cus_a", interval: "year" });
    const stripe = fakeStripe([sub]);

    const res = await deliver(
      event("customer.subscription.created", sub),
      stripe,
    );

    expect(res).toEqual({ status: 200, outcome: "processed" });
    const customer = await customerDoc(uid);
    expect(customer.data()).toMatchObject({
      stripeCustomerId: "cus_a",
      plan: "paid",
    });
    const saved = await subDoc(uid, sub.id);
    expect(saved.data()).toMatchObject({
      status: "active",
      priceId: "price_y",
      lookupKey: "pro_yearly",
      interval: "year",
      cancelAtPeriodEnd: false,
      currentPeriodEnd: Timestamp.fromMillis(periodEnd * 1000),
    });
  });

  it("re-reads the subscription from Stripe instead of trusting the event", async () => {
    const uid = newUid();
    const id = `sub_${crypto.randomUUID()}`;
    // The event says active, but Stripe now says canceled (events arrived late).
    const stale = subscription({ id, uid, status: "active" });
    const stripe = fakeStripe([subscription({ id, uid, status: "canceled" })]);

    await deliver(event("customer.subscription.updated", stale), stripe);

    expect(stripe.calls).toEqual([id]);
    expect((await customerDoc(uid)).data()?.plan).toBe("free");
    expect((await subDoc(uid, id)).data()?.status).toBe("canceled");
  });

  it("ends on Stripe's latest state whatever order events arrive in", async () => {
    const uid = newUid();
    const id = `sub_${crypto.randomUUID()}`;
    const stripe = fakeStripe([subscription({ id, uid, status: "canceled" })]);

    await deliver(
      event(
        "customer.subscription.deleted",
        subscription({ id, uid, status: "canceled" }),
      ),
      stripe,
    );
    await deliver(
      event(
        "customer.subscription.created",
        subscription({ id, uid, status: "active" }),
      ),
      stripe,
    );

    expect((await customerDoc(uid)).data()?.plan).toBe("free");
  });

  it("keeps the plan paid while a payment is past due", async () => {
    const uid = newUid();
    const sub = subscription({ uid, status: "past_due" });
    await deliver(
      event("customer.subscription.updated", sub),
      fakeStripe([sub]),
    );
    expect((await customerDoc(uid)).data()?.plan).toBe("paid");
  });

  it("keeps the plan paid until the period ends after cancelling", async () => {
    const uid = newUid();
    const sub = subscription({
      uid,
      status: "active",
      cancelAtPeriodEnd: true,
    });
    await deliver(
      event("customer.subscription.updated", sub),
      fakeStripe([sub]),
    );
    expect((await customerDoc(uid)).data()?.plan).toBe("paid");
    expect((await subDoc(uid, sub.id)).data()?.cancelAtPeriodEnd).toBe(true);
  });

  it("makes the plan free when the subscription ends", async () => {
    const uid = newUid();
    const id = `sub_${crypto.randomUUID()}`;
    const stripe = fakeStripe([subscription({ id, uid, status: "active" })]);
    await deliver(
      event("customer.subscription.created", subscription({ id, uid })),
      stripe,
    );
    expect((await customerDoc(uid)).data()?.plan).toBe("paid");

    stripe.set(subscription({ id, uid, status: "canceled" }));
    await deliver(
      event("customer.subscription.deleted", subscription({ id, uid })),
      stripe,
    );
    expect((await customerDoc(uid)).data()?.plan).toBe("free");
  });

  it("stays paid while any of the user's subscriptions is paid", async () => {
    const uid = newUid();
    const old = subscription({ uid, status: "canceled" });
    const current = subscription({ uid, status: "active" });
    const stripe = fakeStripe([old, current]);

    await deliver(event("customer.subscription.created", current), stripe);
    await deliver(event("customer.subscription.deleted", old), stripe);

    expect((await customerDoc(uid)).data()?.plan).toBe("paid");
  });

  it("syncs the subscription a completed Checkout created", async () => {
    const uid = newUid();
    const sub = subscription({ uid });
    const stripe = fakeStripe([sub]);
    const session = {
      id: "cs_test_1",
      object: "checkout.session",
      mode: "subscription",
      client_reference_id: uid,
      subscription: sub.id,
    };

    const res = await deliver(
      event("checkout.session.completed", session),
      stripe,
    );

    expect(res).toEqual({ status: 200, outcome: "processed" });
    expect(stripe.calls).toEqual([sub.id]);
    expect((await customerDoc(uid)).data()?.plan).toBe("paid");
  });
});

describe("stripe webhook: idempotency", () => {
  it("handles the same event only once", async () => {
    const uid = newUid();
    const sub = subscription({ uid });
    const stripe = fakeStripe([sub]);
    const evt = event("customer.subscription.created", sub);

    const first = await deliver(evt, stripe);
    const second = await deliver(evt, stripe);

    expect(first).toEqual({ status: 200, outcome: "processed" });
    expect(second).toEqual({ status: 200, outcome: "duplicate" });
    expect(stripe.calls).toHaveLength(1);
    expect((await db.doc(`stripeEvents/${evt.id}`).get()).exists).toBe(true);
  });

  it("answers 500 and records nothing when Stripe can't be reached, so Stripe retries", async () => {
    const uid = newUid();
    const sub = subscription({ uid });
    const evt = event("customer.subscription.created", sub);

    const res = await deliver(evt, fakeStripe([]));

    expect(res).toEqual({ status: 500, outcome: "error" });
    expect((await db.doc(`stripeEvents/${evt.id}`).get()).exists).toBe(false);
    expect((await customerDoc(uid)).exists).toBe(false);

    const retry = await deliver(evt, fakeStripe([sub]));
    expect(retry).toEqual({ status: 200, outcome: "processed" });
  });
});

describe("stripe webhook: events it doesn't act on", () => {
  it("ignores other event types", async () => {
    const stripe = fakeStripe([]);
    const res = await deliver(event("invoice.paid", { id: "in_1" }), stripe);
    expect(res).toEqual({ status: 200, outcome: "ignored" });
    expect(stripe.calls).toEqual([]);
  });

  it("ignores a Checkout that isn't for a subscription", async () => {
    const stripe = fakeStripe([]);
    const session = {
      id: "cs_2",
      object: "checkout.session",
      mode: "payment",
      subscription: null,
    };
    const res = await deliver(
      event("checkout.session.completed", session),
      stripe,
    );
    expect(res).toEqual({ status: 200, outcome: "ignored" });
    expect(stripe.calls).toEqual([]);
  });

  it("ignores a subscription whose customer isn't linked to a user", async () => {
    const sub = subscription({ uid: null, customer: "cus_orphan" });
    const res = await deliver(
      event("customer.subscription.created", sub),
      fakeStripe([sub]),
    );
    expect(res).toEqual({ status: 200, outcome: "ignored" });
    const found = await db
      .collectionGroup("subscriptions")
      .where("customerId", "==", "cus_orphan")
      .get();
    expect(found.empty).toBe(true);
  });
});
