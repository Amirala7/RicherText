# 0002 — Hosting and backend: Firebase

- Status: accepted
- Date: 2026-10-19

## Context
We want managed infrastructure (principle 5: boring infrastructure) and a single platform for hosting, backend code and data.

## Decision
- **Hosting:** Firebase App Hosting for the Next.js app.
- **Deploys:** run manually with a local deploy script that wraps the Firebase CLI. No automatic GitHub rollouts and no CI/CD pipeline for now. Automatic rollouts are listed as a next-steps candidate (CONTEXT §12).
- **Backend code:** Cloud Functions for Firebase (2nd gen), starting with the Stripe webhook (0003).
- **Database:** Firestore (0004).

## Consequences
- Requires the Blaze (pay-as-you-go) plan, for both App Hosting and Functions.
- The deploy script should let us deploy the app, functions and Firestore rules/indexes separately, and should run type-check, lint and build first so a broken build can't ship.
- The webhook is deployed separately from the web app, so app deploys can't break billing (and the other way round).
- Secrets (Stripe keys, webhook signing secret) go in Cloud Secret Manager, never in the repo.
- Local development runs against the Firebase Emulator Suite (Auth, Firestore, Functions).
- **One Firebase project** for now. Combined with the Stripe sandbox (0003), nothing in it is customer-critical. A separate staging environment is a next-steps candidate (CONTEXT §12).
