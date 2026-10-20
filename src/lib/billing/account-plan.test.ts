import { describe, expect, it } from "vitest";
import {
  accountPlan,
  formatPlanDate,
  type SubscriptionInfo,
} from "./account-plan";

// The subscription row on the account page (ADR 0024, 0027): Free · Active ·
// Ends on date · Payment due, worked out from what the webhook wrote.
const nov19 = new Date("2026-11-19T12:00:00Z");

function sub(overrides: Partial<SubscriptionInfo> = {}): SubscriptionInfo {
  return {
    status: "active",
    interval: "year",
    cancelAtPeriodEnd: false,
    currentPeriodEnd: nov19,
    ...overrides,
  };
}

describe("accountPlan", () => {
  it("is Free when the plan isn't paid", () => {
    expect(accountPlan("free", [])).toEqual({ kind: "free" });
    expect(accountPlan(undefined, [])).toEqual({ kind: "free" });
    // An ended subscription leaves the user on Free.
    expect(accountPlan("free", [sub({ status: "canceled" })])).toEqual({
      kind: "free",
    });
  });

  it("is Active with the plan's name and renewal date", () => {
    expect(accountPlan("paid", [sub()])).toEqual({
      kind: "active",
      planName: "Yearly",
      renewsOn: nov19,
    });
    expect(accountPlan("paid", [sub({ interval: "month" })])).toMatchObject({
      kind: "active",
      planName: "Monthly",
    });
  });

  it("ends on the period's last day once cancelled", () => {
    expect(accountPlan("paid", [sub({ cancelAtPeriodEnd: true })])).toEqual({
      kind: "ends",
      planName: "Yearly",
      endsOn: nov19,
    });
  });

  it("says payment is due while Stripe retries a failed payment", () => {
    expect(accountPlan("paid", [sub({ status: "past_due" })])).toEqual({
      kind: "payment-due",
      planName: "Yearly",
    });
  });

  it("looks only at subscriptions that still give access", () => {
    const ended = sub({ status: "canceled", interval: "month" });
    expect(accountPlan("paid", [ended, sub()])).toMatchObject({
      kind: "active",
      planName: "Yearly",
    });
  });

  it("prefers a subscription that renews over one that ends", () => {
    const ending = sub({ cancelAtPeriodEnd: true, interval: "month" });
    expect(accountPlan("paid", [ending, sub()])).toMatchObject({
      kind: "active",
      planName: "Yearly",
    });
  });

  it("stays Active when the plan is paid but no subscription is known yet", () => {
    expect(accountPlan("paid", [])).toEqual({
      kind: "active",
      planName: null,
      renewsOn: null,
    });
  });
});

describe("formatPlanDate", () => {
  const now = new Date("2026-10-21T09:00:00Z");

  it("leaves the year out when it's this year", () => {
    expect(formatPlanDate(nov19, now)).toBe("19 Nov");
  });

  it("adds the year when it isn't this year", () => {
    expect(formatPlanDate(new Date("2027-10-21T12:00:00Z"), now)).toBe(
      "21 Oct 2027",
    );
  });
});
