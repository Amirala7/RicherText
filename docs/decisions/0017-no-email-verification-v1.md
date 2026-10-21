# 0017 — No email verification in v1

- Status: accepted (supersedes the email-verification part of ADR 0005)
- Date: 2026-10-20

## Context
ADR 0005 required users to verify their email (Firebase verification link) before checkout, with a "check your inbox" screen. I decided email + password alone is enough for v1.

## Decision
Sign-up is email + password only. No verification email, no "check your inbox" screen, and no `email_verified` check before checkout or when gating the editor. Everything else in ADR 0005 stands (session cookies, UID as the key, password reset).

## Options considered
- **Verify before checkout** (ADR 0005): a reachable email for every paying account, but one more step before writing.
- **No verification** (chosen): fastest path to writing (CONTEXT §8 "under 2 minutes"), smaller first slice.

## Consequences
- Sign up goes straight to choosing a plan.
- Risks we accept for now: a mistyped email means receipts, billing notices and password-reset emails go nowhere, and the user can't recover the account; anyone can sign up with an address they don't own; throwaway sign-ups are easier.
- Adding verification later is listed in CONTEXT §12, with these reasons.
