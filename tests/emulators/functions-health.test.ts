import { describe, expect, it } from "vitest";

// Smoke test: the Functions emulator loads the functions package.
const url = "http://127.0.0.1:5001/demo-richertext/us-central1/health";

describe("functions: health", () => {
  it("answers 200 with ok: true", async () => {
    const res = await fetch(url);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
