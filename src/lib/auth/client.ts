import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  signInWithEmailAndPassword,
  type User,
} from "firebase/auth";
import { getClientAuth } from "@/lib/firebase/client";
import type { ResetValues, SignInValues, SignUpValues } from "./schemas";

const refreshedAtKey = "rt.session.refreshedAt";
export const REFRESH_EVERY_MS = 24 * 60 * 60 * 1000;

// Swap the user's ID token for the server's session cookie (ADR 0026).
export async function startSession(user: User) {
  const res = await fetch("/api/session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ idToken: await user.getIdToken() }),
  });
  if (!res.ok) throw new Error(`Session not started (${res.status})`);
  try {
    localStorage.setItem(refreshedAtKey, String(Date.now()));
  } catch {}
}

export function sessionNeedsRefresh(now = Date.now()) {
  try {
    const at = Number(localStorage.getItem(refreshedAtKey));
    return !at || now - at >= REFRESH_EVERY_MS;
  } catch {
    return true;
  }
}

export async function signUp({ email, password }: SignUpValues) {
  const { user } = await createUserWithEmailAndPassword(
    getClientAuth(),
    email,
    password,
  );
  await startSession(user);
}

export async function signIn({ email, password }: SignInValues) {
  const { user } = await signInWithEmailAndPassword(
    getClientAuth(),
    email,
    password,
  );
  await startSession(user);
}

// This device only: drop the cookie, then the browser's Firebase session.
export async function signOut() {
  await fetch("/api/session", { method: "DELETE" });
  await firebaseSignOut(getClientAuth());
  try {
    localStorage.removeItem(refreshedAtKey);
  } catch {}
}

// Firebase emails the link and hosts the new-password page (ADR 0026); its
// Continue button comes back to sign in. No account reads the same as sent.
export async function sendReset({ email }: ResetValues) {
  try {
    await sendPasswordResetEmail(getClientAuth(), email, {
      url: `${window.location.origin}/sign-in`,
    });
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? error.code
        : "";
    if (code !== "auth/user-not-found") throw error;
  }
}
