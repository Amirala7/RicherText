import { cookies } from "next/headers";
import { isSameOrigin } from "@/lib/auth/origin";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  mintSessionCookie,
} from "@/lib/auth/session-core";
import { getAdminAuth } from "@/lib/firebase/admin";

// Exchanges a Firebase ID token for the session cookie (ADR 0005, 0026).
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return new Response(null, { status: 403 });
  const body: unknown = await request.json().catch(() => null);
  const idToken =
    typeof body === "object" && body !== null && "idToken" in body
      ? body.idToken
      : null;
  if (typeof idToken !== "string") return new Response(null, { status: 400 });

  let value: string;
  try {
    value = await mintSessionCookie(getAdminAuth(), idToken);
  } catch {
    return new Response(null, { status: 401 });
  }
  (await cookies()).set(SESSION_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return new Response(null, { status: 204 });
}

// Sign out on this device only (ADR 0026).
export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return new Response(null, { status: 403 });
  (await cookies()).delete(SESSION_COOKIE);
  return new Response(null, { status: 204 });
}
