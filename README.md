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

Why each choice was made: `docs/decisions/` (ADRs, index in its README). Product scope: `docs/CONTEXT.md`. Design system: `docs/DESIGN.md`. The long version of this README, with trade-offs and next steps: [`docs/presentation/RicherText-project-brief.pdf`](docs/presentation/RicherText-project-brief.pdf). The write-up answering the brief's three questions (how an active subscriber is decided, a delayed webhook, one security decision): [`docs/presentation/RicherText-write-up.pdf`](docs/presentation/RicherText-write-up.pdf).

![RicherText: from the landing page through Stripe Checkout to writing in the editor](docs/media/demo.gif)

## Notes for reviewers

- **Deviation from the checklist: a Free user can write plain text.** The checklist says a non-subscriber can't create or edit documents; the FAQ allows a free tier ("paid users get full document features; non-paying users do not"). The Free plan keeps one document at a time, in plain text only:
  - **Creating:** a second document needs a subscription (New goes to the plans page). When a paid plan ends, every document except the newest becomes read-only. The rules enforce this, not only the UI (ADR 0020, 0028).
  - **Editing:** the formatting toolbar is locked. Each button says "Upgrade to unlock formatting" and goes to the plans page; formatting shortcuts and formatted pastes do nothing (ADR 0035). This lock is in the browser only for now; checking it on the server is a next step.
- **Export isn't built.** It's designed (ADR 0022) and marked "Coming soon" everywhere it's mentioned: the landing page, the paid pricing cards, the FAQ and the document menu.

## Architecture

