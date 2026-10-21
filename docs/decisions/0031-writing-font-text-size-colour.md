# 0031 — Writing font setting, text size and text colour

- Status: accepted (builds on 0006, 0007, 0010)
- Date: 2026-10-21

## Context
The last Phase 4 item was the writing font setting (ADR 0010: Geist by default, IBM Plex Serif offered, the rest of the list OPEN). The user closed the list and asked for a font size and a colour option as well (2026-10-21).

## Decision
- **Writing font** (user): only Geist (default) and IBM Plex Serif; the list is closed. A per-user display setting in `users/{uid}/settings/writing` (`font`: `geist` | `plex-serif`), owner read/write only, nothing else in that document (rules + rules tests). It changes the body text of every document for that user; the title and the interface stay in Geist; documents never store it, so copy/paste is unaffected. Chosen in Account → Writing (approved template, ADR 0024: "Writing font" row, Change opens the fonts as checked items). IBM Plex Serif (400, 600, italics) is not preloaded, so only users who pick it download it.
- **Text size and colour are formatting in the editor** (user, not display settings): saved in the document as marks, so they change the shared schema (ADR 0006). Adding marks needs no migration: saved documents just don't have them.
  - Size: Small 15 · Default 16 · Large 18 (user).
  - Colour: Default plus grey, red, orange, green, blue, violet (user), each with a light and a dark shade readable on the page. This goes beyond "neutral + one accent" (ADR 0007) for document text only; the interface keeps the rule.
  - Toolbar (user): two menu buttons at the end of the toolbar, before Link: Size (menu with the three sizes as checked items) and Colour ("A" with a colour bar; a small grid of swatches with Default).
  - Paste (user): colours and sizes from other apps are dropped, as today; only ones made in RicherText survive copy/paste between documents.

## Consequences
- The font is shown once Firestore has it on the device (its snapshot fires at once, also offline), so a reload right after choosing can't lose it; a choice made while sign-in is still being restored waits for it.
- Size and colour are a separate slice with their own tests; the toolbar pieces go into DESIGN.md and the design-system page before they are used (ADR 0013).
