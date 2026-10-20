const appPaths = ["/documents", "/account", "/editor"];
const authPaths = ["/sign-in", "/sign-up", "/reset-password"];

function within(pathname: string, paths: string[]) {
  return paths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

// Cookie-presence check for the proxy; the real check is getCurrentUser() (ADR 0026).
// Returns where to redirect, or null to let the request through.
export function gate(
  pathname: string,
  search: string,
  hasSession: boolean,
): string | null {
  if (!hasSession && within(pathname, appPaths)) {
    return `/sign-in?next=${encodeURIComponent(pathname + search)}`;
  }
  if (hasSession && within(pathname, authPaths)) return "/documents";
  return null;
}
