# 0020 — Free plan: full editor, one document

- Status: accepted (supersedes ADR 0019)
- Date: 2026-10-20

## Context
ADR 0019 made the Free plan plain text only, with its details open. On review the user changed it and answered the open questions.

## Decision
- **Free:** sign up with no card, and the app opens. The full editor, formatting included. **One document at a time** (delete it to create another). No export.
- **Paid (monthly or yearly):** unlimited documents. Export (Word, PDF) will be paid only once it is added; it is not in v1.
- **When a paid plan ends:** nothing is deleted. The newest document stays editable; the others become read-only until the user resubscribes or deletes down to one.
- **Landing:** Subscribe is the main button everywhere and Start free is second. Pricing shows three cards: Free, Yearly, Monthly.

## Options considered
- **Plain text on Free** (ADR 0019): a strong reason to upgrade, but it hides what the product is for.
- **Full editor, one document** (chosen): visitors see the real product; the limit is how much they can keep.

## Consequences
- Entitlement is `free` or `paid` (webhook → Firestore, ADR 0003). The only Free limits are the document count and, later, export.
- The one-document limit and the read-only state after a downgrade are enforced in Firestore rules, with rules tests (ADR 0014), not only in the UI.
- No upgrade tooltips on the toolbar. The upgrade prompt appears when a Free user tries to create a second document.
- The pricing organism (ADR 0016) becomes three cards; the design update is part of the landing template.
