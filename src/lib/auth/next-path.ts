const fallback = "/documents";
const authPages = ["/sign-in", "/sign-up"];

// Where to go after sign in: only a path on this site, never back to an auth page (ADR 0026).
export function safeNextPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//"))
    return fallback;
  let url: URL;
  try {
    url = new URL(value, "http://local");
  } catch {
    return fallback;
  }
  if (url.origin !== "http://local" || /\\|%5c/i.test(value)) return fallback;
  if (authPages.includes(url.pathname)) return fallback;
  return url.pathname + url.search + url.hash;
}
