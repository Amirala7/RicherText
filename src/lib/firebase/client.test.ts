import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const initializeFirestore = vi.fn();
const waitForPendingWrites = vi.fn();
const terminate = vi.fn();
const clearIndexedDbPersistence = vi.fn();
vi.mock("firebase/app", () => ({
  getApps: () => ["app"],
  getApp: () => "app",
  initializeApp: vi.fn(),
}));
vi.mock("firebase/auth", () => ({}));
vi.mock("firebase/firestore", () => ({
  initializeFirestore: (...args: unknown[]) => initializeFirestore(...args),
  getFirestore: vi.fn(),
  connectFirestoreEmulator: vi.fn(),
  persistentLocalCache: (settings: unknown) => ({ persistent: settings }),
  persistentMultipleTabManager: () => "multi-tab",
  waitForPendingWrites: (...args: unknown[]) => waitForPendingWrites(...args),
  terminate: (...args: unknown[]) => terminate(...args),
  clearIndexedDbPersistence: (...args: unknown[]) =>
    clearIndexedDbPersistence(...args),
}));

const { getClientDb, clearClientDb, PENDING_WRITES_WAIT_MS } =
  await import("./client");

// Offline cache (ADR 0029): Firestore keeps data and queued writes in the
// browser's IndexedDB, shared by every open tab; sign out removes them.
describe("client Firestore cache", () => {
  let n = 0;
  beforeEach(() => {
    initializeFirestore.mockImplementation(() => ({ db: ++n }));
    waitForPendingWrites.mockResolvedValue(undefined);
    terminate.mockResolvedValue(undefined);
    clearIndexedDbPersistence.mockResolvedValue(undefined);
  });
  afterEach(async () => {
    await clearClientDb();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("keeps data on the device, shared across tabs", () => {
    getClientDb();
    expect(initializeFirestore).toHaveBeenCalledWith("app", {
      localCache: { persistent: { tabManager: "multi-tab" } },
    });
  });

  it("sets Firestore up once", () => {
    expect(getClientDb()).toBe(getClientDb());
    expect(initializeFirestore).toHaveBeenCalledTimes(1);
  });

  it("sends queued writes, then shuts Firestore down and deletes the cache", async () => {
    const db = getClientDb();
    const order: string[] = [];
    waitForPendingWrites.mockImplementation(async () => order.push("wait"));
    terminate.mockImplementation(async () => order.push("terminate"));
    clearIndexedDbPersistence.mockImplementation(async () =>
      order.push("clear"),
    );
    await clearClientDb();
    expect(order).toEqual(["wait", "terminate", "clear"]);
    expect(waitForPendingWrites).toHaveBeenCalledWith(db);
    expect(clearIndexedDbPersistence).toHaveBeenCalledWith(db);
  });

  it("starts a fresh Firestore after clearing", async () => {
    const before = getClientDb();
    await clearClientDb();
    expect(getClientDb()).not.toBe(before);
  });

  it("does nothing when Firestore was never used", async () => {
    await clearClientDb();
    expect(terminate).not.toHaveBeenCalled();
  });

  it("stops waiting for queued writes the server can't take", async () => {
    vi.useFakeTimers();
    getClientDb();
    waitForPendingWrites.mockReturnValue(new Promise(() => {}));
    const cleared = clearClientDb();
    await vi.advanceTimersByTimeAsync(PENDING_WRITES_WAIT_MS);
    await cleared;
    expect(clearIndexedDbPersistence).toHaveBeenCalled();
  });

  it("still finishes when the cache can't be deleted (another tab open)", async () => {
    getClientDb();
    clearIndexedDbPersistence.mockRejectedValue({
      code: "failed-precondition",
    });
    await expect(clearClientDb()).resolves.toBe(undefined);
  });

  it("clears once when sign out runs twice at the same time", async () => {
    getClientDb();
    await Promise.all([clearClientDb(), clearClientDb()]);
    expect(terminate).toHaveBeenCalledTimes(1);
  });
});
