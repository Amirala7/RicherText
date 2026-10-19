# 0001 — Language and framework: TypeScript, React, Next.js

- Status: accepted
- Date: 2026-10-19

## Context
One codebase has to serve two very different surfaces: a public marketing site that must be indexable and fast, and an authenticated, interactive editor.

## Options considered
- **Next.js (React, TypeScript)**: per-route rendering choice, large ecosystem, first-class support on Firebase App Hosting.
- **Separate static site + SPA**: the cleanest possible marketing HTML, but two builds, two deploys, and shared styles/auth to keep in sync.

## Decision
TypeScript everywhere, React for UI, Next.js (App Router) as the application framework.

## Consequences
- **Landing page lives in the same Next.js app.** Marketing routes are statically pre-rendered Server Components with no client components unless something is unavoidable, so the full HTML is in the initial response for SEO.
  - Trade-off accepted: the Next.js runtime JS (~80–100 kB) still loads on marketing pages. The alternative, a separate zero-JS static site such as Astro, would mean a second build and deploy plus duplicated styles, for a gain search engines don't need.
  - Marketing routes and app routes are kept apart with route groups (e.g. `(marketing)` / `(app)`), so editor code never ends up in landing-page bundles.
- Editor routes can be server-rendered and gated by auth/subscription on the server.
- Editor engine must be React-friendly (Tiptap / Lexical, to be decided).
