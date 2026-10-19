# 0011 — Design tokens

- Status: accepted
- Date: 2026-10-19

## Context
With Geist and violet fixed (0010), the shared tokens for the landing page and the editor needed choosing. Options were previewed on landing, sign-in, document list and editor screens in light and dark (https://claude.ai/artifact/88o4gNB5VAr19g45dVr7vL).

## Options considered
- **Neutrals:** plain grey · violet tint
- **Surfaces:** flat · layered
- **Type scale:** 1.200 · 1.250 · 1.333
- **Spacing:** tight · comfortable · airy
- **Radius:** sharp · soft · round
- **Motion:** instant · subtle · fluid

## Decision
Violet-tinted neutrals, flat surfaces, **Expressive 1.333** type scale (display 84px), comfortable spacing (4–48px, 7 steps), soft radius (5 / 7 / 10px), subtle motion (120 / 200ms, ease-out). Exact values live in `docs/DESIGN.md`.

## Consequences
- The tokens map onto shadcn/Tailwind theme variables; brand violet is shadcn `primary` (shadcn's `accent` is a neutral hover surface).
- The expressive scale makes the landing page typography-led, but the large steps need fluid sizing on phones, and the document H1 size in the editor is **OPEN** (`2xl` 38px vs `xl` 28px).
- Flat surfaces mean borders do all the separation; shadows only on floating layers.
