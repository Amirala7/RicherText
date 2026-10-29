# 0036 — Spell checker: in the browser, spelling only, paid plans

- Status: accepted
- Date: 2026-10-29

## Context
Professionals expect misspellings to be marked as they write. The browser already marks them in the editor (its built-in spellcheck is on, since the editor never turns it off), but how well that works depends on the browser and OS. Grammarly has no public API (its Text Editor SDK closed on 2024-01-10). Hosted APIs (LanguageTool, Sapling) cost money per use and would send private documents to a third party. Plan: `docs/plans/spell-checker.md`.

## Decision
- **Our own checker, running in the browser** in a Web Worker. No document text leaves the device and there is no cost per user.
- **Spelling only**, no grammar. **English only** in v1.
- **Paid plans only.** On Free the editor keeps the browser's built-in spellcheck. On paid plans ours replaces it (`spellcheck="false"` while it's on), so words never get two underlines.
- Misspellings are ProseMirror **decorations**, not marks. The schema, saved documents and autosave don't change. The extension is in `editorExtensions` only.
- The plugin has its own idle timer (about 400 ms) and checks only the paragraphs that changed. It doesn't reuse `createAutosave`, which is built for saving.
- Suggestions popup: suggestions + **Ignore** (for the current session only). The personal dictionary ("Add to dictionary") is a next step (CONTEXT §12).
- Engine: **nspell + Hunspell English dictionary** (spelling only, about 200 KB gzipped, loaded lazily), to be confirmed by a short spike measuring size and speed.
- **Testing:** unit tests written first (ADR 0014). **No end-to-end tests** for this feature; the user tests it by hand from the checklist in the plan (user, 2026-10-29). This is an exception to the Definition of Done for this feature only.
- **Shortcut: ⌘; (Ctrl+; on Windows/Linux)** opens the suggestions at the cursor, or at the next misspelling (user, 2026-10-29; ⌘⇧Tab was asked first, but macOS keeps it for the app switcher). In Chrome and Safari on macOS, ⌘; is also the browser's own "Check Document Now". That doesn't clash in practice: on paid plans the editor handles the key first (`preventDefault`) and the browser's spellcheck is off, and on Free we don't handle it, so the browser's command works as before. To check by hand in each browser.
- **US English** dictionary (user, 2026-10-29).

## Options considered
- **Browser built-in only**: free and already there, but it's a different experience in each browser and OS, and it's no reason to pay.
- **Hosted API** (LanguageTool, Sapling): grammar and many languages, but a cost per use, a network delay, no offline use, and document text goes to a third party.
- **Self-hosted LanguageTool** on Cloud Run: a monthly server bill even with no users, and text goes to our server.
- **Harper** (WASM, spelling + grammar): only worth its larger download if we want grammar, which we don't.
- **In-browser nspell** (chosen).

## Consequences
- Design approved (2026-10-29), no new tokens: a wavy `danger` underline (1.5px, 3px offset) and the menu molecule with up to 5 suggestions, divider, Ignore, and a 12% `danger` tint on the word while its menu is open. Always on for paid plans, no switch in v1. Recorded in `docs/DESIGN.md` §3; added to the Molecules design-system page (2026-10-29) before it's built.
- CONTEXT §5 gains a spell checker (paid).
- If we want grammar or more languages later, swapping the engine (to Harper or Hunspell dictionaries) changes only the worker; the plugin and popup stay.
- Nothing automated stops a future change from sending document text over the network. The user checks the Network tab by hand.
