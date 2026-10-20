import { beforeEach, describe, expect, it, vi } from "vitest";

const sendPasswordResetEmail = vi.fn();
vi.mock("firebase/auth", () => ({
  createUserWithEmailAndPassword: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  sendPasswordResetEmail: (...args: unknown[]) =>
    sendPasswordResetEmail(...args),
}));
vi.mock("@/lib/firebase/client", () => ({ getClientAuth: () => "auth" }));

const { sendReset } = await import("./client");

// Password reset (ADR 0026): Firebase sends the email and hosts the new-password page.
describe("sendReset", () => {
  beforeEach(() => {
    sendPasswordResetEmail.mockReset();
  });

  it("asks Firebase to email a link that comes back to sign in", async () => {
    sendPasswordResetEmail.mockResolvedValue(undefined);
    await sendReset({ email: "maya@studio.co" });
    expect(sendPasswordResetEmail).toHaveBeenCalledWith(
      "auth",
      "maya@studio.co",
      { url: `${window.location.origin}/sign-in` },
    );
  });

  it("reads the same when there is no such account", async () => {
    sendPasswordResetEmail.mockRejectedValue({ code: "auth/user-not-found" });
    await expect(sendReset({ email: "nobody@studio.co" })).resolves.toBe(
      undefined,
    );
  });

  it("passes on other failures", async () => {
    const error = { code: "auth/network-request-failed" };
    sendPasswordResetEmail.mockRejectedValue(error);
    await expect(sendReset({ email: "maya@studio.co" })).rejects.toBe(error);
  });
});
