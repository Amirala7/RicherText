# 0030 — Editor and autosave: how slice 3 builds them

- Status: accepted (builds on 0006, 0028, 0029)
- Date: 2026-10-21

## Context
Phase 4 slice 3: the Tiptap editor at `/documents/[id]` with the v1 feature set (CONTEXT §5) and autosave. The user split the editor into slice 3 (core) and slice 4 (link editor with ⌘K, document menu, paste fidelity checks), and asked for a "Saved on device" state for offline edits (2026-10-21).

## Decision
- **Schema** (`src/lib/editor/schema.ts`, one place, ADR 0006): StarterKit 3.32 (MIT) with headings 1–3, code, code block and horizontal rule off, links only `http(s):` and `mailto:`, and **no trailing node** (Select All would format an invisible empty paragraph, and saved documents stay as written). Pasted HTML is cut to the schema; text is kept. The placeholder ("Start writing…") is editor-only.
- **Shortcuts:** Tiptap's defaults (⌘/Ctrl B I U, ⇧S strike, ⌥1–3 headings, ⇧8 / ⇧7 lists, ⇧B quote, Z / ⇧Z). Each toolbar toggle shows its keys in a tooltip and in `aria-keyshortcuts`.
- **Autosave** (`src/lib/editor/autosave.ts`): one save 1 s after typing stops, at least every 5 s while it continues; title, snippet (first 200 characters of text) and content in one Firestore batch from the browser (`saveDocument`). Writes are never held back by an earlier write that waits, so offline edits still reach the device cache. States: Saving until the server confirms → Saved; a write waiting more than 2 s → **Saved on device**; a rejected write → Not saved · Retry (its changes are kept and go out with Retry or the next save). Leaving or hiding the page writes what's waiting.
- **Read-only** is worked out in the browser exactly like the list (paid, or newest by creation; `editableIds`), since `users/{uid}` is server-only; the rules enforce it anyway.
- **Route:** `src/app/(editor)/documents/[id]`, its own layout (session check, no app bar: the editor has its own bar). Unknown ids → 404; a document that doesn't exist (or can't be opened) shows the not-found template.

## Consequences
- A server slower than 2 s to confirm also reads "Saved on device", which is true: the edit is in the device cache.
- Changing the schema later needs a migration plan for saved documents (ADR 0006).
- Built here without being in DESIGN.md as code before: toolbar toggle and tooltip atoms, writing-lines loader (all approved in ADR 0012/0013), Saved indicator and toolbar groups molecules, editor organism.

## Built (slice 3, 2026-10-21)
Tests: `schema.test.ts`, `snippet.test.ts`, `autosave.test.ts`, `saved-indicator.test.tsx`, `editor-toolbar.test.tsx`, `tests/emulators/document-save.test.ts`, `e2e/editor.spec.ts`.

## Amended (2026-10-21)
- **Quiet Saved indicator** (user): out of the bar, floating in the bottom-right corner (24px from the edges, 16px on phones), xs text, Saved at 50% opacity, Saving / Saved on device at 70%, Not saved never faded. The Read-only chip stays in the bar, before the account button.
- **Fix:** Next 16 keeps a page's state when you leave it (React Activity), so the list's New stayed busy after coming back from the editor; it now resets when the list is hidden. The editor page also sets `instant = false` (it reads the session, like its layout).
- **Fix (data safety):** leaving a document and opening it again showed the copy loaded on the first visit (Next keeps the page alive; Tiptap rebuilt the editor from that stale copy), and the next keystroke would have saved over the real text. The page now drops its loaded copy when hidden and loads again on return: from the server when online, from the device cache only when offline, with unsent edits applied either way. Rejected writes are not in the cache; autosave keeps them for Retry.
