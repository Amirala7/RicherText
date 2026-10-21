import { expect, test } from "@playwright/test";

// Basic security headers on every response (deploy gap, backend audit
// 2026-10-21): no framing, no type sniffing, no full referrer to other sites,
// no device features, HTTPS only once deployed.
const EXPECTED = {
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "content-security-policy": "frame-ancestors 'none'",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
  "strict-transport-security": "max-age=63072000; includeSubDomains",
};

for (const path of ["/", "/sign-in", "/documents", "/api/session"]) {
  test(`${path} sends the security headers`, async ({ request }) => {
    const response = await request.get(path, { maxRedirects: 0 });
    const headers = response.headers();
    for (const [name, value] of Object.entries(EXPECTED)) {
      expect(headers[name], name).toBe(value);
    }
  });
}
