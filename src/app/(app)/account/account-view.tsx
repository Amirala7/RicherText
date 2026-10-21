"use client";

import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { Toast } from "@/components/atoms/toast";
import {
  PaymentDueNotice,
  ProfileSection,
  SubscriptionSection,
  WritingSection,
} from "@/components/organisms/account";
import type { AccountPlan } from "@/lib/billing/account-plan";
import { goToPortal } from "@/lib/billing/client";
import { watchAccountPlan } from "@/lib/billing/watch-account";
import { getClientAuth, getClientDb } from "@/lib/firebase/client";
import {
  saveWritingFont,
  watchWritingFont,
  type WritingFont,
} from "@/lib/settings/writing";

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
  const [font, setFont] = useState<WritingFont>("geist");
  const [fontFailedAt, setFontFailedAt] = useState<number | null>(null);

  // Changes made in the Portal reach Firestore through the webhook, often
  // just after Stripe sends the user back here.
  useEffect(() => {
    let stopWatching = () => {};
    const stopAuth = onAuthStateChanged(getClientAuth(), (user) => {
      stopWatching();
      if (!user) return;
      const db = getClientDb();
      const stopPlan = watchAccountPlan(db, user.uid, setState);
      const stopFont = watchWritingFont(db, user.uid, setFont);
      stopWatching = () => {
        stopPlan();
        stopFont();
      };
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

  useEffect(() => {
    if (fontFailedAt === null) return;
    const timer = setTimeout(() => setFontFailedAt(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [fontFailedAt]);

  // Shown when Firestore has it on the device (its snapshot fires at once,
  // also offline, ADR 0029), so a reload right after can't lose it; a
  // rejected write puts the old font back by itself. A choice made while
  // sign-in is still being restored waits for it instead of being dropped.
  async function changeFont(next: WritingFont) {
    const auth = getClientAuth();
    try {
      await auth.authStateReady();
      if (!auth.currentUser) throw new Error("signed out");
      await saveWritingFont(getClientDb(), auth.currentUser.uid, next);
    } catch {
      setFontFailedAt(Date.now());
    }
  }

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
      <WritingSection font={font} onFont={changeFont} />
      <SubscriptionSection
        state={state}
        now={now}
        pending={pending}
        onPortal={openPortal}
      />
      {fontFailedAt !== null && (
        <Toast key={fontFailedAt} tone="error">
          Couldn&apos;t change the writing font. Try again.
        </Toast>
      )}
      {failedAt !== null && (
        <Toast key={failedAt} tone="error">
          Couldn&apos;t open the billing portal. Try again.
        </Toast>
      )}
    </main>
  );
}
