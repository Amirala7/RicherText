import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEVICE_AFTER_MS,
  IDLE_MS,
  MAX_WAIT_MS,
  createAutosave,
  type Changes,
  type SaveState,
} from "./autosave";

// Autosave (CONTEXT §5, ADR 0029): saves 1 s after typing stops, at least
// every 5 s while typing goes on. The indicator reads Saving until the server
// confirms, Saved on device when a write waits longer than 2 s (offline),
// Not saved when a write is rejected.
const doc = (text: string) => ({
  type: "doc" as const,
  content: [{ type: "paragraph", content: [{ type: "text", text }] }],
});

type Deferred = { resolve: () => void; reject: (e: unknown) => void };

let calls: { changes: Changes; done: Deferred }[];
let states: SaveState[];
const last = () => states.at(-1);

function setup() {
  calls = [];
  states = [];
  return createAutosave(
    (changes) =>
      new Promise<void>((resolve, reject) => {
        calls.push({ changes, done: { resolve, reject } });
      }),
    (state) => states.push(state),
  );
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("autosave", () => {
  it("waits for a pause in typing, then saves the latest changes", async () => {
    const autosave = setup();
    autosave.change({ doc: doc("a") });
    expect(last()).toBe("saving");
    await vi.advanceTimersByTimeAsync(IDLE_MS - 1);
    autosave.change({ doc: doc("ab") });
    await vi.advanceTimersByTimeAsync(IDLE_MS - 1);
    expect(calls).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(calls.map((c) => c.changes)).toEqual([{ doc: doc("ab") }]);
  });

  it("saves at least every 5 s while typing goes on", async () => {
    const autosave = setup();
    for (let t = 0; t < MAX_WAIT_MS; t += IDLE_MS / 2) {
      autosave.change({ doc: doc(String(t)) });
      await vi.advanceTimersByTimeAsync(IDLE_MS / 2);
    }
    expect(calls).toHaveLength(1);
  });

  it("saves title and content together", async () => {
    const autosave = setup();
    autosave.change({ title: "Plan" });
    autosave.change({ doc: doc("a") });
    await vi.advanceTimersByTimeAsync(IDLE_MS);
    expect(calls[0].changes).toEqual({ title: "Plan", doc: doc("a") });
  });

  it("reads Saved once the server confirms", async () => {
    const autosave = setup();
    autosave.change({ doc: doc("a") });
    await vi.advanceTimersByTimeAsync(IDLE_MS);
    expect(last()).toBe("saving");
    calls[0].done.resolve();
    await vi.advanceTimersByTimeAsync(0);
    expect(last()).toBe("saved");
  });

  it("reads Saved on device while a write waits for the server", async () => {
    const autosave = setup();
    autosave.change({ doc: doc("a") });
    await vi.advanceTimersByTimeAsync(IDLE_MS + DEVICE_AFTER_MS);
    expect(last()).toBe("device");
    calls[0].done.resolve();
    await vi.advanceTimersByTimeAsync(0);
    expect(last()).toBe("saved");
  });

  it("keeps writing new changes while an earlier write still waits", async () => {
    const autosave = setup();
    autosave.change({ doc: doc("a") });
    await vi.advanceTimersByTimeAsync(IDLE_MS + DEVICE_AFTER_MS);
    autosave.change({ doc: doc("ab") });
    expect(last()).toBe("saving");
    await vi.advanceTimersByTimeAsync(IDLE_MS);
    expect(calls).toHaveLength(2);
    calls[0].done.resolve();
    await vi.advanceTimersByTimeAsync(0);
    expect(last()).not.toBe("saved");
    calls[1].done.resolve();
    await vi.advanceTimersByTimeAsync(0);
    expect(last()).toBe("saved");
  });

  it("reads Not saved when a write is rejected, and Retry sends it again", async () => {
    const autosave = setup();
    autosave.change({ title: "Plan", doc: doc("a") });
    await vi.advanceTimersByTimeAsync(IDLE_MS);
    calls[0].done.reject(new Error("permission-denied"));
    await vi.advanceTimersByTimeAsync(0);
    expect(last()).toBe("error");

    autosave.retry();
    expect(calls[1].changes).toEqual({ title: "Plan", doc: doc("a") });
    expect(last()).toBe("saving");
    calls[1].done.resolve();
    await vi.advanceTimersByTimeAsync(0);
    expect(last()).toBe("saved");
  });

  it("after a rejected write, the next save carries the lost changes too", async () => {
    const autosave = setup();
    autosave.change({ title: "Plan", doc: doc("a") });
    await vi.advanceTimersByTimeAsync(IDLE_MS);
    calls[0].done.reject(new Error("unavailable"));
    await vi.advanceTimersByTimeAsync(0);
    autosave.change({ doc: doc("ab") });
    await vi.advanceTimersByTimeAsync(IDLE_MS);
    expect(calls[1].changes).toEqual({ title: "Plan", doc: doc("ab") });
  });

  it("flush saves right away", async () => {
    const autosave = setup();
    autosave.change({ doc: doc("a") });
    autosave.flush();
    expect(calls).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(IDLE_MS);
    expect(calls).toHaveLength(1);
  });

  it("flush with nothing waiting saves nothing", () => {
    const autosave = setup();
    autosave.flush();
    expect(calls).toHaveLength(0);
  });

  it("dispose stops the timers without losing a scheduled save", async () => {
    const autosave = setup();
    autosave.change({ doc: doc("a") });
    autosave.dispose();
    expect(calls).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(MAX_WAIT_MS);
    expect(calls).toHaveLength(1);
  });
});
