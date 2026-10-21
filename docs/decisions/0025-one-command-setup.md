# 0025 — One-command local setup, no Dev Container

- Status: accepted
- Date: 2026-10-20

## Context
I want to be able to hand the repo to someone and have them run it on their machine easily. Since development is local first on the emulators (ADR 0018), no Firebase account is needed, but the machine still needs Node, pnpm, Java (the emulators run on it) and, for payment flows, the Stripe CLI and sandbox keys. A Dev Container (Codespaces) was offered and declined.

## Decision
- No Dev Container. Instead the repo ships **one setup script** that installs everything needed, clearly, step by step:
  - says what it will install and why before it does it, and what is already present;
  - checks and installs the pinned Node version, pnpm (via corepack), Java (the version the emulators need) and the Stripe CLI;
  - runs `pnpm install` (which brings `firebase-tools` as a dev dependency, so no global Firebase CLI) and installs the Playwright browsers;
  - creates `.env.local` from `.env.example` if it doesn't exist and says which values to fill in (Stripe sandbox keys only);
  - ends with a check that everything is in place and the next command to run.
- **One command to run the app:** `pnpm dev:all` starts the emulators and Next together.
- Node version pinned in the repo (`.nvmrc` + `engines`).
- A short `README.md` with the setup steps (run the script, fill in `.env.local`, `pnpm dev:all`).
- Built in Phase 1 slice 2, together with the emulators.

## Consequences
- Handing over the repo = clone, run the script, add Stripe sandbox keys (only needed for payments).
- The script has to stay in sync with the stack; any new tool goes into it in the same change.
- As built (slice 2): `bash scripts/setup.sh` (`--check` only reports). Plain `pnpm setup` is pnpm's own command, so the README points at the bash command. Java 21 is installed alongside any older default and found by `scripts/java.mjs`, which `scripts/firebase.mjs` (every Firebase command) and both setup scripts use, so the system default `java` is never changed.
- Platforms (2026-10-20: add Linux and Windows): macOS installs with Homebrew; Linux with apt, dnf or pacman (Node through nvm, Stripe CLI into `~/.local/bin`, Chromium's system libraries on apt); Windows with `scripts/setup.ps1` (winget: fnm for Node unless nvm-windows is there, Microsoft OpenJDK 21, Stripe CLI). The Firebase wrapper is Node, not bash, so the pnpm commands run on Windows too.
- Verified: macOS (this machine); Ubuntu 24.04 from scratch in Docker (full install, then emulator tests green); the Windows script's check mode in PowerShell 7 on Linux. **OPEN:** the Windows install path and the dnf/pacman paths have not been run on a real machine.
