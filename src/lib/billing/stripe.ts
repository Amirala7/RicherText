import "server-only";
import Stripe from "stripe";
import { isSandboxKey } from "./stripe-key";

// Server-side Stripe client, sandbox keys only (ADR 0003). Throws when the
// key is missing, live, or still the placeholder.
export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!isSandboxKey(key)) {
    throw new Error("STRIPE_SECRET_KEY must be a Stripe sandbox secret key");
  }
  return new Stripe(key);
}
