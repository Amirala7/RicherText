import { beforeEach, describe, expect, it, vi } from "vitest";

const order: string[] = [];
vi.mock("firebase/auth", () => ({
  signOut: async () => order.push("firebase sign out"),
}));
vi.mock("@/lib/firebase/client", () => ({
  getClientAuth: () => "auth",
  clearClientDb: async () => order.push("clear cache"),
}));

const { signOut } = await import("./client");

// Sign out leaves no documents on the device (ADR 0029). The cache goes
// first, while the user is still signed in, so queued writes can still land.
describe("signOut", () => {
  beforeEach(() => {
    order.length = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        order.push("drop cookie");
        return new Response(null, { status: 204 });
      }),
    );
  });

  it("clears the offline cache before signing out of Firebase", async () => {
    await signOut();
    expect(order).toEqual(["drop cookie", "clear cache", "firebase sign out"]);
  });
});
