import { PageBar } from "@/components/organisms/page-bar";
import { SessionKeeper } from "@/components/organisms/session-keeper";
import { requireUser } from "@/lib/auth/session";

// Pages between Stripe and the app (ADR 0024): the logotype bar only, behind
// the same session check as the app (ADR 0026).
export const instant = false;

export default async function CheckoutLayout({ children }: LayoutProps<"/">) {
  await requireUser();
  return (
    <div className="flex min-h-dvh flex-col">
      <PageBar />
      <SessionKeeper />
      {children}
    </div>
  );
}
