import { describe, expect, it } from "vitest";
import { isSameOrigin } from "./origin";

function request(headers: Record<string, string>) {
  return new Request("http://localhost:3000/api/session", {
    method: "POST",
    headers,
  });
}

// The session route only accepts calls from our own pages (ADR 0026).
describe("isSameOrigin", () => {
  it("accepts a request whose Origin matches the Host", () => {
    expect(
      isSameOrigin(
        request({ origin: "http://localhost:3000", host: "localhost:3000" }),
      ),
    ).toBe(true);
  });

  it("uses the forwarded host behind a proxy", () => {
    expect(
      isSameOrigin(
        request({
          origin: "https://richertext.app",
          host: "internal:8080",
          "x-forwarded-host": "richertext.app",
        }),
      ),
    ).toBe(true);
  });

  it("rejects another site", () => {
    expect(
      isSameOrigin(
        request({ origin: "https://evil.example", host: "localhost:3000" }),
      ),
    ).toBe(false);
  });

  it("rejects a request without an Origin", () => {
    expect(isSameOrigin(request({ host: "localhost:3000" }))).toBe(false);
  });

  it("rejects a malformed Origin", () => {
    expect(
      isSameOrigin(request({ origin: "null", host: "localhost:3000" })),
    ).toBe(false);
  });
});
