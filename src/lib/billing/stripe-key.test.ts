import { describe, expect, it } from "vitest";
import { isSandboxKey } from "./stripe-key";

// The app talks to the Stripe sandbox only (ADR 0003): a live or placeholder
// key never reaches the Stripe client.
describe("isSandboxKey", () => {
  it.each(["sk_test_abc123", "rk_test_abc123"])("accepts %s", (key) => {
    expect(isSandboxKey(key)).toBe(true);
  });

  it.each([
    "sk_live_abc123",
    "rk_live_abc123",
    "pk_test_abc123",
    "sk_test_replace_me",
    "",
    undefined,
  ])("refuses %s", (key) => {
    expect(isSandboxKey(key)).toBe(false);
  });
});
