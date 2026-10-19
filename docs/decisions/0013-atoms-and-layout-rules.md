# 0013 — Atoms and layout rules

- Status: accepted
- Date: 2026-10-19

## Context
The atoms were reviewed on https://claude.ai/artifact/MQ27jvFsTFAymw2m4wWWne. During review the user set rules so the landing page and the editor stay visually coherent as pieces are combined.

## Decision
**Atoms** are final as shown on that page; the review defaults were accepted (secondary outlined, violet toolbar "on" state, document links = app links, labels above fields, badge dots, Lucide at 1.75 stroke, toasts 36px, editor toolbar 44px).

**Rules** (details in `docs/DESIGN.md`):
0. No new element, variant or inline one-off style without the user's confirmation; once confirmed it is added to the design system first, then used.
1. Components never change size when their state changes (loading keeps the label's space; spinner overlays it).
2. Three shared control heights, 32 / 36 / 44; controls are one line and never grow.
3. Never put elements of different heights next to each other.
4. Gaps between children inside one space are all equal.
5. Edge padding is one spacing step larger than the gap inside the same space.

## Consequences
- Every molecule and organism is checked against these rules before it is accepted.
- Building a screen that needs something missing stops and asks; it never improvises a local element.
- Mixed rows need adjusting: e.g. a badge beside buttons becomes an `h-sm` chip; text beside a control is vertically centred in the control's height.
- Spacing choices shrink to one decision per container (its gap); the padding follows from it.
- **OPEN:** document title size in the editor (38 vs 28px).
