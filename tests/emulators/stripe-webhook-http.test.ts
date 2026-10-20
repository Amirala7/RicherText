import { describe, expect, it } from "vitest";

// The deployed shape of the webhook: the Functions emulator serves it and it
// refuses anything that isn't a signed POST (ADR 0003, 0027).
const url = "http://127.0.0.1:5001/demo-richertext/us-central1/stripeWebhook";

describe("functions: stripeWebhook", () => {
  it("refuses methods other than POST", async () => {
    const res = await fetch(url);
    expect(res.status).toBe(405);
  });

  it("refuses an unsigned POST", async () => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: "evt_1",
        type: "customer.subscription.created",
      }),
    });
    expect(res.status).toBe(400);
  });

  it("refuses a POST with a bad signature", async () => {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "stripe-signature": "t=1,v1=deadbeef",
      },
      body: JSON.stringify({
        id: "evt_1",
        type: "customer.subscription.created",
      }),
    });
    expect(res.status).toBe(400);
  });
});
