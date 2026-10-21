import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { accountPlan } from "@/lib/billing/account-plan";
import { getAdminDb } from "@/lib/firebase/admin";
import { AccountView } from "./account-view";

export const metadata: Metadata = { title: "Account · RicherText" };

// The account page (ADR 0024): Profile and Subscription (2026-10-21).
// Rendered with the plan as it is now; the view then follows live changes.
export default async function AccountPage() {
  const user = await requireUser();
  const customer = getAdminDb().doc(`customers/${user.uid}`);
  const [record, subs] = await Promise.all([
    customer.get(),
    customer.collection("subscriptions").get(),
  ]);
  const initial = accountPlan(
    record.get("plan"),
    subs.docs.map((d) => ({
      status: String(d.get("status")),
      interval: d.get("interval") ?? null,
      cancelAtPeriodEnd: d.get("cancelAtPeriodEnd") === true,
      currentPeriodEnd: d.get("currentPeriodEnd")?.toDate() ?? null,
    })),
  );
  return <AccountView email={user.email} initial={initial} now={new Date()} />;
}
