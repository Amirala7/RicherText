import { NextResponse, type NextRequest } from "next/server";
import { gate } from "@/lib/auth/gate";
import { PATH_HEADER, SESSION_COOKIE } from "@/lib/auth/session-core";

// Optimistic check only: is there a session cookie at all (ADR 0026).
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const target = gate(pathname, search, request.cookies.has(SESSION_COOKIE));
  if (target) return NextResponse.redirect(new URL(target, request.url));
  // Gated layouts read the path to send an expired session back to it.
  const headers = new Headers(request.headers);
  headers.set(PATH_HEADER, pathname + search);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: [
    "/documents/:path*",
    "/account/:path*",
    "/editor/:path*",
    "/sign-in",
    "/sign-up",
  ],
};
