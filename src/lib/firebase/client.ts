import { getApp, getApps, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import {
  authEmulatorHost,
  firestoreEmulatorHost,
  projectId,
  usesEmulators,
} from "./config";

function clientApp() {
  return getApps().length
    ? getApp()
    : initializeApp({
        projectId,
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "demo-key",
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      });
}

// Browser Firebase. Auth persists across reloads so Firestore rules and
// autosave keep working; the server trusts only the session cookie (ADR 0026).
export function getClientAuth() {
  const auth = getAuth(clientApp());
  if (usesEmulators && !auth.emulatorConfig) {
    connectAuthEmulator(auth, `http://${authEmulatorHost}`, {
      disableWarnings: true,
    });
  }
  return auth;
}

let firestoreConnected = false;

// Reads only what the rules allow the signed-in user (ADR 0004).
export function getClientDb() {
  const db = getFirestore(clientApp());
  if (usesEmulators && !firestoreConnected) {
    const [host, port] = firestoreEmulatorHost.split(":");
    connectFirestoreEmulator(db, host, Number(port));
    firestoreConnected = true;
  }
  return db;
}
