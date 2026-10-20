import { describe, expect, it } from "vitest";
import { planFor, planForStatuses } from "./plan.js";

// Which Stripe subscription statuses unlock the paid plan (ADR 0027).
describe("planFor", () => {
  it.each(["active", "trialing", "past_due"])("%s is paid", (status) => {
    expect(planFor(status)).toBe("paid");
  });

  it.each([
    "incomplete",
    "incomplete_expired",
    "unpaid",
    "canceled",
    "paused",
    "something_new",
  ])("%s is free", (status) => {
    expect(planFor(status)).toBe("free");
  });
});

describe("planForStatuses", () => {
  it("is free with no subscriptions", () => {
    expect(planForStatuses([])).toBe("free");
  });

  it("is paid when any subscription is paid", () => {
    expect(planForStatuses(["canceled", "active"])).toBe("paid");
  });

  it("is free when none is paid", () => {
    expect(planForStatuses(["canceled", "incomplete_expired"])).toBe("free");
  });
});
