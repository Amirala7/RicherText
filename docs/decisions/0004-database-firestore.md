# 0004 — Database: Firestore (NoSQL)

- Status: accepted
- Date: 2026-10-19

## Context
The data model is small and scoped to each user:
- **Users**: one record each.
- **Subscriptions**: written only by the Stripe webhook function, read by the app.
- **Documents**: each owned by one user, stored as editor JSON, with frequent autosave writes.

Nothing is shared between users and there are no joins. Search is out of scope (CONTEXT §5), and vendor lock-in is accepted because we're already on Firebase (0002).

## Options considered

| | **Firestore** (NoSQL) | **Postgres** (Firebase Data Connect / Cloud SQL) |
|---|---|---|
| Fit for the data | Natural: a user owns documents, editor JSON stored as-is | Fine: content goes in a JSON column, but relations add little |
| Access control | Security rules tied to Firebase Auth; clients read and write directly, no API layer | Needs an API layer or Data Connect auth rules |
| Data safety ("never lose a keystroke") | Client SDK caches offline, queues writes and retries them; live updates across tabs | Write queue, retry and conflict handling built by us |
| Cost | Pay per read and write, scales to zero; autosave writes must be throttled | Always-on instance, about $10+/month minimum with no users |
| Full-text search | None built in (would need Algolia/Typesense) | Built in |
| Flexible queries / reporting | Limited | Strong |
| Size / write limits | 1 MiB per document; about 1 sustained write per second per document | No limits that matter here |
| Lock-in | High (proprietary) | Low (standard Postgres) |

## Decision
Firestore. Its two main weaknesses, search and lock-in, don't apply to this product. Its strengths (security rules, the offline write queue, scaling to zero) match our principles directly.

## Consequences
- **Store each document's list info separately from its body.** The client SDK always downloads a whole record, so storing them together would make the document list load every document's full text. Planned shape:
  - `users/{uid}`: profile
  - `users/{uid}/documents/{docId}`: title, snippet, createdAt, updatedAt (used for the list)
  - `users/{uid}/documents/{docId}/content/current`: editor JSON (loaded only when the document is opened)
  - `customers/{uid}/subscriptions/{subId}`: written only by the webhook function
- **Throttle autosave**: save after about 1–2 seconds without typing, and when the user leaves the page or hides the tab. This keeps costs and the per-document write rate within limits.
- **Security rules are part of the codebase** and get tested with the Firebase emulator.
- **Schema is enforced in code**: shared TypeScript types plus runtime validation at the boundaries (security rules, function inputs), because Firestore has no schema.
- If search or reporting is ever needed, it gets added alongside Firestore (a search index, or a BigQuery export) rather than migrating the database.
