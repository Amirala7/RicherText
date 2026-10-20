"use client";

import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Activation,
  type ActivationState,
} from "@/components/organisms/activation";
import { watchPaidPlan } from "@/lib/billing/watch-plan";
import { getClientAuth, getClientDb } from "@/lib/firebase/client";

const SLOW_MS = 20_000;
const REDIRECT_MS = 1_600;

// Waits for the webhook to make the plan paid, then names it and goes to the
// documents page; after 20s says Stripe is slow and offers a way on.
export function WelcomeView() {
  const router = useRouter();
  const [state, setState] = useState<ActivationState>("waiting");
  const [planName, setPlanName] = useState<string>();

  useEffect(() => {
    let stopWatching = () => {};
    const slow = setTimeout(
      () => setState((s) => (s === "waiting" ? "slow" : s)),
      SLOW_MS,
    );
    const stopAuth = onAuthStateChanged(getClientAuth(), (user) => {
      stopWatching();
      if (!user) return;
      stopWatching = watchPaidPlan(getClientDb(), user.uid, (name) => {
        setPlanName(name ?? undefined);
        setState("done");
      });
    });
    return () => {
      clearTimeout(slow);
      stopAuth();
      stopWatching();
    };
  }, []);

  useEffect(() => {
    if (state !== "done") return;
    const timer = setTimeout(() => {
      router.replace("/documents");
      router.refresh();
    }, REDIRECT_MS);
    return () => clearTimeout(timer);
  }, [state, router]);

  return <Activation state={state} planName={planName} />;
}
