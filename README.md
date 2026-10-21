# RicherText

A minimal, fast, web-based rich text editor. Next.js on Firebase (emulators locally), Stripe sandbox for payments.

## Run it locally

Everything runs on your machine on the Firebase emulators; no Firebase account or login is needed.

1. **Install everything** with one script.

   macOS and Linux:

   ```sh
   bash scripts/setup.sh
   ```

   Windows (PowerShell):

   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts\setup.ps1
   ```

   The script lists what's missing (Node 22, pnpm, Java 21, the Stripe CLI, the project's packages, the test browser, `.env.local`) and installs it step by step. System tools come from [Homebrew](https://brew.sh) on macOS, apt, dnf or pacman on Linux (you may be asked for your password), and winget on Windows. Add `--check` (Windows: `-Check`) to only report, installing nothing. Your default `java` is never changed; the project's scripts find Java 21 on their own.

2. **Fill in `.env.local`** (created by the script). Only the Stripe sandbox keys need values, and only for payment flows.

3. **Start the app and the emulators:**

   ```sh
   pnpm dev:all
   ```

   App: http://localhost:3000 · Emulator UI: http://localhost:4000

   Locally no email is sent. A password reset prints its link in this terminal ("To reset the password for …"); replace `NEW_PASSWORD_HERE` at the end of the link with the new password and open it.

## Payments (Stripe sandbox)

With your sandbox secret key in `.env.local`, set up the product, the monthly and yearly prices and the Customer Portal:

```sh
pnpm stripe:setup
```

It only accepts test-mode keys and is safe to run again. One setting stays in the Stripe Dashboard: **Billing → Revenue recovery → Retries**, when all retries fail, choose **Cancel the subscription** (access continues while Stripe retries, ADR 0027).

To take real sandbox payments locally:

1. Put the webhook signing secret in `.env.local` (`STRIPE_WEBHOOK_SECRET`). It comes from `stripe listen --print-secret` and stays the same for your sandbox, so this is needed once.
2. Start (or restart) `pnpm dev:all`. It copies the two Stripe secrets into `functions/.secret.local` (gitignored) for the webhook Function; without keys it skips this and payments stay off.
3. In a second terminal run `pnpm stripe:listen`. It forwards sandbox events to the emulator's webhook and hides the secrets the Stripe CLI prints.
4. Pay with the test card `4242 4242 4242 4242`, any future date and any CVC.

## Tests

| Command               | What it runs                                            |
| --------------------- | ------------------------------------------------------- |
| `pnpm test`           | Unit tests (Vitest)                                     |
| `pnpm test:emulators` | Firestore rules and Functions tests, on the emulators   |
| `pnpm test:e2e`       | End-to-end tests (Playwright, desktop + phone)          |
| `pnpm check`          | Lint, type-check, format check, unit and emulator tests |

## Deploy

Deploys are local only, from a clean `main` (ADR 0018, 0034): project `richer-text-55ffe` (alias `prod`), Firestore and Functions in `europe-west1`, the app on App Hosting in `europe-west4`.

```
pnpm deploy:prod --dry-run          # show the steps
pnpm deploy:prod                    # all checks, then rules, functions, app
pnpm deploy:prod rules app          # all checks, then only these
```

Every check runs first (lint, types, format, unit, emulator, e2e; with `pnpm dev:all` running it reuses those emulators). Secrets live only in Secret Manager: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `FIREBASE_WEB_API_KEY`.
