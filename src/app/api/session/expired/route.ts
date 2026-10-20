import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/auth/next-path";
import { getCurrentUser } from "@/lib/auth/session";
import { SESSION_COOKIE } from "@/lib/auth/session-core";

// Where a gated page sends a cookie that failed the check: clear it, then sign in.
// A valid session is left alone, so a link here can't sign anyone out.
export async function GET(request: NextRequest) {
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));
  if (await getCurrentUser()) {
    return NextResponse.redirect(new URL(next, request.url));
  }
  const response = NextResponse.redirect(
    new URL(`/sign-in?next=${encodeURIComponent(next)}`, request.url),
  );
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
