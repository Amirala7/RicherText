"use client";

import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { Toast } from "@/components/atoms/toast";
import {
  PaymentDueNotice,
  ProfileSection,
  SubscriptionSection,
} from "@/components/organisms/account";
import type { AccountPlan } from "@/lib/billing/account-plan";
import { goToPortal } from "@/lib/billing/client";
import { watchAccountPlan } from "@/lib/billing/watch-account";
import { getClientAuth, getClientDb } from "@/lib/firebase/client";

const TOAST_MS = 5000;

export function AccountView({
  email,
  initial,
  now,
}: {
  email: string | null;
  initial: AccountPlan;
  now: Date;
}) {
  const [state, setState] = useState(initial);
  const [pending, setPending] = useState(false);
  const [failedAt, setFailedAt] = useState<number | null>(null);

  // Changes made in the Portal reach Firestore through the webhook, often
  // just after Stripe sends the user back here.
  useEffect(() => {
    let stopWatching = () => {};
    const stopAuth = onAuthStateChanged(getClientAuth(), (user) => {
      stopWatching();
      if (user)
        stopWatching = watchAccountPlan(getClientDb(), user.uid, setState);
    });
    return () => {
      stopAuth();
      stopWatching();
    };
  }, []);

  useEffect(() => {
    if (failedAt === null) return;
    const timer = setTimeout(() => setFailedAt(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [failedAt]);

  async function openPortal() {
    setPending(true);
    setFailedAt(null);
    try {
      await goToPortal();
    } catch {
      setPending(false);
      setFailedAt(Date.now());
    }
  }

  return (
    <main className="mx-auto grid w-full max-w-[808px] min-w-0 gap-5 px-6 py-7 max-sm:gap-4 max-sm:p-5">
      <h1 className="m-0 text-xl">Account</h1>
      {state.kind === "payment-due" && <PaymentDueNotice />}
      <ProfileSection email={email} />
      <SubscriptionSection
        state={state}
        now={now}
        pending={pending}
        onPortal={openPortal}
      />
      {failedAt !== null && (
        <Toast key={failedAt} tone="error">
          Couldn&apos;t open the billing portal. Try again.
        </Toast>
      )}
    </main>
  );
}
