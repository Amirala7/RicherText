"use client";

import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  REFRESH_EVERY_MS,
  sessionNeedsRefresh,
  signOut,
  startSession,
} from "@/lib/auth/client";
import { getClientAuth } from "@/lib/firebase/client";

// Keeps the cookie and the browser's Firebase session together (ADR 0026):
// re-mints the cookie daily while the app is open, so active writers never
// hit the 14-day limit; if the browser session is gone, signs out here too.
export function SessionKeeper() {
  const router = useRouter();

  useEffect(() => {
    const auth = getClientAuth();
    const refresh = () => {
      const user = auth.currentUser;
      if (user && sessionNeedsRefresh()) startSession(user).catch(() => {});
    };
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) return refresh();
      signOut().then(() => {
        router.replace("/sign-in");
        router.refresh();
      });
    });
    const timer = setInterval(refresh, REFRESH_EVERY_MS / 24);
    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, [router]);

  return null;
}
