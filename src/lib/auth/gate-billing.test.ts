import { describe, expect, it } from "vitest";
import { gate } from "./gate";

// The billing pages are app pages (ADR 0024, 0027): /plans is the in-app
// pricing page, /welcome the page Stripe Checkout returns to.
describe("gate on billing pages", () => {
  it.each(["/plans", "/welcome"])(
    "sends a signed-out visitor from %s to sign in",
    (path) => {
      expect(gate(path, "", false)).toBe(
        `/sign-in?next=${encodeURIComponent(path)}`,
      );
    },
  );

  it.each(["/plans", "/welcome"])(
    "lets a signed-in visitor into %s",
    (path) => {
      expect(gate(path, "", true)).toBeNull();
    },
  );

  it("sends a signed-in visitor who picked a plan on sign up to the plans page", () => {
    expect(gate("/sign-up", "?plan=yearly", true)).toBe("/plans");
    expect(gate("/sign-up", "?plan=monthly", true)).toBe("/plans");
  });

  it("ignores a plan it doesn't know", () => {
    expect(gate("/sign-up", "?plan=lifetime", true)).toBe("/documents");
  });
});
