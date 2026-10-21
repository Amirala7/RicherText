# 0010 — Typography and accent colour: Geist only, violet

- Status: accepted
- Date: 2026-10-19

## Context
ADR 0007 left the typeface(s) and the accent colour open. The landing page and the editor must share one design language. Options were compared side by side in light and dark in a comparison artifact (https://claude.ai/artifact/7rSzxW5Wq2FGyeXB1ZYW5b).

## Options considered
- **Headings:** Geist only · Instrument Serif + Geist · Newsreader + Geist. Earlier pairings (IBM Plex, Hanken Grotesk, Newsreader as the writing face) were dropped once Geist was chosen as the interface and default writing font.
- **Accent:** Ink blue, Ledger green, Crimson, Violet, Graphite (no colour). All pass WCAG AA in both themes.

## Decision
- **One typeface: Geist** for headings, interface and the default writing font. Hierarchy comes from size, weight and tight tracking on large headings, not from a second face. Loaded with `next/font` (self-hosted, no layout shift).
- **Writing font** is a per-user display setting, default Geist, with IBM Plex Serif as an option (CONTEXT §5). It isn't stored in documents.
- **Accent: violet.** Light `#6440D8` (6.4:1 on white; white text on it 6.4:1). Dark `#B3A1FF` (8.4:1 on `#121214`; text on it `#100B1F`, 8.7:1).

## Consequences
- Only one font family to load for the app and landing page (plus any writing fonts a user picks).
- The accent is used only for primary actions, links, the caret, selection and focus; everything else is neutral (0007).
- The neutral scale (slightly biased toward violet or plain), type scale, spacing, radius and motion are set in the token step, documented in `docs/DESIGN.md`.
- ~~OPEN: further fonts~~ Closed by ADR 0031 (user, 2026-10-21): only Geist and IBM Plex Serif.
