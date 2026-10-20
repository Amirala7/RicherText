import type { Auth } from "firebase-admin/auth";

// Firebase's CDN only forwards a cookie with this name (ADR 0026).
export const SESSION_COOKIE = "__session";
export const SESSION_MAX_AGE_SECONDS = 14 * 24 * 60 * 60;

// Set by the proxy on gated requests: the path asked for.
export const PATH_HEADER = "x-rt-path";

export type SessionUser = { uid: string; email: string | null };

export async function mintSessionCookie(auth: Auth, idToken: string) {
  await auth.verifyIdToken(idToken, true);
  return auth.createSessionCookie(idToken, {
    expiresIn: SESSION_MAX_AGE_SECONDS * 1000,
  });
}

// The real check behind every gated page and action: signature, expiry,
// revocation and a user that still exists. Anything wrong means signed out.
export async function verifySession(
  auth: Auth,
  cookie: string | undefined,
): Promise<SessionUser | null> {
  if (!cookie) return null;
  try {
    const claims = await auth.verifySessionCookie(cookie, true);
    return { uid: claims.uid, email: claims.email ?? null };
  } catch {
    return null;
  }
}
