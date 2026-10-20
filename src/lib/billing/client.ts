import type { PaidPlan } from "./plans";

// Asks the server for a Checkout session and sends the browser there
// (ADR 0027). Throws when Checkout can't be opened.
export async function goToCheckout(plan: PaidPlan) {
  const res = await fetch("/api/billing/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ plan }),
  });
  if (!res.ok) throw new Error(`Checkout not opened (${res.status})`);
  const { url } = (await res.json()) as { url: string };
  window.location.assign(url);
}

// Asks the server for a Customer Portal session and sends the browser there
// (ADR 0027). Throws when the Portal can't be opened.
export async function goToPortal() {
  const res = await fetch("/api/billing/portal", { method: "POST" });
  if (!res.ok) throw new Error(`Portal not opened (${res.status})`);
  const { url } = (await res.json()) as { url: string };
  window.location.assign(url);
}
