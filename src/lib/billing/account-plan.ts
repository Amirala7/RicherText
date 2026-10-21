// One plan rule for the webhook and the app: imported straight from the
// Functions package instead of a shared workspace package, to keep one copy
// without a third package to build and deploy.
import { planFor } from "../../../functions/src/billing/plan";
import { planNameForInterval } from "./plans";

// The subscription row on the account page (ADR 0024, 0027), worked out from
// `customers/{uid}` and its subscriptions as the webhook wrote them.
export type SubscriptionInfo = {
  status: string;
  interval: string | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: Date | null;
};

export type AccountPlan =
  | { kind: "free" }
  | { kind: "active"; planName: string | null; renewsOn: Date | null }
  | { kind: "ends"; planName: string | null; endsOn: Date | null }
  | { kind: "payment-due"; planName: string | null };

export function accountPlan(
  plan: unknown,
  subs: SubscriptionInfo[],
): AccountPlan {
  if (plan !== "paid") return { kind: "free" };
  const paid = subs.filter((s) => planFor(s.status) === "paid");

  const due = paid.find((s) => s.status === "past_due");
  if (due) {
    return { kind: "payment-due", planName: planNameForInterval(due.interval) };
  }
  const renewing = paid.find((s) => !s.cancelAtPeriodEnd);
  if (renewing || paid.length === 0) {
    return {
      kind: "active",
      planName: planNameForInterval(renewing?.interval),
      renewsOn: renewing?.currentPeriodEnd ?? null,
    };
  }
  return {
    kind: "ends",
    planName: planNameForInterval(paid[0].interval),
    endsOn: paid[0].currentPeriodEnd,
  };
}

// "19 Nov", or "19 Nov 2027" when it isn't this year. UTC, so the server and
// the browser print the same day.
export function formatPlanDate(date: Date, now: Date): string {
  const sameYear = date.getUTCFullYear() === now.getUTCFullYear();
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
    timeZone: "UTC",
  });
}
