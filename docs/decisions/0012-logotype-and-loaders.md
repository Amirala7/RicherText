# 0012 — Logotype and loading indicators

- Status: accepted
- Date: 2026-10-19

## Context
The product needed a logo and a loading indicator that fit the typography-led, one-accent design (0007, 0010, 0011). Explored on a design canvas: https://claude.ai/artifact/6CDbDc7iEf1dJ9915g4A5A.

## Options considered
- **Coloured echo:** the last "t" repeated three times behind itself in yellow, red and blue as a motion trail. Dropped: not as imagined, and it added three colours outside the palette.
- **Plain Geist logotype**, shaped by stretch, spacing, weight, slant and case: nine studies (A–I).
- **Animated logotype** cycling the two words through styles (italic, weight, width, spacing, underline) to show editing capabilities. Dropped in favour of a static mark.
- **Loaders:** letter weight wave, writing lines with a caret, morphing "Aa"; plus three pulsing dots.

## Decision
- **Logotype:** study F, made italic. "Richer" Geist 700 + "Text" Geist 400, no space, stretch 1.08×, tracking −0.045em, slant 10°. Single colour: `fg` of the current theme. Static, no animation.
- **Icon** (app icon, favicon): "RT", the logotype's initials: R Geist 700 + T Geist 400, slant 10°, stretch 1.08×, tracking −0.05em, single colour (`#F3F3F7`) on the dark tile (`#0F0F14`, the darkest neutral), corner radius 40/180. **Optically centred:** shifted 0.04em left, because the slant makes a mathematically centred mark look right-heavy. Rejected: "Aa" bold italic underlined.
- **Loaders:**
  - App loading (first load, page changes): "Aa" morphing light → bold → italic (2.4s, alternating) with three dots pulsing under it in turn; 64px.
  - Small spaces (panels, lists, account): the same at 28px.
  - Opening a document: writing lines, three neutral lines drawn in turn with a violet caret, then fade and restart (2.6s).
  - Buttons keep the ring spinner (fixed width, DESIGN.md §2).
  - Reduced motion: static "Aa", gently fading dots, static lines.

## Consequences
- The logo needs no extra colours or assets beyond Geist; it inherits light/dark from the theme.
- Stretch and slant are done by transforming Geist (it has no width axis, and the Google Fonts build has no true italic). Exported as **outlined SVG** plus PNG/ICO sizes in `docs/brand/` (with the script that regenerates them), so they never depend on the font loading.
- Font-weight animation makes "Aa" slightly change width; loaders are centred in a fixed box so layout never moves.
