# 0009 — Secrets: none in the repo, `.env.example` only, values in GCP

- Status: accepted
- Date: 2026-10-19

## Context
The app and functions need configuration and secrets (Stripe sandbox keys, webhook signing secret, Firebase config). ADR 0002 already says secrets go in Cloud Secret Manager; this record makes it a hard repo rule and covers local development too.

## Decision
- **No secret values in the repo, ever.** The only env file committed is `.env.example`: every variable the app and functions read, with placeholder values and a one-line comment each.
- **All real values live in GCP**, in Cloud Secret Manager of the Firebase project. It is the single source of truth.
- App Hosting reads them through secret references in `apphosting.yaml`; Cloud Functions through `defineSecret`.
- Local development: real values (where the emulators aren't enough, e.g. Stripe sandbox keys) are pulled from Secret Manager into a gitignored `.env.local` with a small script; they are never typed into tracked files. Until a GCP project exists, the values are typed by hand into `.env.local` instead (ADR 0018).

## Consequences
- `.gitignore` ignores `.env*` except `.env.example`, plus service-account keys (`*-sa.json`, `service-account*.json`).
- Adding a new variable means: add it to `.env.example`, create the secret in Secret Manager, reference it in `apphosting.yaml` / the function. All in the same change.
- Public Firebase web config is not secret, but it still goes through env variables so environments stay swappable (staging, CONTEXT §12).
- Developers need `gcloud` access to the project to run locally with real sandbox keys.
- **OPEN:** whether the deploy script also runs a secret scan (e.g. gitleaks) before deploying.
