import type { DocumentJson } from "@/lib/documents/model";
import type { WritingFont } from "@/lib/settings/writing";

// Autosave (CONTEXT §5, ADR 0029): one save 1 s after typing stops, and at
// least one every 5 s while it goes on. Writes go to Firestore, which keeps
// them in the device cache until the server takes them; one waiting more than
// 2 s means offline (Saved on device). A rejected write keeps its changes for
// Retry or the next save.
export const IDLE_MS = 1000;
export const MAX_WAIT_MS = 5000;
export const DEVICE_AFTER_MS = 2000;

export type SaveState = "saved" | "saving" | "device" | "error";
export type Changes = {
  title?: string;
  doc?: DocumentJson;
  font?: WritingFont;
};

export function createAutosave(
  save: (changes: Changes) => Promise<void>,
  onState: (state: SaveState) => void,
) {
  let pending: Changes | null = null;
  let inFlight = 0;
  let slow = 0;
  let failed = false;
  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  let maxTimer: ReturnType<typeof setTimeout> | undefined;
  let state: SaveState = "saved";

  function report() {
    const next: SaveState = failed
      ? "error"
      : pending || (inFlight > 0 && slow === 0)
        ? "saving"
        : inFlight > 0
          ? "device"
          : "saved";
    if (next !== state) {
      state = next;
      onState(next);
    }
  }

  function clearTimers() {
    clearTimeout(idleTimer);
    clearTimeout(maxTimer);
    idleTimer = maxTimer = undefined;
  }

  function flush() {
    clearTimers();
    if (!pending) return;
    const changes = pending;
    pending = null;
    failed = false;
    inFlight++;
    let waiting = true;
    const deviceTimer = setTimeout(() => {
      if (!waiting) return;
      slow++;
      report();
    }, DEVICE_AFTER_MS);
    const settle = () => {
      waiting = false;
      clearTimeout(deviceTimer);
      inFlight--;
      if (inFlight === 0) slow = 0;
    };
    save(changes).then(
      () => {
        settle();
        report();
      },
      () => {
        settle();
        // Newer changes win over the ones that failed.
        pending = { ...changes, ...pending };
        failed = true;
        report();
      },
    );
    report();
  }

  return {
    change(changes: Changes) {
      pending = { ...pending, ...changes };
      clearTimeout(idleTimer);
      idleTimer = setTimeout(flush, IDLE_MS);
      maxTimer ??= setTimeout(flush, MAX_WAIT_MS);
      failed = false;
      report();
    },
    flush,
    retry: flush,
    // Leaving the editor: write what's waiting now, then stop the timers.
    dispose() {
      flush();
      clearTimers();
    },
  };
}
