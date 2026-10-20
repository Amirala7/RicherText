// One Firebase project per environment (ADR 0002). A demo- project only
// exists on the emulators, so it needs no API key (ADR 0018).
export const projectId =
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "demo-richertext";

export const usesEmulators = projectId.startsWith("demo-");

export const authEmulatorHost = "127.0.0.1:9099";
export const firestoreEmulatorHost = "127.0.0.1:8080";
