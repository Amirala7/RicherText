import { getApp, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import {
  authEmulatorHost,
  firestoreEmulatorHost,
  projectId,
  usesEmulators,
} from "./config";

// Admin SDK for server code only. On a demo- project it talks to the
// emulators even when started outside `firebase emulators:exec`.
function adminApp() {
  if (usesEmulators) {
    process.env.FIREBASE_AUTH_EMULATOR_HOST ??= authEmulatorHost;
    process.env.FIRESTORE_EMULATOR_HOST ??= firestoreEmulatorHost;
  }
  return getApps().length ? getApp() : initializeApp({ projectId });
}

export function getAdminAuth() {
  return getAuth(adminApp());
}

export function getAdminDb() {
  return getFirestore(adminApp());
}
