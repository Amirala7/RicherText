# 0029 — Firestore offline cache on the device

- Status: accepted (builds on 0004, 0028)
- Date: 2026-10-21

## Context
With Firestore's default memory cache, a write still on its way to the server is lost if the page is reloaded or closed in that moment (seen with a rename in e2e, 2026-10-21). Autosave (Phase 4 slice 3) makes this matter: principle "never lose a keystroke".

## Options considered
- **Memory cache** (the default): nothing stays on the device, but queued writes die with the tab.
- **Persistent cache in IndexedDB** (chosen, user, 2026-10-21): data and queued writes survive reloads and lost connections; documents open from the device while offline. Document data stays on the device, so sign out must remove it.

## Decision
- The browser's Firestore uses `persistentLocalCache` with `persistentMultipleTabManager` (every open tab shares one cache; `src/lib/firebase/client.ts`).
- **Sign out** (`signOut` in `src/lib/auth/client.ts`, also run by the session keeper when the Firebase session is gone): after dropping the cookie and before the Firebase sign-out, `clearClientDb()` waits up to 5 s for queued writes to land, then terminates Firestore and deletes its IndexedDB cache. The next `getClientDb()` starts a fresh instance.

## Consequences
- Edits made offline sync later, also after a reload; screens that watch Firestore (`/documents`, `/account`, `/welcome`) may first show the cached copy, then the server's.
- Writes still queued after the 5 s (offline at sign out) are dropped with the cache: a sign-out on a shared device wins over unsynced edits. A warning before signing out with unsynced changes: CONTEXT §12.
- Deleting the cache fails while another tab still has it open; best effort, that tab signs itself out through the session keeper.
- Server rendering never touches the client Firestore (all callers run in effects or handlers).

## Built (2026-10-21)
`src/lib/firebase/client.ts` (`getClientDb`, `clearClientDb`), `src/lib/auth/client.ts`. Tests: `src/lib/firebase/client.test.ts`, `src/lib/auth/sign-out.test.ts`, `e2e/offline.spec.ts` (rename with Firestore unreachable survives a reload and lands later; sign out leaves no `firestore/…` IndexedDB database).
