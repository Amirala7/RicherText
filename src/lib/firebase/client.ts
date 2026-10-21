import { getApp, getApps, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import {
  clearIndexedDbPersistence,
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  terminate,
  waitForPendingWrites,
  type Firestore,
} from "firebase/firestore";
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

let db: Firestore | undefined;
let clearing: Promise<void> | undefined;

// Reads only what the rules allow the signed-in user (ADR 0004). Data and
// queued writes live in IndexedDB, shared by open tabs, so edits survive a
// reload or a lost connection (ADR 0029).
export function getClientDb() {
  if (db) return db;
  db = initializeFirestore(clientApp(), {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });
  if (usesEmulators) {
    const [host, port] = firestoreEmulatorHost.split(":");
    connectFirestoreEmulator(db, host, Number(port));
  }
  return db;
}

export const PENDING_WRITES_WAIT_MS = 5000;

// Sign out leaves no documents on the device (ADR 0029): give queued writes
// a moment to land, then shut Firestore down and delete its cache. Deleting
// fails while another tab still has it open; that tab signs out too.
export function clearClientDb() {
  if (!db) return clearing ?? Promise.resolve();
  const current = db;
  db = undefined;
  clearing = (async () => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    await Promise.race([
      waitForPendingWrites(current).catch(() => {}),
      new Promise((done) => {
        timer = setTimeout(done, PENDING_WRITES_WAIT_MS);
      }),
    ]);
    clearTimeout(timer);
    await terminate(current);
    await clearIndexedDbPersistence(current).catch(() => {});
  })().finally(() => {
    clearing = undefined;
  });
  return clearing;
}
