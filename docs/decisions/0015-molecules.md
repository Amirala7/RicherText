# 0015 — Molecules, and layout rule 4

- Status: accepted
- Date: 2026-10-19

## Context
The molecules were proposed and reviewed on a design canvas. In review I found text running out of its box and uneven left/right padding in places, and set a rule against both.

## Decision
**Molecules** are final as shown on that page (v3); all review defaults were accepted. Details in `docs/DESIGN.md` §3.

**New in the design system** (approved under rule 0):
- Input with an icon inside: leading search icon (filter field), trailing show/hide button (password).
- Notice banner: neutral, and a warning tint for billing problems (the `warning` token is now used outside badges).
- Menu spacing: items touch (gap 0), so the menu's edge padding is `s-1` 4px. Added to the gap/padding table.
- Form field gaps are `s-2` 8px (the atoms page had 6px, off the scale).

**Layout rule 4:** text always fits its box, and left and right padding are equal. Too-narrow rows shorten their copy or stack; "…" only where truncation is designed (document titles).

**Atom change:** the toast's padding is now 16px on both sides (it was 16 left / 4 right).

## Consequences
- Organisms are built only from these molecules and the atoms; anything missing is proposed first.
- One list-row pattern (44px row, items in 32px boxes, 12px gaps, 16px edges) serves both the document list and the account page.
- Responsive behaviour is part of each molecule: rows stack or drop words at narrow widths rather than overflow.
