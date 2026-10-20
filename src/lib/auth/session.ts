import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { getAdminAuth } from "@/lib/firebase/admin";
import { PATH_HEADER, SESSION_COOKIE, verifySession } from "./session-core";

// The real check (ADR 0026): call it in every gated layout, server action and
// route handler. Cached per request.
export const getCurrentUser = cache(async () => {
  // Verifying reads the clock, so it must run per request, never in a prerender.
  await connection();
  const cookie = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySession(getAdminAuth(), cookie);
});

// For gated pages. A cookie that fails the check is cleared by the expired
// route first, or the proxy would bounce sign-in straight back here.
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    const path = (await headers()).get(PATH_HEADER) ?? "/documents";
    redirect(`/api/session/expired?next=${encodeURIComponent(path)}`);
  }
  return user;
}
