import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { PlansView } from "./plans-view";

export const metadata: Metadata = { title: "Plans · RicherText" };

// In-app pricing (ADR 0024): the landing pricing section, Free as the current
// plan. A paid user has nothing to buy here (the account page takes over in
// slice 3).
export default async function PlansPage({ searchParams }: PageProps<"/plans">) {
  const user = await requireUser();
  const customer = await getAdminDb().doc(`customers/${user.uid}`).get();
  if (customer.get("plan") === "paid") redirect("/documents");
  const { checkout } = await searchParams;
  return <PlansView checkoutFailed={checkout === "failed"} />;
}
