# 0026 — Auth: sessions, gating and flows

- Status: accepted
- Date: 2026-10-20

## Context
ADR 0005 picked Firebase Auth (email + password) with Admin SDK session cookies; ADR 0017 dropped email verification; ADR 0024 fixed the auth screens. This records how Phase 2 builds it.

## Decision
- **Client signs in, server holds the session.** The Firebase JS SDK signs up / signs in (persistent, so Firestore rules and autosave work after a reload). Its ID token is exchanged at `POST /api/session` for an Admin SDK session cookie: `__session`, `httpOnly`, `SameSite=Lax`, `Secure` in production, 14 days. The route rejects requests whose `Origin` isn't ours.
- **Silent refresh:** while the user is active, the app re-mints the cookie from a fresh ID token before it expires, so active writers are never signed out at 14 days.
- **Two-layer gating:** `proxy.ts` only checks the cookie is present (no cookie on an app route → `/sign-in?next=…`; cookie on an auth page → `/documents`). The real check is a server-only `getCurrentUser()` (`verifySessionCookie` with revocation check, cached per request), run in the `(app)` layout **and** in every server action and route handler.
- **`next` redirect** accepts relative paths only.
- **Sign out** clears the client session and the cookie (`DELETE /api/session`), **this device only**.
- **Errors:** one generic message for wrong email or password; password reset always ends on "Reset link sent".
- **Password reset** completes on **Firebase's default hosted page** (unbranded); no in-app "new password" screen in v1.
- **Password minimum: 8 characters**, checked in the form (Zod).
- No `users/{uid}` document in Phase 2; no subscription means Free (Phase 3/4 adds data).
- Emulators: client `connectAuthEmulator`, Admin SDK via `FIREBASE_AUTH_EMULATOR_HOST`.

- **Logs never carry tokens or personal data** (user, 2026-10-21): no `console` in `src/` (ESLint `no-console`); tests check the server output (`tests/emulators/no-secrets-in-server-logs.test.ts`, a real `next dev` through every session path) and the browser console (`e2e/no-secrets-in-console.spec.ts`) for the email, password, uid, ID token, session cookie and anything shaped like a JWT. The Auth emulator's own debug logs are local only and gitignored.

## Built (slice 1, 2026-10-21)
- Sign in was folded into slice 1 (gating redirects to it, so it had to exist); slice 2 is now only password reset.
- Next 16 Cache Components: the `(app)` layout sets `instant = false` (blocks on the server until the check passes) and `getCurrentUser()` calls `connection()` first (verifying reads the clock). Sign-in stays static; it reads `next` in the browser at submit time.
- A cookie that fails the check goes through `GET /api/session/expired`, which clears it (only if it really is invalid) and sends the visitor to sign in, so the proxy can't bounce between sign-in and the app. The proxy passes the asked-for path to gated layouts in `x-rt-path`.
- The account menu has Documents, Theme and Sign out; Account joins when the account page exists.

## Options considered
- **Client-only auth** (no cookie): the editor is server-rendered and must know the user, so no.
- **In-memory client persistence**: cleaner single source of truth, but the client would lose its Firebase user on reload and Firestore rules would fail.
- **In-app reset page**: branded, but a new screen needing design approval; deferred.
- **Hard re-sign-in every 14 days**: simpler, but interrupts active writers.
- **Sign out everywhere** (revoke refresh tokens): deferred to CONTEXT §12.

## Consequences
- Slices: (1) session plumbing, gating, sign up, sign out; (2) sign in with `next`; (3) password reset.
- New dependencies: `firebase`, `firebase-admin`.
- Phase 3 adds the entitlement check on top of `getCurrentUser()`.
