# 0019 — Free plan

- Status: superseded by 0020 (changed the "editor locked without a subscription" rule in CONTEXT §4.3/§6 and the entitlement gating in ADR 0003)
- Date: 2026-10-20

## Context
Until now the editor was locked without an active subscription. I want a free tier so people can sign up, see the app and write before paying.

## Options considered
- **No free access** (previous): simplest gating, but visitors must pay before seeing the product.
- **Time-limited trial**: full features for N days; needs expiry handling and reminder emails.
- **Free plan with limits** (chosen): permanent, clear limits, and upgrading means "unlock formatting and more documents".

## Decision
Anyone can sign up and use the app for free, with no card. On the Free plan:
- **Plain text only.** The formatting toolbar and shortcuts are visible but do nothing; using one shows an "upgrade" tooltip.
- **One document.**

A paid plan (monthly or yearly) unlocks everything.

## Open
- One document at a time (delete and recreate allowed) or one ever? Suggested: at a time.
- Pasting formatted text on Free: stripped to plain text? Suggested: yes.
- When a paid plan ends: keep all documents, editable only up to the Free limit (the newest one), the rest read-only? Suggested: yes, never delete.

## Consequences
- Entitlement is no longer just "locked/open": it's `free` or `paid`, still driven by the Stripe webhook → Firestore (ADR 0003).
- The one-document limit must be enforced server-side (Firestore rules + rules tests), not only in the UI. Plain-text-only should be enforced on save too, so a modified client can't store formatting.
- Sign up lands in the app (Free), not at checkout. Checkout starts from Subscribe/Upgrade.
- The pricing organism (ADR 0016, two cards) becomes three cards: Free, Yearly, Monthly. Needs design approval.
- The landing page's main CTA choice (Subscribe vs Start free) is open, see the hero proposal.
