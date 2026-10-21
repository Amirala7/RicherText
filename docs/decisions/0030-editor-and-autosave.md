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

## Slice 4 decisions (user, 2026-10-21)
- **Order:** link editor → document menu → Read-only chip on list rows → paste fidelity checks, one branch each.
- **Document menu:** shows the Export items now, disabled, so the final shape is visible; they turn on when export is built (ADR 0022).
- **Link addresses:** only http(s) and mailto, like the schema. An address without a scheme gets `https://` (`example.com`), an email address gets `mailto:`; anything else marks the input invalid (red border, error read by screen readers, nothing changes size) and the panel stays open. `src/lib/editor/link.ts`.
- **⌘K / link button:** with a selection, links it; in a link, edits the whole link (Remove link shown); with nothing selected, inserts the address as typed as linked text, and what's typed next isn't part of it. Enter applies, Esc closes, focus returns to the text. Read-only documents can't open it.
- **On-screen selection:** the link editor reads the selection from the page when it opens, because the editor learns about a keyboard selection change a moment later; a quick ⌘K after Shift+arrows linked the previous selection (seen in the e2e phone run, emulated Android).

## Built (slice 4, link editor, 2026-10-21)
Link editor molecule (`link-editor.tsx`, Radix Popover under the selection), Link toggle at the end of the toolbar (⌘K), wiring in the editor organism. Tests: `link.test.ts`, `link-editor.test.tsx`, `editor-toolbar.test.tsx` (new tests, plus the approved change: Link added to the expected toggles), three new tests in `e2e/editor.spec.ts`.
