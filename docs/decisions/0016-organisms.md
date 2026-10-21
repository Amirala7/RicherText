# 0016 — Organisms

- Status: accepted
- Date: 2026-10-20

## Context
The organisms were proposed and reviewed in two rounds on a design canvas (v1 2026-10-19, v3 final 2026-10-20). They are built only from the approved atoms and molecules (ADR 0013, 0015).

## Decision
**Organisms** are final as shown on that page (v3): site header, pricing block, site footer, auth forms (sign up, sign in, reset password), document list (full, empty, loading, delete dialog), editor, account. The hero there is a placeholder; it gets its own design step. Details in `docs/DESIGN.md` §4.

**New in the design system** (approved under rule 0):
- Token `h-bar` 64px: one height for every page bar (site header, app header, editor bar, footer).
- Token `scrim`: the dimmed layer behind a dialog; ink at 40% in light, black at 60% in dark.
- Dialog: scrim, one card (max 400, border, `r-lg`, gap `s-5`, edges `s-6`; phone `s-4` / `s-5`), heading + one line, action group on the right (Cancel, then the main action). Esc and Cancel close it; focus starts on Cancel.

**Choices made in review:**
- Document title is its own field above the text, `xl` 28px; new documents start as "Untitled". Body headings 28 / 21 / 16.
- Pricing: two plans, Yearly (at a discount, shown as a "Save" chip, primary button, first) and Monthly. Prices and discount OPEN (CONTEXT §6).
- Deleting a document asks first in the dialog and is permanent. Soft delete with Undo is a next step (CONTEXT §12).
- No verify-email screen (ADR 0017).
- Editor: one bar on desktop; on phones the toolbar gets its own line. Writing column 68ch, 16px, line height 1.65, `s-4` between blocks.
- Account: Profile, Writing, Subscription; Manage opens the Stripe Customer Portal. Account deletion OPEN.
- Toasts bottom centre, one at a time. Phone site header: logotype, small Start writing, menu with Pricing / Sign in. Auth footers: way out left, main button right, button on top when narrow.

## Consequences
- Screen templates only arrange these organisms; anything missing is proposed first.
- The data model needs no `deletedAt` for v1; delete is a hard delete after confirmation.
- Stripe needs two prices (monthly, yearly) on one product.
