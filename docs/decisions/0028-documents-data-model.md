# 0028 — Documents: data model, server-side create/delete, editable pointer

- Status: accepted (builds on 0004, 0020); content format amended by 0033 (JSON string)
- Date: 2026-10-21

## Context
ADR 0004 set the shape (list info and content stored separately). ADR 0020 sets the Free limits: one document at a time, and after a paid plan ends only the newest document stays editable. Firestore rules can't count documents, so the limit can't be enforced by rules alone.

## Options considered
- **Counter document checked by rules in a transaction:** keeps everything in the browser, but the rules get fiddly and the counter itself becomes something to protect.
- **Server route for create and delete** (chosen): a Next route checks the plan and the count in an Admin SDK transaction. It also gives us one place to add rate limits and abuse checks later (user, 2026-10-21).

## Decision
- **Paths:** `users/{uid}/documents/{docId}` = `title`, `snippet` (both ≤ 200 chars), `createdAt`, `updatedAt`; `…/content/current` = `doc` (ProseMirror JSON, `type: "doc"`), `updatedAt`. An empty title displays as "Untitled".
- **Create and delete only via the server:** `POST /api/documents` → 201 `{ id }` or 403 `{ error: "limit" }`; `DELETE /api/documents/{id}` → 204 / 404. Same-origin + session cookie, like the billing routes. Rules deny client create/delete.
- **Editable pointer and count:** `users/{uid}.newestDocId` and `users/{uid}.documentCount`, kept by the server on every create and delete. The limit check reads the count, not a query: a query inside a transaction made the emulator serialise every user's transactions (8 parallel creates took ~12 s; with the count, 20 take ~30 ms). "Newest" = most recently **created** (stable; editing doesn't change which document is unlocked; user, 2026-10-21). The `users/{uid}` record is server-only.
- **Edits from the browser** (keeps Firestore's offline queue and retries, principle "never lose a keystroke"): the owner may update `title`/`snippet`/`updatedAt` and `content/current` (`doc`/`updatedAt`) if the plan is paid **or** the document is `newestDocId`. `updatedAt` must be the server time; no other fields.
- **Upgrade prompt:** when a Free user hits the limit, New goes straight to `/plans`; the Upgrade dialog in DESIGN.md is not used (user, 2026-10-21).

## Consequences
- The Stripe webhook needs no change for downgrades: the pointer already names the newest document, and deleting down to one leaves the remaining one as newest.
- Every edit costs two rules lookups (`customers/{uid}`, `users/{uid}`); fine at autosave rates.
- Rate limiting / abuse checks on the create route: planned follow-up (CONTEXT §12), not in v1 yet.

## Built (slice 1, 2026-10-21)
`src/lib/documents/model.ts` (shared limits, id check), `src/lib/documents/core.ts` (`createDocument`, `deleteDocument`), `src/app/api/documents/…` routes, `firestore.rules`. Tests: `model.test.ts`, `tests/emulators/document-rules.test.ts`, `tests/emulators/documents.test.ts` (incl. simultaneous Free creates).

## Built (slice 2, 2026-10-21)
Document list at `/documents`: live list from Firestore (newest edit first), filter by title, New (→ the new document, or `/plans` on the Free limit), rename in place (only on editable documents), delete after a dialog, then a toast. New design-system pieces already specified in DESIGN.md: danger button, `scrim` token, filter field, document row, menu molecule (shared with the account menu), dialog organism. The count replaced the in-transaction query (see Decision). Tests: `list.test.ts`, `client.test.ts`, `document-list.test.tsx`, `e2e/documents.spec.ts`.
