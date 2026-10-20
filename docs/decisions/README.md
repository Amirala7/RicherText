# Decision Records

One file per significant decision (stack, architecture, product scope, pricing).
Name files `NNNN-short-title.md` (e.g. `0001-frontend-framework.md`). Never edit an accepted record's decision; supersede it with a new one.

## Template

```markdown
# NNNN — Title

- Status: proposed | accepted | superseded by NNNN
- Date: YYYY-MM-DD

## Context
What forces are at play; what problem are we deciding on.

## Options considered
- **Option A** — pros / cons
- **Option B** — pros / cons

## Decision
What we chose, in one or two sentences.

## Consequences
What becomes easier, what becomes harder, what we must now do.
```

## Index

| # | Title | Status |
|---|---|---|
| 0001 | [Language and framework: TypeScript, React, Next.js](0001-language-and-framework.md) | accepted |
| 0002 | [Hosting and backend: Firebase](0002-hosting-and-backend-firebase.md) | accepted |
| 0003 | [Payments: Stripe (sandbox), hand-written webhook](0003-payments-stripe.md) | accepted |
| 0004 | [Database: Firestore (NoSQL)](0004-database-firestore.md) | accepted |
| 0005 | [Authentication: Firebase Auth, email + password](0005-auth-firebase-email-password.md) | accepted (email verification superseded by 0017) |
| 0006 | [Editor engine: Tiptap](0006-editor-engine-tiptap.md) | accepted |
| 0007 | [Styling and UI: shadcn/ui, minimal typographic design, light + dark](0007-styling-shadcn.md) | accepted |
| 0008 | [Tooling: package manager, quality, forms, tests, repo layout](0008-tooling.md) | accepted |
| 0009 | [Secrets: none in the repo, `.env.example` only, values in GCP](0009-secrets-management.md) | accepted |
| 0010 | [Typography and accent colour: Geist only, violet](0010-typography-and-accent.md) | accepted |
| 0011 | [Design tokens](0011-design-tokens.md) | accepted |
| 0012 | [Logotype and loading indicators](0012-logotype-and-loaders.md) | accepted |
| 0013 | [Atoms and layout rules](0013-atoms-and-layout-rules.md) | accepted |
| 0014 | [Test-driven development; tests locked once written](0014-test-driven-development.md) | accepted |
| 0015 | [Molecules, and layout rule 4 (text fits, equal side padding)](0015-molecules.md) | accepted |
| 0016 | [Organisms](0016-organisms.md) | accepted |
| 0017 | [No email verification in v1](0017-no-email-verification-v1.md) | accepted |
| 0018 | [Local first: build on the emulators, deploy only when finalised](0018-local-first-development.md) | accepted |
| 0019 | [Free plan: plain text, one document](0019-free-plan.md) | accepted (details open) |
