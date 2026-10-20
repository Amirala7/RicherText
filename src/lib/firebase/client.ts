import { getApp, getApps, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { authEmulatorHost, projectId, usesEmulators } from "./config";

// Browser Firebase. Auth persists across reloads so Firestore rules and
// autosave keep working; the server trusts only the session cookie (ADR 0026).
export function getClientAuth() {
  const app = getApps().length
    ? getApp()
    : initializeApp({
        projectId,
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "demo-key",
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      });
  const auth = getAuth(app);
  if (usesEmulators && !auth.emulatorConfig) {
    connectAuthEmulator(auth, `http://${authEmulatorHost}`, {
      disableWarnings: true,
    });
  }
  return auth;
}
