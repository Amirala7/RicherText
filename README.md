# RicherText

A minimal, fast, web-based rich text editor. Next.js on Firebase (emulators locally), Stripe sandbox for payments.

## Run it locally

Everything runs on your machine on the Firebase emulators; no Firebase account or login is needed.

1. **Install everything:**

   ```sh
   bash scripts/setup.sh
   ```

   The script lists what's missing (Node 22, pnpm, Java 21, the Stripe CLI, the project's packages, the test browser, `.env.local`) and installs it step by step. On macOS it uses [Homebrew](https://brew.sh); on Linux it prints the command for anything it can't install itself. `bash scripts/setup.sh --check` only reports, installing nothing. (`pnpm run setup` does the same; plain `pnpm setup` is pnpm's own command.)

2. **Fill in `.env.local`** (created by the script). Only the Stripe sandbox keys need values, and only for payment flows.

3. **Start the app and the emulators:**

   ```sh
   pnpm dev:all
   ```

   App: http://localhost:3000 · Emulator UI: http://localhost:4000

## Tests

| Command               | What it runs                                            |
| --------------------- | ------------------------------------------------------- |
| `pnpm test`           | Unit tests (Vitest)                                     |
| `pnpm test:emulators` | Firestore rules and Functions tests, on the emulators   |
| `pnpm test:e2e`       | End-to-end tests (Playwright, desktop + phone)          |
| `pnpm check`          | Lint, type-check, format check, unit and emulator tests |
