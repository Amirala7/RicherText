import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { isSameOrigin } from "@/lib/auth/origin";
import { startCheckout } from "@/lib/billing/checkout-core";
import { parsePlan } from "@/lib/billing/plans";
import { getStripe } from "@/lib/billing/stripe";
import { getAdminDb } from "@/lib/firebase/admin";

// POST { plan: "yearly" | "monthly" } → { url } to send the browser to:
// Stripe Checkout, or the documents page for a user who already pays (ADR 0027).
export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "signed out" }, { status: 401 });
  }
  const body: unknown = await request.json().catch(() => null);
  const plan = parsePlan(
    typeof body === "object" && body !== null && "plan" in body
      ? String(body.plan)
      : null,
  );
  if (!plan) {
    return NextResponse.json({ error: "unknown plan" }, { status: 400 });
  }

  try {
    const result = await startCheckout(
      {
        uid: user.uid,
        email: user.email,
        plan,
        // Checked against the host above, so it's this site.
        origin: request.headers.get("origin")!,
      },
      { db: getAdminDb(), stripe: getStripe() },
    );
    const url = result.kind === "checkout" ? result.url : "/documents";
    return NextResponse.json({ url });
  } catch {
    // Nothing logged: the error can carry the customer's details (ADR 0026).
    return NextResponse.json(
      { error: "checkout unavailable" },
      { status: 502 },
    );
  }
}
