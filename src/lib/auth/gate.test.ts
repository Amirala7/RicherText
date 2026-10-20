import { describe, expect, it } from "vitest";
import { gate } from "./gate";

// The proxy's cheap check: is there a session cookie at all (ADR 0026).
describe("gate", () => {
  it.each(["/documents", "/account", "/editor/abc"])(
    "sends a signed-out visitor from %s to sign in, remembering where they were",
    (path) => {
      expect(gate(path, "", false)).toBe(
        `/sign-in?next=${encodeURIComponent(path)}`,
      );
    },
  );

  it("keeps the query string in next", () => {
    expect(gate("/documents", "?q=notes", false)).toBe(
      `/sign-in?next=${encodeURIComponent("/documents?q=notes")}`,
    );
  });

  it.each(["/sign-in", "/sign-up"])(
    "sends a signed-in visitor from %s to the documents page",
    (path) => {
      expect(gate(path, "", true)).toBe("/documents");
    },
  );

  it("lets a signed-in visitor through to the app", () => {
    expect(gate("/documents", "", true)).toBeNull();
  });

  it.each(["/", "/sign-in", "/sign-up", "/reset-password", "/pricing"])(
    "leaves public page %s open when signed out",
    (path) => {
      expect(gate(path, "", false)).toBeNull();
    },
  );
});

describe("gate on password reset", () => {
  it("sends a signed-in visitor from /reset-password to the documents page", () => {
    expect(gate("/reset-password", "", true)).toBe("/documents");
  });
});
