import { describe, expect, it } from "vitest";
import { PLANS as STRIPE_PLANS } from "../../../scripts/stripe-setup.mjs";
import {
  PAID_PLANS,
  formatUsd,
  monthlyEquivalent,
  parsePlan,
  planLabel,
  planNameForInterval,
  yearlySavingPercent,
} from "./plans";

// The paid plans as the app shows them (CONTEXT §6, ADR 0027). Prices are
// placeholders; they must match what the setup script creates in Stripe.
describe("paid plans", () => {
  it("match the prices the Stripe setup script creates", () => {
    for (const plan of Object.values(PAID_PLANS)) {
      const stripe = STRIPE_PLANS.find((p) => p.lookupKey === plan.lookupKey);
      expect(stripe).toBeDefined();
      expect(stripe?.unitAmount).toBe(plan.amount);
      expect(stripe?.interval).toBe(plan.interval);
    }
    expect(Object.keys(PAID_PLANS).sort()).toEqual(["monthly", "yearly"]);
  });

  it("name yearly and monthly", () => {
    expect(PAID_PLANS.yearly).toMatchObject({
      name: "Yearly",
      lookupKey: "pro_yearly",
    });
    expect(PAID_PLANS.monthly).toMatchObject({
      name: "Monthly",
      lookupKey: "pro_monthly",
    });
  });
});

describe("parsePlan", () => {
  it.each(["yearly", "monthly"])("accepts %s", (value) => {
    expect(parsePlan(value)).toBe(value);
  });

  it.each([null, undefined, "", "free", "YEARLY", "pro_yearly", "constructor"])(
    "refuses %s",
    (value) => {
      expect(parsePlan(value)).toBeNull();
    },
  );
});

describe("plan copy", () => {
  it("formats whole and part dollars", () => {
    expect(formatUsd(8000)).toBe("$80");
    expect(formatUsd(800)).toBe("$8");
    expect(formatUsd(667)).toBe("$6.67");
  });

  it("works the yearly price out per month", () => {
    expect(monthlyEquivalent(PAID_PLANS.yearly)).toBe("$6.67");
  });

  it("rounds the yearly saving against twelve monthly payments", () => {
    expect(yearlySavingPercent()).toBe(17);
  });

  it("labels a plan with its price", () => {
    expect(planLabel("yearly")).toBe("Yearly ($80)");
    expect(planLabel("monthly")).toBe("Monthly ($8)");
  });

  it("names a plan from a Stripe interval", () => {
    expect(planNameForInterval("year")).toBe("Yearly");
    expect(planNameForInterval("month")).toBe("Monthly");
    expect(planNameForInterval(undefined)).toBeNull();
  });
});
