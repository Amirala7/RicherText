import type { Firestore } from "firebase-admin/firestore";

// Opens the Stripe Customer Portal (ADR 0027): card, monthly ↔ yearly,
// cancel, invoices. Uses the configuration `pnpm stripe:setup` tags with
// `metadata.app = richertext`, and comes back to the account page.

const APP = "richertext";

// The parts of the Stripe client used here, so tests can pass a fake.
export type PortalStripe = {
  billingPortal: {
    configurations: {
      list(params: { active: boolean; limit: number }): Promise<{
        data: { id: string; metadata: { app?: string } | null }[];
      }>;
    };
    sessions: {
      create(params: {
        customer: string;
        configuration: string;
        return_url: string;
      }): Promise<{ url: string }>;
    };
  };
};

export type PortalResult =
  { kind: "portal"; url: string } | { kind: "no-customer" };

export async function startPortal(
  { uid, origin }: { uid: string; origin: string },
  { db, stripe }: { db: Firestore; stripe: PortalStripe },
): Promise<PortalResult> {
  const record = await db.doc(`customers/${uid}`).get();
  const customerId = record.get("stripeCustomerId") as string | undefined;
  if (!customerId) return { kind: "no-customer" };

  const { data } = await stripe.billingPortal.configurations.list({
    active: true,
    limit: 100,
  });
  const configuration = data.find((c) => c.metadata?.app === APP);
  if (!configuration) {
    throw new Error("No Customer Portal configuration; run pnpm stripe:setup");
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    configuration: configuration.id,
    return_url: `${origin}/account`,
  });
  return { kind: "portal", url: session.url };
}
