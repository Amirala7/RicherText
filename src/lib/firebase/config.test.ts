import { describe, expect, it } from "vitest";
import { resolveFirebaseConfig } from "./config";

// A deployed app must never quietly fall back to the emulators (ADR 0034).
describe("resolveFirebaseConfig", () => {
  it("uses the demo project on the emulators when nothing is set locally", () => {
    expect(resolveFirebaseConfig({ NODE_ENV: "development" })).toEqual({
      projectId: "demo-richertext",
      apiKey: "demo-key",
      authDomain: undefined,
      usesEmulators: true,
    });
  });

  it("uses a demo project from the env on the emulators", () => {
    const config = resolveFirebaseConfig({
      NODE_ENV: "production",
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-other",
    });
    expect(config.projectId).toBe("demo-other");
    expect(config.usesEmulators).toBe(true);
  });

  it("uses the real project with its web config", () => {
    expect(
      resolveFirebaseConfig({
        NODE_ENV: "production",
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: "richer-text-55ffe",
        NEXT_PUBLIC_FIREBASE_API_KEY: "web-key",
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "richer-text-55ffe.firebaseapp.com",
      }),
    ).toEqual({
      projectId: "richer-text-55ffe",
      apiKey: "web-key",
      authDomain: "richer-text-55ffe.firebaseapp.com",
      usesEmulators: false,
    });
  });

  it("refuses a production build or server with no project id", () => {
    expect(() => resolveFirebaseConfig({ NODE_ENV: "production" })).toThrow(
      /NEXT_PUBLIC_FIREBASE_PROJECT_ID/,
    );
  });

  it("refuses a demo project on a deployed server", () => {
    expect(() =>
      resolveFirebaseConfig({
        NODE_ENV: "production",
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-richertext",
        K_SERVICE: "richertext",
      }),
    ).toThrow(/demo-/);
  });

  it("refuses a real project without its web API key", () => {
    expect(() =>
      resolveFirebaseConfig({
        NODE_ENV: "production",
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: "richer-text-55ffe",
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "richer-text-55ffe.firebaseapp.com",
      }),
    ).toThrow(/NEXT_PUBLIC_FIREBASE_API_KEY/);
  });

  it("refuses a real project without its auth domain", () => {
    expect(() =>
      resolveFirebaseConfig({
        NODE_ENV: "production",
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: "richer-text-55ffe",
        NEXT_PUBLIC_FIREBASE_API_KEY: "web-key",
      }),
    ).toThrow(/NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN/);
  });
});
