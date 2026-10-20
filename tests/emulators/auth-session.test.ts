import { beforeAll, describe, expect, it } from "vitest";
import { getAdminAuth } from "@/lib/firebase/admin";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  mintSessionCookie,
  verifySession,
} from "@/lib/auth/session-core";

// Session cookies against the Auth emulator (ADR 0005, 0026).
const signUpUrl =
  "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key";

async function newUser() {
  const email = `session-${crypto.randomUUID()}@example.com`;
  const res = await fetch(signUpUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email,
      password: "password123",
      returnSecureToken: true,
    }),
  });
  const body = (await res.json()) as { idToken: string; localId: string };
  return { email, idToken: body.idToken, uid: body.localId };
}

describe("session cookies", () => {
  const auth = getAdminAuth();
  let user: Awaited<ReturnType<typeof newUser>>;

  beforeAll(async () => {
    user = await newUser();
  });

  it("is called __session and lasts 14 days", () => {
    expect(SESSION_COOKIE).toBe("__session");
    expect(SESSION_MAX_AGE_SECONDS).toBe(14 * 24 * 60 * 60);
  });

  it("turns a fresh ID token into a cookie that names the user", async () => {
    const cookie = await mintSessionCookie(auth, user.idToken);
    expect(await verifySession(auth, cookie)).toEqual({
      uid: user.uid,
      email: user.email,
    });
  });

  it("refuses an invalid ID token", async () => {
    await expect(mintSessionCookie(auth, "not-a-token")).rejects.toThrow();
  });

  it.each([undefined, "", "garbage"])(
    "treats cookie %s as signed out",
    async (cookie) => {
      expect(await verifySession(auth, cookie)).toBeNull();
    },
  );

  it("treats a revoked session as signed out", async () => {
    const other = await newUser();
    const cookie = await mintSessionCookie(auth, other.idToken);
    await new Promise((r) => setTimeout(r, 1100));
    await auth.revokeRefreshTokens(other.uid);
    expect(await verifySession(auth, cookie)).toBeNull();
  });

  it("treats a deleted user as signed out", async () => {
    const other = await newUser();
    const cookie = await mintSessionCookie(auth, other.idToken);
    await auth.deleteUser(other.uid);
    expect(await verifySession(auth, cookie)).toBeNull();
  });
});
