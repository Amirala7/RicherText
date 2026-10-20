import { describe, expect, it } from "vitest";
import { authErrorMessage } from "./errors";

function firebaseError(code: string) {
  return Object.assign(new Error(code), { code });
}

// One place turns Firebase errors into plain words (ADR 0026).
describe("authErrorMessage", () => {
  it.each([
    "auth/invalid-credential",
    "auth/wrong-password",
    "auth/user-not-found",
    "auth/invalid-email",
  ])("gives one generic message for %s", (code) => {
    expect(authErrorMessage(firebaseError(code))).toBe(
      "That email and password don't match. Try again or reset your password.",
    );
  });

  it("says when the email already has an account", () => {
    expect(authErrorMessage(firebaseError("auth/email-already-in-use"))).toBe(
      "An account with this email already exists.",
    );
  });

  it("asks to wait after too many attempts", () => {
    expect(authErrorMessage(firebaseError("auth/too-many-requests"))).toBe(
      "Too many attempts. Try again in a few minutes.",
    );
  });

  it("points at the connection when the network fails", () => {
    expect(authErrorMessage(firebaseError("auth/network-request-failed"))).toBe(
      "Can't reach RicherText. Check your connection and try again.",
    );
  });

  it.each([firebaseError("auth/internal-error"), new Error("boom"), "x", null])(
    "falls back to a general message for %s",
    (error) => {
      expect(authErrorMessage(error)).toBe("Something went wrong. Try again.");
    },
  );
});
