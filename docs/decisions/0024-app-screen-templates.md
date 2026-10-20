# 0024 — App screen templates

- Status: accepted
- Date: 2026-10-20

## Context
The last Phase 0 step: arrange the final organisms (ADR 0016) into every app screen, with the Free plan (ADR 0020) and export (ADR 0022) worked in. Designed in two rounds (https://claude.ai/artifact/PbSqEU9tYHQNB3vE1XDbVG).

## Options considered
- **Where a new account lands:** the editor on a new "Untitled" document vs **the documents page** (chosen by the user).
- **Export on Free:** items open the upgrade dialog, hidden, or **shown locked** (chosen).
- **Back from Checkout:** editor + toast vs **an activation page that waits for the webhook** (chosen).
- **Pricing for signed-in users:** a separate marketing pricing page vs **the landing pricing section reused in the app** (chosen; no separate marketing pricing page).

## Decision
Screens: sign up, sign in, reset link sent, documents (paid / Free / plan ended / empty), editor (paid / Free / read-only), new document, back from Checkout, pricing, account, not found; desktop + phone, light + dark.
- **Auth pages:** logotype bar (links home), the card centred, the site footer. The sign-up line says what comes next. Password reset ends on "Reset link sent" (not verification, ADR 0017).
- **New accounts** land on the documents page. Subscribe → sign up → Stripe Checkout → back-from-Checkout page → documents.
- **Back from Checkout:** the Aa loader waits for Stripe's webhook; on arrival it crossfades into a violet check circle (tick draws) and the text changes, then redirects to Documents after 1.6s. After 20s: "Still waiting on Stripe" + Go to documents.
- **Pricing in app:** the landing pricing section exactly; for Free users the Free card's button is "Current plan", disabled. Reached from See plans, Upgrade and Resubscribe.
- **Free plan:** New document with one document already opens the upgrade dialog (Not now · See plans). Export items stay in the document menu, disabled with a lock ("Export · paid plans").
- **Plan ended:** neutral notice with Resubscribe on the list and on each read-only document; Read-only chip on rows and in the editor bar (in Saved's place); toolbar disabled.

New elements approved by the user: document menu, upgrade dialog (dialog with a primary action), disabled menu item, activation page + loader success state, read-only state, empty-document placeholders ("Untitled", "Start writing…"), account menu contents (email, Documents, Account, Theme, Sign out), not-found page.

## Consequences
- Phase 0 is complete; next is Phase 1 (scaffold).
- The export lock and the document limit are also enforced on the server (Cloud Function, Firestore rules); the UI only mirrors them.
- The activation page needs the client to watch the user's entitlement in Firestore and react when the webhook writes it.
- Specs live in `docs/DESIGN.md` §5.
