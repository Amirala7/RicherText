export type Plan = "free" | "paid";

// Past due stays paid: access continues while Stripe retries the card, and
// ends when Stripe gives up and cancels (ADR 0027).
const PAID_STATUSES = new Set(["active", "trialing", "past_due"]);

export function planFor(status: string): Plan {
  return PAID_STATUSES.has(status) ? "paid" : "free";
}

export function planForStatuses(statuses: string[]): Plan {
  return statuses.some((s) => planFor(s) === "paid") ? "paid" : "free";
}
