import { spawn, type ChildProcess } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getAdminAuth } from "@/lib/firebase/admin";

// No token, cookie or personal data ever reaches the server's logs (user, 2026-10-21).
// Starts the app on its own port, runs every session path, then reads what it printed.
const port = 3200;
const base = `http://localhost:${port}`;
const origin = { origin: base };
const jwt = /eyJ[\w-]{8,}\.[\w-]{8,}\./;
const signUpUrl =
  "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key";

let server: ChildProcess;
let output = "";

async function waitForServer() {
  for (let i = 0; i < 120; i++) {
    try {
      await fetch(`${base}/sign-in`, { redirect: "manual" });
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error(`App didn't start:\n${output}`);
}

function cookieFrom(res: Response) {
  const header = res.headers.get("set-cookie") ?? "";
  return /__session=([^;]+)/.exec(header)?.[1] ?? "";
}

describe("server logs", () => {
  const email = `logs-${crypto.randomUUID()}@example.com`;
  const password = "secret-password-123";
  let uid = "";
  let idToken = "";
  let cookie = "";

  beforeAll(async () => {
    server = spawn("pnpm", ["exec", "next", "dev", "--port", String(port)], {
      env: { ...process.env, NEXT_DIST_DIR: ".next-logtest" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    server.stdout?.on("data", (d) => (output += d));
    server.stderr?.on("data", (d) => (output += d));
    await waitForServer();

    const res = await fetch(signUpUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    });
    ({ idToken, localId: uid } = (await res.json()) as {
      idToken: string;
      localId: string;
    });

    // Sign in: token for cookie.
    const session = await fetch(`${base}/api/session`, {
      method: "POST",
      headers: { "content-type": "application/json", ...origin },
      body: JSON.stringify({ idToken }),
    });
    expect(session.status).toBe(204);
    cookie = cookieFrom(session);
    expect(cookie).not.toBe("");

    const withCookie = (value: string) => ({ cookie: `__session=${value}` });
    const get = (path: string, headers: Record<string, string>) =>
      fetch(`${base}${path}`, { headers, redirect: "manual" });

    // A gated page with a good, a forged and (later) a revoked session.
    expect((await get("/documents", withCookie(cookie))).status).toBe(200);
    expect((await get("/documents", withCookie(`${cookie}x`))).status).toBe(
      307,
    );
    await get("/api/session/expired?next=/documents", withCookie(`${cookie}x`));

    // Refused exchanges: bad token, token from another site, broken body.
    for (const [headers, body] of [
      [origin, JSON.stringify({ idToken: `${idToken}x` })],
      [{ origin: "https://evil.example" }, JSON.stringify({ idToken })],
      [origin, "{not json"],
    ] as const) {
      const res = await fetch(`${base}/api/session`, {
        method: "POST",
        headers: { "content-type": "application/json", ...headers },
        body,
      });
      expect(res.status).toBeGreaterThanOrEqual(400);
    }

    // Sign out, then a revoked session.
    await fetch(`${base}/api/session`, { method: "DELETE", headers: origin });
    await new Promise((r) => setTimeout(r, 1100));
    await getAdminAuth().revokeRefreshTokens(uid);
    await get("/documents", withCookie(cookie));
  }, 180_000);

  afterAll(() => {
    server?.kill();
  });

  it("actually captured the app's output", () => {
    expect(output).toMatch(/Ready|Local:/);
    expect(output).toMatch(/\/documents/);
  });

  it.each([
    ["the email", () => email],
    ["the password", () => password],
    ["the uid", () => uid],
    ["the ID token", () => idToken],
    ["the session cookie", () => cookie],
  ])("never prints %s", (_name, secret) => {
    expect(secret()).not.toBe("");
    expect(output).not.toContain(secret());
  });

  it("never prints anything shaped like a token", () => {
    expect(output).not.toMatch(jwt);
  });
});
