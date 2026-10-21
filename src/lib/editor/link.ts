// Link editor addresses (slice 4, 2026-10-21): the schema only keeps
// http(s) and mailto links, so the editor only makes those. A bare address
// gets https://, an email address mailto:; anything else is refused (null).
const KEPT = /^(https?:\/\/|mailto:)/i;
// Another scheme ("javascript:", "ftp:"), but not a host with a port.
const SCHEME = /^[a-z][a-z0-9+.-]*:(?!\d)/i;
const EMAIL = /^[^\s@/:]+@[^\s@/:]+\.[^\s@/:]+$/;
// A host with a dot in it, then an optional port, path, query or hash.
const BARE = /^[^\s/?#@:]+\.[^\s/?#@:]+(:\d+)?([/?#]\S*)?$/;

export function normalizeLink(input: string): string | null {
  const text = input.trim();
  if (KEPT.test(text)) return valid(text);
  if (EMAIL.test(text)) return `mailto:${text}`;
  if (SCHEME.test(text) || !BARE.test(text)) return null;
  return valid(`https://${text}`);
}

function valid(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "mailto:" || parsed.hostname ? url : null;
  } catch {
    return null;
  }
}
