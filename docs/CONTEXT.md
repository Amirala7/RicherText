# RicherText — Project Context

> Status: draft · Last updated: 2026-10-22
> This is the source of truth for *why* the product exists and *what* is in scope.
> Anything marked **OPEN** is undecided; resolve it here or in an ADR (`docs/decisions/`).

## 1. One-liner

A fast, minimal, web-based rich text editor for professionals who want a calm place to write — without the weight of a full docs suite.

## 2. Problem

Professionals who write (consultants, PMs, lawyers, researchers, founders) choose between:

- **Heavy suites** (Google Docs, Word, Notion): slow to open, cluttered, built for collaboration and databases rather than focused writing.
- **Plain-text / Markdown tools**: fast, but asking non-technical people to learn syntax, and producing output that doesn't paste cleanly into email or client documents.

The gap: something that opens instantly, formats the way a word processor does, and gets out of the way.

## 3. Target user

| | |
|---|---|
| **Primary** | Individual professionals who write daily: memos, proposals, notes, drafts |
| **Buys as** | An individual, paying out of pocket or expensing it |
| **Values** | Speed, focus, reliability (never losing text), clean output |
| **Doesn't need** | Real-time collaboration, databases, templates gallery, plugins |

Landing page copy speaks broadly to any professional who needs rich text; no narrower beachhead persona for now (decided 2026-10-20).

## 4. Product slice (what we're building)

A small but *complete* product: someone can discover it, pay, and use it.

### 4.1 Marketing site (public)
- Landing page whose single job is converting a visitor into a paying subscriber.
- Pricing section, checkout entry point; the same section is reused inside the app as the plans page, `/plans` (ADR 0024, 0027); on the public site, pricing is the `#pricing` section of the landing page `/` (no separate `/pricing` page, 2026-10-21).
- Legal basics: terms, privacy, refund policy (needed for payment providers).

### 4.2 Payment
- Subscription checkout via a hosted payment provider (we never touch card data).
- Webhook-driven entitlement: paying unlocks paid features; a cancelled plan runs to the end of its period; a failed payment keeps access while Stripe retries the card and locks once it gives up (ADR 0027).
- Self-serve billing management in Stripe's Customer Portal: update card, switch monthly ↔ yearly, cancel (ADR 0027). Reached from the account page (`/account`), which shows the plan's state (Free, active, ends on a date, payment due) and follows changes live.
- No trials or promotion codes in v1 (ADR 0027).

### 4.3 Authenticated editor (gated)
- Sign up / sign in / sign out (this device), and password reset by email, finished on Firebase's own page (ADR 0026); new accounts land on the documents page. Signing up from a paid plan (`/sign-up?plan=yearly`) goes straight on to Stripe Checkout. After Checkout, the activation page (`/welcome`) waits for Stripe's confirmation, then goes to the documents page (ADR 0024, 0027).
- Anyone signed up can use the app on the Free plan (plain text, one document at a time); a subscription unlocks the formatting toolbar and unlimited documents (ADR 0020, 0035). On Free the toolbar is locked: each toggle says "Upgrade to unlock formatting" and goes to `/plans`; formatting shortcuts and formatted pastes do nothing.
- Document list + editor.
- Minimal formatting (see §5).
- Autosave; text is never lost.

## 5. Editor feature scope

**In (v1):** (formatting is paid; on the Free plan the editor is plain text with the toolbar locked, ADR 0035)
- Headings (H1–H3), paragraphs
- Bold, italic, underline, strikethrough
- Bulleted and numbered lists
- Links
- Blockquote
- Undo / redo
- Keyboard shortcuts for everything above
- Autosave + "saved" indicator
- Writing font is set per document from the editor toolbar, default **Geist**; saved with the document's title, not in its content, so copy/paste is unaffected. Offered: Geist, IBM Plex Serif; nothing else (ADR 0031, 0032). Text size (Small / Default / Large) and text colour (six colours) are formatting in the editor, saved in the document (ADR 0031).
- Copy/paste that preserves formatting to and from email / Docs / Word

**Out (v1) — explicitly not building:**
- Real-time collaboration / sharing / comments
- Images, tables, embeds
- Templates, AI features, plugins
- Native mobile apps (the web app should still be usable on mobile)
- Offline mode
- Search (document titles may be filtered client-side; no full-text search)

**Coming soon:** export to PDF, Word, RTF, Markdown, HTML and plain text, paid plans only, generated in a Cloud Function (ADR 0022). Designed but not built; moved to next steps (§12). The site marks it "Coming soon" wherever it is mentioned.

**OPEN:** Folders or tags? Word count? (Dark mode: decided, ADR 0007.)

## 6. Business model

- Free plan + paid subscription (ADR 0020). Free: sign up, no card; plain text only (toolbar locked, ADR 0035); one document at a time; no export. Paid: the full formatting toolbar, unlimited documents, and export once it ships (ADR 0022). When a paid plan ends, the newest document stays editable and the rest become read-only; nothing is deleted.
- Two intervals: monthly and yearly, the yearly one at a discount (decided 2026-10-20). **OPEN:** price points and the discount (placeholders: $8 a month, $80 a year).
- Free plan instead of a time-limited trial (ADR 0020). **OPEN:** money-back guarantee.
- Plans: Free, Monthly, Yearly (decided 2026-10-20).
- Landing reviews and their Pexels portraits are placeholders for the demo (decided 2026-10-20). Before launch: real reviews with permission, or the section comes out (made-up reviews presented as real break consumer-protection rules; the Pexels licence forbids implied endorsement by identifiable people).

