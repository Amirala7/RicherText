# 0021 — Landing hero and landing-only elements

- Status: accepted
- Date: 2026-10-20

## Context
The hero was designed in its own step (ADR 0016). I wanted a centred layout with a huge logotype, a rich-text toolbar in frosted glass, and a large mechanical keyboard that types the subtext. Three variants were compared.

## Options considered
- **A: the logo formats itself** (animated logotype + glass toolbar): striking, but the selection highlight and overlap read poorly.
- **B: A plus a keyboard**: two independent animations competing.
- **C: typing drives everything** (chosen): static logo; the keyboard types the line, and the glass toolbar reflects the formatting. One story.

## Decision
Variant C, copy 1 ("Rich text, minus the clutter."), with the typed line as the headline. Subscribe is the main button and Start free the second. Approved as new design-system elements, **for the landing page only**:
- glass surface (frosted, refraction in Chromium) and its tokens;
- a very subtle violet radial glow, the only gradient in the system;
- the pill header with `r-full`;
- the hero logotype size `logo-hero` (up to 112px);
- the hero toolbar (H1 H2 · B I U S · link);
- the keyboard (hidden on phone).

New general rule 5: spacing is measured on the ink (text trimmed to cap height and baseline), so equal gaps look equal.

## Consequences
- These exceptions to "flat, no gradients, no illustrations" (ADR 0007) apply only to the landing page; the app stays flat.
- Specs live in `docs/DESIGN.md` (§1, rule 5, §4).
- Refraction is a progressive enhancement; Safari and Firefox get frosted blur. `text-box` trim isn't in Firefox yet; it falls back to normal line boxes.
- The animated logotype from variant A is not used.
