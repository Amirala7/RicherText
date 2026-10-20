"use client";

import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import { SignUpForm } from "@/components/organisms/auth-forms";
import { signUp } from "@/lib/auth/client";
import { goToCheckout } from "@/lib/billing/client";
import { parsePlan } from "@/lib/billing/plans";

// The page is static, so the plan (?plan=yearly) is read in the browser. Read
// this way, only the line changes after hydration; the form isn't remounted,
// so nothing typed is lost.
const noChanges = () => () => {};
function usePlanFromUrl() {
  const value = useSyncExternalStore(
    noChanges,
    () => new URLSearchParams(window.location.search).get("plan"),
    () => null,
  );
  return parsePlan(value);
}

// New accounts land on the documents page (ADR 0024); with a plan picked,
// they go on to Stripe Checkout (ADR 0027).
export function SignUp() {
  const router = useRouter();
  const plan = usePlanFromUrl();
  return (
    <SignUpForm
      plan={plan}
      onSubmit={async (values) => {
        await signUp(values);
        if (plan) {
          try {
            await goToCheckout(plan);
            return;
          } catch {
            router.replace("/plans?checkout=failed");
            router.refresh();
            return;
          }
        }
        router.replace("/documents");
        router.refresh();
      }}
    />
  );
}
