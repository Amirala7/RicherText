import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { isSameOrigin } from "@/lib/auth/origin";
import { startPortal } from "@/lib/billing/portal-core";
import { getStripe } from "@/lib/billing/stripe";
import { getAdminDb } from "@/lib/firebase/admin";

// POST → { url } to send the browser to: the Stripe Customer Portal, or the
// plans page for a user who never went to Checkout (ADR 0027).
export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "signed out" }, { status: 401 });
  }

  try {
    const result = await startPortal(
      // Checked against the host above, so it's this site.
      { uid: user.uid, origin: request.headers.get("origin")! },
      // Stripe is reached only once there's a customer to open the Portal for.
      {
        db: getAdminDb(),
        stripe: {
          get billingPortal() {
            return getStripe().billingPortal;
          },
        },
      },
    );
    const url = result.kind === "portal" ? result.url : "/plans";
    return NextResponse.json({ url });
  } catch {
    // Nothing logged: the error can carry the customer's details (ADR 0026).
    return NextResponse.json({ error: "portal unavailable" }, { status: 502 });
  }
}
