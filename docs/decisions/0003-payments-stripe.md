# 0003 — Payments: Stripe (sandbox), hand-written webhook in Cloud Functions

- Status: accepted
- Date: 2026-10-19

## Context
Paying has to unlock the editor, and access must always match payment state (CONTEXT §8).

## Decision
- **Stripe sandbox (test mode) only.** No live keys, no real charges.
- Stripe Checkout (hosted) for subscribing; Stripe Customer Portal for managing billing.
- **Our own webhook**: a Cloud Function that verifies the Stripe signature and writes subscription state to Firestore (`customers/{uid}/subscriptions/{subId}`, see 0004).
- The database is the source of truth for access. The app reads entitlement from Firestore and never calls Stripe on a page load.

## Options considered
- **"Run Payments with Stripe" Firebase extension**: less code, but less control and visibility into billing logic. Rejected in favour of writing it ourselves.

## Consequences
- Webhook handling must be idempotent (Stripe retries, and events can arrive out of order). Store processed event IDs, and rely on each subscription's latest state rather than the order events arrive in.
- Only the server may write subscription and customer records; security rules make them read-only for clients.
- Locally, test with the Stripe CLI (`stripe listen --forward-to ...`) against the Functions emulator.
- Tax handling is out of scope (see CONTEXT §11, Future questions).
