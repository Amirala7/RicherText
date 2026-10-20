# 0008 — Tooling: package manager, quality, forms, tests, repo layout

- Status: accepted
- Date: 2026-10-19

## Decision

| Area | Choice | Why |
|---|---|---|
| Package manager | pnpm | Fast, strict dependency resolution |
| Lint + format | ESLint (Next config) + Prettier | Standard with Next.js and shadcn |
| Forms + validation | react-hook-form + Zod | shadcn forms are built on them; Zod also validates webhook payloads and Firestore data at the boundaries (0004) |
| Unit tests | Vitest | Fast, TypeScript-native |
| Security rules tests | Firebase Emulator + `@firebase/rules-unit-testing` | Access control lives in rules, so it has to be tested |
| End-to-end tests | Playwright | Covers sign-up → pay → write |
| Repo layout | Single repo: Next app at root, `functions/` for Cloud Functions, shared types and schemas in `src/shared` | Simple; no monorepo tooling needed |

## Consequences
- The deploy script (0002) runs lint, type-check and tests before deploying.
- Zod schemas in `src/shared` are the single definition of data shapes, used by the app, the functions and the tests.
- TypeScript runs in `strict` mode.