## 7. Product principles

These break ties when decisions are unclear:

1. **Fast beats featureful.** Every feature must justify its cost to load time and UI clutter.
2. **Never lose a keystroke.** Data safety outranks every other editor concern.
3. **Calm by default.** The UI recedes; the text is the interface.
4. **Small but complete.** A narrow product that works end-to-end beats a broad one that half-works.
5. **Boring infrastructure.** Use managed, proven services for auth, payments and hosting; spend our effort on the writing experience.

## 8. Success criteria for this slice

- A stranger can go from landing page → paid → writing in under 2 minutes.
- Editor is interactive in < 1s on a typical connection (target to be refined).
- Payment state and access are always consistent (no paid-but-locked, no unpaid-but-open), with one deliberate exception: access continues while Stripe retries a failed payment (ADR 0027).
- **OPEN:** Conversion and retention targets once we have traffic.

## 9. Constraints & assumptions

- Team: a solo developer working with Claude Code.
- **OPEN:** Timeline / launch target.
- **OPEN:** Budget for hosted services.
- Payments run in a **Stripe sandbox only**; no real charges (ADR 0003).
- No secrets in the repo: only `.env.example`; real values live in GCP Secret Manager (ADR 0009).
- Test-driven development for all code; tests are the source of truth for business logic and are only changed with explicit approval (ADR 0014).
- **OPEN:** Brand / domain name ("RicherText" is the working name).

## 10. Related docs

- `docs/decisions/` — architecture & product decision records (ADRs)
- `docs/DESIGN.md` — design system: tokens, atoms, molecules, organisms, templates
- `docs/brand/` — logotype, icon, favicons (outlined SVG + PNG)

## 11. Future questions

Deliberately parked; not needed for the current slice.

- **Tax handling**: VAT/sales tax, Stripe Tax vs. a merchant-of-record. Relevant only if we go live with real payments.
- **Live payments**: moving from the Stripe sandbox to live mode.
- ~~**Functions region**~~: decided, `europe-west1` for Firestore and Functions (ADR 0034).
- **Search**: full-text search across documents (would need an external index; see ADR 0004).

## 12. Next steps candidates

Planned improvements we expect to pick up after the current slice works end-to-end.

- **Export** (moved out of Phase 4 on 2026-10-21; ADR 0022 still stands): PDF and Word (.docx) first, then RTF, Markdown, HTML, plain text; paid plans only, in a Cloud Function with the entitlement check. Open choices: page size (A4 / Letter / follow the browser), fonts (PDF Geist embedded; Word default font or Geist), library (e.g. pdfmake + docx vs headless Chrome). Until then the document menu shows the export items disabled with a "Coming soon" badge; shipping it means changing the document menu test, which expects them disabled.
- **Paste checks on real apps**: paste from the real Google Docs, Word (Windows + Mac), Outlook, Gmail, and also Word on the web and Apple Pages / Notes (not covered by the samples); copy back out into each (ADR 0030).
- **Free plan's plain text on the server** (ADR 0035): today the toolbar lock is client-side only; Firestore rules can't look inside the content string, so a modified client could save formatting on Free. Options: save through a Cloud Function that checks marks and node types, or strip formatting from Free saves there.
- **Plain-text copy of lists**: plain text copied out has no "- " / "1." on list items; add them if wanted (ADR 0030).
- **Performance, accessibility and light/dark pass** (moved from Phase 6, 2026-10-22): measure the editor against "interactive in < 1 s" (CONTEXT §8) on the live site, an accessibility audit (keyboard, screen reader, contrast), and a light/dark check of every screen.
- **Before launch** (moved from Phase 6, 2026-10-22): real reviews with permission or remove the section, official brand logos (ADR 0023), real legal copy if it stops being a demo.
- **Content-Security-Policy** (2026-10-21): a full CSP beyond today's `frame-ancestors 'none'` (scripts, styles, connections to Firebase and Stripe, nonces for Next's inline scripts). Basic headers are in `next.config.ts`.
- **Unsynced changes at sign out**: warn before signing out while Firestore still has queued writes (offline); today they are dropped with the cache after 5 s (ADR 0029).
- **Automatic GitHub rollouts**: connect the repo to Firebase App Hosting so pushes to `main` deploy automatically, replacing the local deploy script (ADR 0002).
- **Staging environment**: a second Firebase project (and separate Stripe sandbox keys and webhook) so changes to rules, functions, webhooks and the app can be verified before they reach the environment users are on. Today we run a single project (ADR 0002).
- **Email verification**: send Firebase's verification link at sign-up and require it before checkout (dropped from v1, ADR 0017). Why we'd want it: a mistyped email means receipts, billing notices and password-reset emails never arrive and the user can't recover their account; it stops people signing up with addresses they don't own; it makes throwaway or abusive sign-ups harder.
- **Soft delete with Undo**: deleting a document marks it deleted and shows an Undo toast instead of asking first; needs a `deletedAt` field, rules and a clean-up job. For v1, delete asks for confirmation in a dialog and is permanent (decided 2026-10-20).
- **Sign out of all devices**: an account action that revokes every session (Admin `revokeRefreshTokens`; `getCurrentUser()` already checks revocation). v1 signs out this device only (ADR 0026).
- **Rate limits and abuse checks on document creation**: the create route (ADR 0028) is the place for per-user limits and fraud signals (2026-10-21).
- **Test-lock hook**: a real hook that stops changes to existing tests until the developer approves them, showing only a plain-language summary of the change (no code). Needs an approval step the coding agent can't fake, e.g. the developer's own message (ADR 0014).
