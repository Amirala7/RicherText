"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/atoms/button";
import { Toast } from "@/components/atoms/toast";
import { PricingBlock } from "@/components/organisms/pricing-block";
import { goToCheckout } from "@/lib/billing/client";
import type { PaidPlan } from "@/lib/billing/plans";

const TOAST_MS = 5000;

export function PlansView({ checkoutFailed }: { checkoutFailed: boolean }) {
  const [pending, setPending] = useState<PaidPlan | null>(null);
  const [failedAt, setFailedAt] = useState<number | null>(() =>
    checkoutFailed ? Date.now() : null,
  );

  // Sign up sends ?checkout=failed when Checkout didn't open; drop it from the
  // address so a reload doesn't show the toast again.
  useEffect(() => {
    if (checkoutFailed) window.history.replaceState(null, "", "/plans");
  }, [checkoutFailed]);

  useEffect(() => {
    if (failedAt === null) return;
    const timer = setTimeout(() => setFailedAt(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [failedAt]);

  async function subscribe(plan: PaidPlan) {
    setPending(plan);
    setFailedAt(null);
    try {
      await goToCheckout(plan);
    } catch {
      setPending(null);
      setFailedAt(Date.now());
    }
  }

  return (
    <main className="min-w-0">
      <PricingBlock
        free={
          <Button variant="secondary" size="lg" disabled>
            Current plan
          </Button>
        }
        yearly={
          <Button
            size="lg"
            loading={pending === "yearly"}
            disabled={pending !== null}
            onClick={() => subscribe("yearly")}
          >
            Subscribe yearly
          </Button>
        }
        monthly={
          <Button
            variant="secondary"
            size="lg"
            loading={pending === "monthly"}
            disabled={pending !== null}
            onClick={() => subscribe("monthly")}
          >
            Subscribe monthly
          </Button>
        }
      />
      {failedAt !== null && (
        <Toast key={failedAt} tone="error">
          Couldn&apos;t open Stripe Checkout. Try again.
        </Toast>
      )}
    </main>
  );
}
