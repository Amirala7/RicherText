import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { setGlobalOptions } from "firebase-functions/v2";
import { defineSecret } from "firebase-functions/params";
import { onRequest } from "firebase-functions/v2/https";
import Stripe from "stripe";
import { handleStripeWebhook } from "./billing/webhook.js";

initializeApp();

// Same region as Firestore, on the emulators too (ADR 0034).
setGlobalOptions({ region: "europe-west1" });

// Values live in Secret Manager; locally in functions/.secret.local (ADR 0009).
const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");
const stripeWebhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");

// Smoke check that the Functions emulator loads this package.
export const health = onRequest((_req, res) => {
  res.json({ ok: true });
});

export const stripeWebhook = onRequest(
  { secrets: [stripeSecretKey, stripeWebhookSecret] },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).end();
      return;
    }
    const header = req.headers["stripe-signature"];
    const result = await handleStripeWebhook(
      req.rawBody,
      typeof header === "string" ? header : undefined,
      {
        db: getFirestore(),
        webhookSecret: stripeWebhookSecret.value(),
        // Made only after the signature checks out.
        retrieveSubscription: (id) =>
          new Stripe(stripeSecretKey.value()).subscriptions.retrieve(id, {
            expand: ["customer"],
          }),
      },
    );
    res.status(result.status).json({ received: result.status === 200 });
  },
);
