// One Firebase project per environment (ADR 0002). A demo- project only
// exists on the emulators, so it needs no API key (ADR 0018). A production
// build or a deployed server never falls back to it (ADR 0034).
type Env = {
  NODE_ENV?: string;
  NEXT_PUBLIC_FIREBASE_PROJECT_ID?: string;
  NEXT_PUBLIC_FIREBASE_API_KEY?: string;
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?: string;
  // Set by Cloud Run, so only on the deployed server.
  K_SERVICE?: string;
};

export function resolveFirebaseConfig(env: Env) {
  const projectId = env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) {
    if (env.NODE_ENV === "production") {
      throw new Error("NEXT_PUBLIC_FIREBASE_PROJECT_ID is not set");
    }
    return demoConfig("demo-richertext");
  }
  if (projectId.startsWith("demo-")) {
    if (env.K_SERVICE) {
      throw new Error(`A deployed server can't use the ${projectId} project`);
    }
    return demoConfig(projectId);
  }
  const apiKey = env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) throw new Error("NEXT_PUBLIC_FIREBASE_API_KEY is not set");
  const authDomain = env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  if (!authDomain) {
    throw new Error("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN is not set");
  }
  return { projectId, apiKey, authDomain, usesEmulators: false };
}

function demoConfig(projectId: string) {
  return {
    projectId,
    apiKey: "demo-key",
    authDomain: undefined,
    usesEmulators: true,
  };
}

// Each NEXT_PUBLIC_ name is written out so Next inlines it in the browser.
export const firebaseConfig = resolveFirebaseConfig({
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  K_SERVICE: process.env.K_SERVICE,
});

export const { projectId, usesEmulators } = firebaseConfig;

export const authEmulatorHost = "127.0.0.1:9099";
export const firestoreEmulatorHost = "127.0.0.1:8080";
