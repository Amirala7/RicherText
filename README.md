# RicherText

A minimal, fast, web-based rich text editor for professionals: a public landing page, Stripe subscriptions and a gated editor that never loses a keystroke.

**Live (demo, Stripe sandbox):** https://richertext--richer-text-55ffe.europe-west4.hosted.app

| Part          | Built with                                                                              |
| ------------- | --------------------------------------------------------------------------------------- |
| App           | TypeScript, React, Next.js (App Router) on Firebase App Hosting                         |
| Editor        | Tiptap (ProseMirror), autosave from the browser with Firestore's offline cache          |
| Data and auth | Firestore with security rules, Firebase Auth (email + password, session cookies)        |
| Payments      | Stripe Checkout + Customer Portal (sandbox only), webhook in a Cloud Function           |
| UI            | shadcn/ui + Tailwind, Geist, light and dark                                             |
| Tests         | Vitest (unit), rules and Functions tests on the emulators, Playwright (desktop + phone) |

Why each choice was made: `docs/decisions/` (ADRs, index in its README). Product scope: `docs/CONTEXT.md`. Design system: `docs/DESIGN.md`.

## Repo layout

| Path              | What lives there                                              |
| ----------------- | ------------------------------------------------------------- |
| `src/app`         | Routes: landing, auth, documents, editor, account, plans, API |
| `src/components`  | Design system: atoms, molecules, organisms                    |
| `src/lib`         | Auth, billing, documents, editor, Firebase setup              |
| `functions/src`   | Cloud Functions: the Stripe webhook                           |
| `firestore.rules` | Who can read and write what                                   |
| `tests`, `e2e`    | Emulator tests (rules, Functions, setup scripts), Playwright  |
| `scripts`         | Setup, Stripe, Firebase and deploy scripts                    |
| `apphosting.yaml` | Production settings for App Hosting (no secret values)        |

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

### Payments locally (Stripe sandbox)

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

`test:emulators` and `test:e2e` start their own emulators, so stop `pnpm dev:all` first (the deploy script instead reuses running ones).

## Production

One Firebase project, `richer-text-55ffe` (alias `prod`), all in the EU (ADR 0034):

| Piece               | Where                                                                                |
| ------------------- | ------------------------------------------------------------------------------------ |
| Firestore           | `europe-west1`                                                                       |
| Cloud Functions     | `europe-west1`: `stripeWebhook`, `health`                                            |
| App Hosting backend | `richertext`, `europe-west4` (App Hosting doesn't offer `europe-west1`)              |
| Secrets             | Secret Manager: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `FIREBASE_WEB_API_KEY` |
| Payments            | Stripe sandbox only; no real charges (ADR 0003)                                      |

### One-time setup

Done once per project; listed so it can be repeated. Never paste secret values into chat, issues or commits; the commands below read them from a prompt, a file or stdin.

1. **Project:** create it in the Firebase console and switch it to the **Blaze** plan (Functions and App Hosting need it). Put a **budget alert** on it (Cloud console → Billing → Budgets & alerts; €5 a month for this demo).
2. **Auth:** Firebase console → Authentication → Sign-in method → enable **Email/Password**.
3. **Firestore** (the location can never be changed):

   ```sh
   firebase firestore:databases:create "(default)" --location=europe-west1 --project prod
   ```

4. **Web app and App Hosting backend** (no GitHub connection; deploys come from the script below):

   ```sh
   firebase apps:create web RicherText --project prod
   firebase apphosting:backends:create --backend richertext --primary-region europe-west4 \
     --app <web app id> --root-dir . --non-interactive --project prod
   ```

5. **Authorized domain:** Authentication → Settings → Authorized domains → add the backend's `*.hosted.app` address.
6. **Stripe webhook:** in the Stripe sandbox, add an endpoint for `https://europe-west1-richer-text-55ffe.cloudfunctions.net/stripeWebhook` with the events `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`.
7. **Secrets** (each command prompts for the value):

   ```sh
   firebase functions:secrets:set STRIPE_SECRET_KEY --project prod      # sandbox sk_test_…
   firebase functions:secrets:set STRIPE_WEBHOOK_SECRET --project prod  # the endpoint's signing secret
   gcloud secrets create FIREBASE_WEB_API_KEY --data-file=- --project richer-text-55ffe
   #   ↑ paste the apiKey from `firebase apps:sdkconfig web <web app id> --project prod`, then Ctrl+D
   #     (functions:secrets:set refuses names starting with FIREBASE_)
   firebase apphosting:secrets:grantaccess STRIPE_SECRET_KEY,FIREBASE_WEB_API_KEY \
     --backend richertext --location europe-west4 --project prod
   ```

8. **Stripe products and Portal** in the sandbox: `pnpm stripe:setup` (same sandbox as local), plus the Dashboard retry setting above.
9. **Function image clean-up** (keeps storage costs down):

   ```sh
   firebase functions:artifacts:setpolicy --location europe-west1 --days 1 --force --project prod
   ```

### Deploy

Deploys are local only, from a clean `main` (ADR 0018, 0034); there are no automatic rollouts.

```sh
pnpm deploy:prod --dry-run          # show the steps
pnpm deploy:prod                    # all checks, then rules, functions, app
pnpm deploy:prod rules app          # all checks, then only these
```

Every check runs first (lint, types, format, unit, emulator, e2e); with `pnpm dev:all` running it reuses those emulators. Then rules deploy before functions and the app, so the rules already allow what new code writes. A production build refuses to start without the real Firebase config, and a deployed server refuses a `demo-` project.
