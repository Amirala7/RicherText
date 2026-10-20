import { getApp, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { authEmulatorHost, projectId, usesEmulators } from "./config";

// Admin SDK for server code only. On a demo- project it talks to the Auth
// emulator even when started outside `firebase emulators:exec`.
export function getAdminAuth() {
  if (usesEmulators)
    process.env.FIREBASE_AUTH_EMULATOR_HOST ??= authEmulatorHost;
  const app = getApps().length ? getApp() : initializeApp({ projectId });
  return getAuth(app);
}
