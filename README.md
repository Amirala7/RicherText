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

## Tests

| Command               | What it runs                                            |
| --------------------- | ------------------------------------------------------- |
| `pnpm test`           | Unit tests (Vitest)                                     |
| `pnpm test:emulators` | Firestore rules and Functions tests, on the emulators   |
| `pnpm test:e2e`       | End-to-end tests (Playwright, desktop + phone)          |
| `pnpm check`          | Lint, type-check, format check, unit and emulator tests |