- **Browser → Firestore** for writing: the editor (Tiptap) saves the whole document about a second after typing stops, straight to Firestore. Its offline cache in IndexedDB queues writes through dropped connections and reloads (ADR 0029, 0030). Security rules decide ownership, the Free limit and read-only documents.
- **Browser → Next.js server → Firestore** for anything that mustn't be forged: creating and deleting documents (the Free limit is checked in a transaction), Checkout and Portal sessions (ADR 0027, 0028).
- **Session gating:** the client signs in with Firebase Auth and swaps its ID token for an httpOnly session cookie. Every app layout, action and route checks that cookie on the server, and active writers get it refreshed silently (ADR 0026).
- **Stripe → webhook → Firestore → app:** a Cloud Function checks the signature, stores the event ID in the same transaction (so each event counts once) and re-reads the subscription from Stripe (so order doesn't matter). It writes `customers/{uid}`, the only thing that decides access. The app listens and unlocks live (ADR 0027).
- **Landing page:** statically rendered Server Components, complete HTML without JavaScript.

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
3. In a second terminal run `pnpm stripe:listen`. It runs `stripe listen`, forwarding the four events the webhook handles (`checkout.session.completed`, `customer.subscription.created`, `.updated`, `.deleted`) to the Functions emulator at `http://127.0.0.1:5001/demo-richertext/europe-west1/stripeWebhook`, and hides the secrets the Stripe CLI prints.
4. Pay with the test card `4242 4242 4242 4242`, any future date and any CVC.

### Stripe test flow

Locally (above) or on the live demo. Every payment is in the Stripe sandbox.

1. **Free:** Start free on the landing page, sign up. You land on Documents on the Free plan; write a document in plain text. The toolbar is locked: hover a button for the upgrade tooltip, click it to reach the plans page.
2. **Gate:** press New. With one document on Free it goes to the plans page instead of creating a second.
3. **Subscribe:** pick Monthly or Yearly → Stripe Checkout → `4242 4242 4242 4242`. The activation page waits for the webhook, names the plan and goes to Documents; New now creates as many documents as you like. Locally, completing Checkout is what triggers the webhook: the `pnpm stripe:listen` terminal shows each event forwarded with a `[200]`, and the Emulator UI (http://localhost:4000 → Firestore) shows `customers/{uid}` with `plan: "paid"`.
4. **Declined card:** `4000 0000 0000 0002` is refused in Checkout and nothing changes in the app.
5. **Manage:** Account → Manage opens the Customer Portal: change card, switch monthly ↔ yearly, cancel. Back in the app the account page updates live ("Ends 21 Nov" after a cancel).
6. **Downgrade:** when a cancelled plan ends, the newest document stays editable and the rest open read-only with a Resubscribe notice. Nothing is deleted. The end of a period and failed payments (`past_due`, which keeps access while Stripe retries) aren't practical to trigger by hand, so the emulator tests cover them.

## Tests

| Command               | What it runs                                            |
| --------------------- | ------------------------------------------------------- |
| `pnpm test`           | Unit tests (Vitest)                                     |
| `pnpm test:emulators` | Firestore rules and Functions tests, on the emulators   |
| `pnpm test:e2e`       | End-to-end tests (Playwright, desktop + phone)          |
| `pnpm check`          | Lint, type-check, format check, unit and emulator tests |

`test:emulators` and `test:e2e` start their own emulators, so stop `pnpm dev:all` first (the deploy script instead reuses running ones).

## Trade-offs

| Chose                               | Over                        | Because                                                                                                                                         |
| ----------------------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| The browser writes to Firestore     | Saving through our own API  | Offline queue and retries for free; never lose a keystroke. Cost: some business rules live in security rules, so they have their own test suite |
| The whole document on every save    | Sending only the edits      | Simple and robust for memos of 10–40 KB; edit-step syncing is collaboration machinery we don't need                                             |
| A Free plan                         | A time-limited trial        | People write (plain text) before they pay, with no trial expiry to build. Cost: the checklist deviation above                                   |
| Plan changes in Stripe's Portal     | Our own billing screens     | Less code and fewer states; the UI customers already know                                                                                       |
| One Firebase project, local deploys | Staging plus CI/CD          | Less to run and secure for a demo. Cost: rules and webhook changes can't be rehearsed in the cloud; the emulators and the deploy checks do that |
| Local first on the emulators        | A real project from day one | No cloud cost or secrets until the end, fast repeatable tests. Cost: production-only issues (regions, IAM) showed up at deploy time             |

### With another day

1. **Export**, PDF and Word first, in a Cloud Function with the plan check (ADR 0022).
2. **Email verification** at sign-up and before checkout (ADR 0017).
3. **Error logging** that is safe: the error class and a request ID, never the message (today API routes log nothing, ADR 0026).
4. **A full Content-Security-Policy** with nonces for Next's inline scripts.
5. **Staging**: a second project with its own Stripe sandbox.
6. **Performance and accessibility pass**: measure "interactive in under a second" on the live site; keyboard, screen-reader and contrast audit.

## Known limitations

- Export isn't built; it's marked "Coming soon".
- No email verification: a mistyped address can't recover the account (ADR 0017).
- No rate limits or abuse checks on document creation; the create route is where they'd go (ADR 0028).
- No Content-Security-Policy beyond `frame-ancestors 'none'`; other security headers (HSTS, nosniff, referrer policy) are set.
- API routes log nothing on errors, so a 503 leaves no server-side trace. That's deliberate (logs never carry personal data, ADR 0026), but harder to operate.
- One Firebase project, no staging; deploys run from one machine with a local script.
- If the activation page's Firestore listen fails, it shows the "Stripe is slow" state only after its 20 s timeout.
- Paste is tested against recorded samples from Docs, Word, Outlook and Gmail, not the live apps.
- The landing page reviews are placeholders (and say so).
- `next build` fetches Geist and IBM Plex Serif from Google Fonts, so builds need network.
- A few end-to-end tests are occasionally flaky under full parallel load (sign-up timing, ⌘K links); they pass when run alone.

## How it was built

I built it with Claude Code as the coding agent.

- **I decided, the agent implemented.** Each choice was discussed first and written down as an ADR (`docs/decisions/`) with the options weighed. Scope, plans and pricing, the Free plan, payment behaviour, regions and the design are mine.
- **Tests first, and locked.** Every change started with a failing test; the agent couldn't change an existing test without my explicit yes, so the tests hold the business rules in place (ADR 0014).
- **Design reviewed on canvases** before any screen was built: tokens, atoms, molecules, organisms, the landing page and the app screens, each approved into `docs/DESIGN.md`.
- **Where I pushed back:** the agent's first designs and some decisions changed on review. ADRs 0019 → 0020 → 0035 (Free plan), 0022 (export), 0031 → 0032 (writing font) and 0033 (a nesting bug found in an audit) show it.

## Production

One Firebase project (alias `prod` in `.firebaserc`), all in the EU (ADR 0034):

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
6. **Stripe webhook:** in the Stripe sandbox, add an endpoint for `https://europe-west1-<project-id>.cloudfunctions.net/stripeWebhook` with the events `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`.
7. **Secrets** (each command prompts for the value):

   ```sh
   firebase functions:secrets:set STRIPE_SECRET_KEY --project prod      # sandbox sk_test_…
   firebase functions:secrets:set STRIPE_WEBHOOK_SECRET --project prod  # the endpoint's signing secret
   gcloud secrets create FIREBASE_WEB_API_KEY --data-file=- --project <project-id>
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
