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
3. Customer Portal + account page states (built 2026-10-21).
4. End-to-end in the real sandbox via the Stripe CLI (done 2026-10-21).

## Consequences
- "Failed payment locks it" (CONTEXT §4.2) now means: locks once Stripe gives up retrying, not on the first failure. During retries a user can be open while unpaid; this is deliberate (CONTEXT §8).
- The Dashboard retry setting is not in code; the setup script's output and the README say to check it.
- Next needs `STRIPE_SECRET_KEY`; the webhook Function needs it and `STRIPE_WEBHOOK_SECRET` (both already in `.env.example`).

## Built (slice 1, 2026-10-21)
- `pnpm stripe:setup` (`scripts/stripe-setup.mjs`): reads `STRIPE_SECRET_KEY` from `.env.local`, refuses anything but a sandbox secret key, prints the IDs and the Dashboard retry reminder. The Portal configuration is tagged `metadata.app = richertext`, so slice 3 finds it by that tag.
- Webhook: `functions/src/billing/webhook.ts` (logic, testable with a fake Stripe) and `stripeWebhook` in `functions/src/index.ts`. Secrets via `defineSecret` (Secret Manager in production; `functions/.secret.local` for the emulator, gitignored; needed only from slice 4). The Stripe client is made only after the signature checks out.
- Each subscription record also stores `customerId`, `priceId` and `lookupKey`.
- The Stripe customer must carry `metadata.uid`; slice 2 sets it when it creates the customer. Subscriptions whose customer has no `uid` are ignored (200, logged by event ID only).

## Built (slice 4, 2026-10-21)
- `pnpm stripe:secrets` writes `functions/.secret.local` from `.env.local` (sandbox keys only); `pnpm dev:all` runs it first and skips it when no keys are set. `pnpm stripe:listen` forwards the four handled events to the emulator's `stripeWebhook`, passes the API key by environment and hides secrets in the CLI's output (ADR 0026).
- Real sandbox run against `pnpm dev:all`: sign up with `?plan=monthly` → Checkout with 4242 → `/welcome` → Documents; `/account` "Monthly, renews 21 Nov"; Portal cancel → "Ends 21 Nov" + Resubscribe; Portal renew → back to "renews". Every event answered 200 within about 2s.
- **Found and fixed:** the Portal cancels "at period end" by setting `cancel_at` to the period end and leaving `cancel_at_period_end` false (API version 2025-01-27.acacia and later). The webhook now records `cancelAtPeriodEnd` when either is set.
- Not run against the real sandbox: failed payments (`past_due`) and the end of a period; both stay covered by the emulator tests. The Dashboard retry setting is the user's to check.

## Built (slice 3, 2026-10-21)
- **Account page `/account`** (Documents · Account in the app bar; Account in the account menu): Profile shows the email only (no Change yet; user, 2026-10-21); Subscription has one row: Free (chip, "One document at a time", Upgrade → `/plans`) · Active ("Yearly, renews 19 Nov 2027", Manage) · Ends on date (warning chip "Ends 19 Nov", Resubscribe) · Payment due (warning chip, Update card, warning notice on top). Dates in UTC, year shown only when it isn't this year. Writing joins in Phase 4.
- Every paid action (Manage, Resubscribe, Update card) opens the Portal: renewing a cancelled plan happens there too, so a paid user never goes through Checkout twice.
- The page is rendered with the plan as it is, then follows `customers/{uid}` and its subscriptions live, so a change made in the Portal shows as soon as the webhook writes it.
- `POST /api/billing/portal` → `{ url }`: same-origin and signed-in only; finds the Portal configuration by `metadata.app = richertext`, `return_url` `/account`; a user with no Stripe customer gets `/plans` (Stripe isn't reached). Stripe errors answer 502, log nothing, and the page shows "Couldn't open the billing portal. Try again."
- `warning` colour token (from the approved atoms page) for the chips and the notice. Settings row and notice built; their action is optional.
- A paid user going to `/plans` still lands on Documents (locked test from slice 2).

## Built (slice 2, 2026-10-21)
- **In-app pricing lives at `/plans`** (what See plans / Upgrade lead to), not `/pricing`: a locked gate test keeps `/pricing` public for the landing page (Phase 5). A paid user going to `/plans` lands on Documents (the account page takes over in slice 3).
- `POST /api/billing/checkout { plan }` → `{ url }`: same-origin and signed-in only; makes the Stripe customer once (`metadata.uid`, idempotency key `customer-<uid>`), keeps any `plan` already written, looks the price up by lookup key, opens a subscription Checkout (`success_url` `/welcome`, `cancel_url` `/plans`). A paid user gets `/documents` instead of a second subscription. Stripe errors answer 502 and log nothing. The Stripe client refuses anything but a sandbox key.
- **Sign up with a plan** (`/sign-up?plan=yearly|monthly`): the line reads "Next, you'll pay for Yearly ($80) with Stripe."; after the account is made it goes straight to Checkout. If Checkout can't open, it lands on `/plans` with the error toast. Signed in already, `/sign-up?plan=…` goes to `/plans`.
- **Activation page `/welcome`**: watches the user's `customers/{uid}`; when `plan` turns `paid` it names the plan from the paid subscription's interval and goes to Documents 1.6s later. After 20s: "Still waiting on Stripe" + Go to documents. The button's space is kept from the start so nothing moves.
- Built from approved pieces: badge chip, Aa loader, toast (error tone), price line + feature item, pricing block, activation + success state.
- e2e runs with a placeholder Stripe key (Playwright `webServer.env`), so tests never reach a real Stripe account; `pnpm test:e2e` now starts the Firestore emulator too.
