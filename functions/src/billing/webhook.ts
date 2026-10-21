import {
  FieldValue,
  Timestamp,
  type Firestore,
} from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import Stripe from "stripe";
import { planForStatuses } from "./plan.js";

// Stripe webhook (ADR 0003, 0027). Verifies the signature, handles each event
// once, and writes the subscription's current state as Stripe reports it now,
// so the order events arrive in doesn't matter. Logs carry only event IDs and
// types, never user data (ADR 0026).

export type WebhookDeps = {
  db: Firestore;
  webhookSecret: string;
  // Returns the subscription with its customer expanded.
  retrieveSubscription: (id: string) => Promise<Stripe.Subscription>;
};

export type WebhookResult = {
  status: 200 | 400 | 500;
  outcome: "processed" | "duplicate" | "ignored" | "invalid" | "error";
};

const SUBSCRIPTION_EVENTS = new Set([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);

function subscriptionIdOf(event: Stripe.Event): string | null {
  if (SUBSCRIPTION_EVENTS.has(event.type)) {
    return (event.data.object as Stripe.Subscription).id;
  }
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.mode !== "subscription" || !session.subscription) return null;
    return typeof session.subscription === "string"
      ? session.subscription
      : session.subscription.id;
  }
  return null;
}

function subscriptionRecord(sub: Stripe.Subscription, customerId: string) {
  const item = sub.items.data[0];
  return {
    customerId,
    status: sub.status,
    priceId: item?.price.id ?? null,
    lookupKey: item?.price.lookup_key ?? null,
    interval: item?.price.recurring?.interval ?? null,
    currentPeriodEnd: item
      ? Timestamp.fromMillis(item.current_period_end * 1000)
      : null,
    // The Portal cancels "at period end" by setting cancel_at to the period
    // end; cancel_at_period_end stays false on current API versions.
    cancelAtPeriodEnd: sub.cancel_at_period_end || sub.cancel_at != null,
    updatedAt: FieldValue.serverTimestamp(),
  };
}

export async function handleStripeWebhook(
  rawBody: Buffer,
  signature: string | undefined,
  deps: WebhookDeps,
): Promise<WebhookResult> {
  if (!signature) return { status: 400, outcome: "invalid" };
  let event: Stripe.Event;
  try {
    event = Stripe.webhooks.constructEvent(
      rawBody,
      signature,
      deps.webhookSecret,
    );
  } catch {
    return { status: 400, outcome: "invalid" };
  }

  const subscriptionId = subscriptionIdOf(event);
  if (!subscriptionId) return { status: 200, outcome: "ignored" };

  const { db } = deps;
  const eventRef = db.doc(`stripeEvents/${event.id}`);
  if ((await eventRef.get()).exists) {
    return { status: 200, outcome: "duplicate" };
  }

  let sub: Stripe.Subscription;
  try {
    sub = await deps.retrieveSubscription(subscriptionId);
  } catch {
    // Not recorded, so Stripe's retry gets a fresh attempt.
    logger.error("stripe webhook: could not read subscription", {
      eventId: event.id,
      type: event.type,
    });
    return { status: 500, outcome: "error" };
  }

  const customer = sub.customer;
  const uid =
    typeof customer === "object" && !customer.deleted
      ? customer.metadata?.uid
      : undefined;
  if (!uid) {
    logger.warn("stripe webhook: customer not linked to a user", {
      eventId: event.id,
      type: event.type,
    });
    return { status: 200, outcome: "ignored" };
  }
  const customerId = typeof customer === "string" ? customer : customer.id;

  const customerRef = db.doc(`customers/${uid}`);
  const subsRef = customerRef.collection("subscriptions");

  const outcome = await db.runTransaction(async (tx) => {
    // Checked again inside the transaction: two deliveries may race.
    if ((await tx.get(eventRef)).exists) return "duplicate" as const;
    const others = await tx.get(subsRef);
    const statuses = others.docs
      .filter((d) => d.id !== sub.id)
      .map((d) => d.get("status") as string);
    statuses.push(sub.status);

    tx.set(subsRef.doc(sub.id), subscriptionRecord(sub, customerId));
    tx.set(
      customerRef,
      {
        stripeCustomerId: customerId,
        plan: planForStatuses(statuses),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    tx.create(eventRef, {
      type: event.type,
      processedAt: FieldValue.serverTimestamp(),
    });
    return "processed" as const;
  });

  return { status: 200, outcome };
}
