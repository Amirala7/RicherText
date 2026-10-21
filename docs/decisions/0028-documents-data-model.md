# 0028 — Documents: data model, server-side create/delete, editable pointer

- Status: accepted (builds on 0004, 0020)
- Date: 2026-10-21

## Context
ADR 0004 set the shape (list info and content stored separately). ADR 0020 sets the Free limits: one document at a time, and after a paid plan ends only the newest document stays editable. Firestore rules can't count documents, so the limit can't be enforced by rules alone.

## Options considered
- **Counter document checked by rules in a transaction:** keeps everything in the browser, but the rules get fiddly and the counter itself becomes something to protect.
- **Server route for create and delete** (chosen): a Next route checks the plan and the count in an Admin SDK transaction. It also gives us one place to add rate limits and abuse checks later (user, 2026-10-21).

## Decision
- **Paths:** `users/{uid}/documents/{docId}` = `title`, `snippet` (both ≤ 200 chars), `createdAt`, `updatedAt`; `…/content/current` = `doc` (ProseMirror JSON, `type: "doc"`), `updatedAt`. An empty title displays as "Untitled".
- **Create and delete only via the server:** `POST /api/documents` → 201 `{ id }` or 403 `{ error: "limit" }`; `DELETE /api/documents/{id}` → 204 / 404. Same-origin + session cookie, like the billing routes. Rules deny client create/delete.
- **Editable pointer:** `users/{uid}.newestDocId`, kept by the server on every create and delete. "Newest" = most recently **created** (stable; editing doesn't change which document is unlocked; user, 2026-10-21). The `users/{uid}` record is server-only.
- **Edits from the browser** (keeps Firestore's offline queue and retries, principle "never lose a keystroke"): the owner may update `title`/`snippet`/`updatedAt` and `content/current` (`doc`/`updatedAt`) if the plan is paid **or** the document is `newestDocId`. `updatedAt` must be the server time; no other fields.
- **Upgrade prompt:** when a Free user hits the limit, the app sends them to `/plans` (user, 2026-10-21).

## Consequences
- The Stripe webhook needs no change for downgrades: the pointer already names the newest document, and deleting down to one leaves the remaining one as newest.
- Every edit costs two rules lookups (`customers/{uid}`, `users/{uid}`); fine at autosave rates.
- Rate limiting / abuse checks on the create route: planned follow-up (CONTEXT §12), not in v1 yet.

## Built (slice 1, 2026-10-21)
`src/lib/documents/model.ts` (shared limits, id check), `src/lib/documents/core.ts` (`createDocument`, `deleteDocument`), `src/app/api/documents/…` routes, `firestore.rules`. Tests: `model.test.ts`, `tests/emulators/document-rules.test.ts`, `tests/emulators/documents.test.ts` (incl. simultaneous Free creates).
