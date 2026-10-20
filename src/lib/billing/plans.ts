// The paid plans (CONTEXT §6, ADR 0027). Placeholder prices; they must match
// what `pnpm stripe:setup` creates (pinned by plans.test.ts).
export type PaidPlan = "yearly" | "monthly";

type PlanInfo = {
  name: string;
  lookupKey: string;
  amount: number; // cents, USD
  interval: "year" | "month";
};

export const PAID_PLANS: Record<PaidPlan, PlanInfo> = {
  yearly: {
    name: "Yearly",
    lookupKey: "pro_yearly",
    amount: 8000,
    interval: "year",
  },
  monthly: {
    name: "Monthly",
    lookupKey: "pro_monthly",
    amount: 800,
    interval: "month",
  },
};

export function parsePlan(value: string | null | undefined): PaidPlan | null {
  return value === "yearly" || value === "monthly" ? value : null;
}

export function formatUsd(cents: number): string {
  return cents % 100 === 0 ? `$${cents / 100}` : `$${(cents / 100).toFixed(2)}`;
}

export function monthlyEquivalent(plan: PlanInfo): string {
  return formatUsd(Math.round(plan.amount / 12));
}

export function yearlySavingPercent(): number {
  const twelveMonths = PAID_PLANS.monthly.amount * 12;
  return Math.round((1 - PAID_PLANS.yearly.amount / twelveMonths) * 100);
}

export function planLabel(plan: PaidPlan): string {
  const info = PAID_PLANS[plan];
  return `${info.name} (${formatUsd(info.amount)})`;
}

export function planNameForInterval(
  interval: string | null | undefined,
): string | null {
  const plan = Object.values(PAID_PLANS).find((p) => p.interval === interval);
  return plan?.name ?? null;
}
