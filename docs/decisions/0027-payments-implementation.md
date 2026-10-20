# 0027 — Payments: how Phase 3 builds it

- Status: accepted
- Date: 2026-10-21

## Context
ADR 0003 picked Stripe (sandbox) with Checkout, Customer Portal and our own webhook writing to Firestore. ADR 0020 and 0022 define Free vs paid; ADR 0024 the activation page after Checkout. This records how Phase 3 builds it.

## Decision
- **Stripe setup script** (idempotent, sandbox only): one product, two prices found by lookup key (`pro_monthly`, `pro_yearly`; placeholders $8 / $80, CONTEXT §6), and the Portal configuration. Code never hard-codes Stripe IDs.
- **Everything about an existing subscription happens in the Customer Portal** (user, 2026-10-21): update card, switch monthly ↔ yearly, cancel (at the end of the period), invoices. Our pricing page only starts a new subscription.
- **No trials, no promotion codes** in v1 (user, 2026-10-21). The Free plan does the trial's job (ADR 0020).
- **Checkout and Portal sessions** are created by Next route handlers behind `getCurrentUser()` (ADR 0026), not by Cloud Functions. The Stripe customer is created the first time a user goes to Checkout, with the uid in its metadata and in `client_reference_id`.
- **Webhook** (Cloud Function, ADR 0003): verifies the signature on the raw body; records the event ID in `stripeEvents/{eventId}` in the same transaction as the write, so a repeat is a no-op; then **re-reads the subscription from Stripe** and writes its current state, so the order events arrive in doesn't matter. Handles `checkout.session.completed` and `customer.subscription.created / updated / deleted`.
- **Data:** `customers/{uid}` holds `stripeCustomerId` and one derived `plan` (`free` | `paid`); `customers/{uid}/subscriptions/{subId}` holds each subscription's latest state. Only the server writes them; a user can read only their own (rules tests).
- **Status → plan:** `active`, `trialing` and **`past_due`** are `paid`; everything else (`incomplete`, `incomplete_expired`, `unpaid`, `canceled`, `paused`) is `free`. A cancelled subscription stays `active` until its period ends, so access runs to the end of what was paid for.
- **Failed payments keep access while Stripe retries** (user, 2026-10-21). Stripe's retry schedule and its final action (cancel the subscription) are set in the sandbox Dashboard (Billing → Revenue recovery); when retries run out the subscription is cancelled and the plan becomes `free` (ADR 0020 downgrade rules apply).
- **The app reads only Firestore** for the plan; the activation page watches the user's own `customers/{uid}` until `plan` is `paid`, with a timeout fallback.
- **Free-plan limits** (one document, read-only after a downgrade, no export) are enforced in Phase 4 with the document rules; Phase 3 provides the `plan` and the upgrade flows.
- **Testing:** unit tests for status → plan; webhook tests on the Functions emulator with events signed locally (test secret) and a fake Stripe client, so no network or keys; rules tests; one real sandbox run through the Stripe CLI in the last slice.

## Slices
1. Setup script, data model + rules, webhook.
2. Checkout + activation page.
3. Customer Portal + account page states.
4. End-to-end in the real sandbox via the Stripe CLI (needs the user's test keys in `.env.local`).

## Consequences
- "Failed payment locks it" (CONTEXT §4.2) now means: locks once Stripe gives up retrying, not on the first failure. During retries a user can be open while unpaid; this is deliberate (CONTEXT §8).
- The Dashboard retry setting is not in code; the setup script's output and the README say to check it.
- Next needs `STRIPE_SECRET_KEY`; the webhook Function needs it and `STRIPE_WEBHOOK_SECRET` (both already in `.env.example`).
