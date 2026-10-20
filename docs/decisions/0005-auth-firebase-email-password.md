# 0005 — Authentication: Firebase Auth, email + password

- Status: accepted
- Date: 2026-10-19

## Context
Users must sign in before they can pay and reach the editor. We're on Firebase (0002) and Firestore security rules work off Firebase Auth identities (0004).

## Decision
Firebase Authentication with the email + password provider only.

## Options considered
- **Google / social sign-in**: less friction, but deferred to keep the slice small.
- **Magic link**: no password to remember, but every sign-in depends on email delivery.

## Consequences
- Need flows for sign-up, sign-in, sign-out and password reset (Firebase's reset email).
- **Server-side gating:** the editor is server-rendered, so the server must know who the user is. Use the Firebase Admin SDK to issue session cookies (`createSessionCookie`) and verify them in Next.js server code before checking the subscription in Firestore.
- The Firebase UID is the key everywhere: `users/{uid}`, `customers/{uid}`, and the Stripe customer's metadata.
- ~~**Email verification is required before checkout.**~~ Superseded by ADR 0017 (2026-10-20): no verification in v1. Users verify through Firebase's verification email; the server checks `email_verified` on the session before creating a Stripe Checkout session, and again when gating the editor.
  - Trade-off accepted: this adds a step to the "under 2 minutes to writing" target (CONTEXT §8), in exchange for making sure the paying account has a reachable email (receipts, password reset, billing notices).
  - Needs a "check your inbox" screen with resend, and a way to continue automatically once the email is verified.
