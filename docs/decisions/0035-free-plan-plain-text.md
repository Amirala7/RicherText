# 0035 — Free plan: plain text, toolbar locked

- Status: accepted (amends 0020)
- Date: 2026-10-22

## Context
The requirements say a non-paying user can't create or edit documents. ADR 0020 gave the Free plan the full editor with one document, which went too far from that. Free users can already create only one document. Now formatting, the "rich" part of the editor, becomes paid as well.

## Decision
- **Free is plain text.** The editor toolbar stays visible but every toggle is locked: it looks disabled, shows the tooltip "Upgrade to unlock formatting", and a click goes to the plans page (`/plans`), the same as New with a document already made.
- The keyboard can't format either: the formatting shortcuts (⌘B, ⌘I, ⌘U, ⌘K, ⌘⇧S/B/7/8, ⌘⌥0–3) do nothing, the markdown shortcuts ("# ", "- ", "> ", `**`) are off, typed addresses aren't linked, and pasted text comes in as plain text. Undo, redo, select, copy, cut and paste work as normal.
- **Paid** gets the full toolbar, as before. Free still keeps one document at a time, and the read-only rule after a downgrade is unchanged (ADR 0020, 0028).
- Formatting already in a document (written on a paid plan) stays and is shown. A Free user can type around it but can't add more.
- The lock follows the plan live (webhook → Firestore). The markdown shortcuts are the exception: Tiptap builds them when the editor opens, so they follow the plan the document was opened with until it is opened again.

## Options considered
- **Keep ADR 0020** (full editor on Free): visitors see the whole product, but the deviation from the requirements is large.
- **No editing at all on Free** (the requirement taken literally): no reason to sign up before paying; the Free plan would show an empty app.
- **Plain text on Free, toolbar locked** (chosen): close to the requirement (no rich editing, one document) and visitors still see the editor and what upgrading unlocks. This is roughly where ADR 0019 started.

## Consequences
- The toolbar toggle atom gets a **locked** state (`aria-disabled`): the disabled look, but it can still be pointed at and pressed, so the tooltip and the click work. Read-only documents stay plainly disabled. Added to `docs/DESIGN.md`; requested by the user (counts as the ADR 0013 approval).
- The editor page waits for the plan before it opens the editor, so the lock is right from the first keystroke.
- The lock is in the client only. Firestore rules can't read inside the content string (ADR 0033), so a modified client could still save formatting. **OPEN:** checking it on the server (a save Cloud Function or a content check), listed in CONTEXT §12.
- Copy changes: pricing (Free "Plain text, no formatting"; paid "Full formatting toolbar"), price note, FAQ, account page, README and the brief.
- E2E tests that format text now set the test user to paid first (approved by the user, 2026-10-22).
