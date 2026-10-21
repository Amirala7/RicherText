# 0032 — Writing font per document, picked in the editor

- Status: accepted (supersedes the writing-font part of 0031 and the Writing section of 0024)
- Date: 2026-10-21

## Context
ADR 0031 made the writing font a per-user display setting chosen in Account → Writing. Testing the editor, the user looked for it in the editor and said it doesn't make sense in Account (2026-10-21).

## Decision
- **Per document** (user): each document keeps its own font, `font` on `users/{uid}/documents/{id}` (`geist` | `plex-serif`), next to the title and snippet; not in the content, so copy/paste is unaffected and pasted text takes the font of the document it lands in. A document without the field (all existing ones, every new one) opens in Geist. Same two fonts, list closed (ADR 0031).
- **In the editor toolbar** (user): a "Writing font" toggle showing a serif "Ag" (user, 2026-10-21; the system serif, so IBM Plex Serif still only loads for documents that use it), before Text size, opening Geist / IBM Plex Serif as checked items (the same toolbar menu as Size). Disabled on read-only documents like the rest of the toolbar.
- Saved by autosave with the title (one batch, Saving → Saved, offline as usual). The document rules allow `font` in an edit, only an offered value, under the same edit rules (Free: newest document only).
- **Removed:** Account → Writing and `users/{uid}/settings/writing` (rules path closed again; no migration, emulator data only).

## Consequences
- Approved test changes (user, 2026-10-21): Account Writing tests removed, toolbar order gains "Writing font", settings rules tests removed, writing-font e2e rewritten for the editor.
- Built: `WritingFontMenu` in `editor-toolbar.tsx`, `font` in `loadDocument`/`saveDocument` and autosave `Changes`, rules + tests in `document-rules.test.ts` / `document-save.test.ts`, e2e `writing-font.spec.ts`.
- The first "Aa" glyph looked like the Text size icon next to it; replaced by the serif "Ag" (user). Design page v7 (https://claude.ai/artifact/XXtkEkC2j9rV85HyaSHJDE).
