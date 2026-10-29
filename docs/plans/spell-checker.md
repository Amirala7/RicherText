# Spell checker: implementation plan

**Status: final (2026-10-29); slices 0–2 done; next: slice 3 (worker).** Decision: ADR 0036. Design: approved, see `docs/presentation/spell-check-proposal.html` and `docs/DESIGN.md` §3.

A spelling checker for paid plans that runs entirely in the browser, in a Web Worker, so no document text leaves the device and there is no cost per user. Misspellings are ProseMirror decorations, not marks, so the schema, saved documents and autosave don't change.

## Scope (all decided by the user, 2026-10-29)

| | Decision |
|---|---|
| What it checks | Spelling only, no grammar |
| Language | English, US dictionary |
| Plans | Paid only. Free keeps the browser's built-in spellcheck; on paid plans ours replaces it (`spellcheck="false"`) |
| Engine | nspell + `dictionary-en` (en_US), loaded lazily; confirmed by the spike |
| On/off | Always on for paid plans in v1; no switch |
| Shortcut | ⌘; / Ctrl+; opens suggestions at the cursor, or at the next misspelling |
| Underline | Wavy, `danger` colour, 1.5px, 3px offset; no new tokens |
| Suggestions menu | Existing menu molecule, 180 wide: up to **5** suggestions, divider, Ignore; "No suggestions" label when empty; the word gets a 12% `danger` tint while its menu is open |
| Ignore | For this session only (in memory) |
| Personal dictionary | Next step (CONTEXT §12) |
| Tests | Unit tests written first (ADR 0014); no end-to-end tests: the user tests by hand |

## Why not reuse the autosave debounce

We reuse its pattern (an idle `setTimeout` that resets on each change), not the module. `createAutosave` (`src/lib/editor/autosave.ts`) is built for saving: it merges `Changes`, has a 5 s max wait, tracks save states, retries, and saves when you leave the editor. Spell checking needs to check only the paragraphs that changed, wait about 400 ms with no max wait, move underlines as text shifts (`tr.mapping`), and drop out-of-date results. Its trigger (Tiptap `onUpdate`) only gives the full JSON, while a ProseMirror plugin sees exactly which ranges changed. Refactoring `autosave.ts` would also touch locked tests. Autosave stays exactly as it is, since decorations never show up in `getJSON()`.

## Slices (TDD, each on its own branch, merged when green)

### 0. Design system: `docs/…` branch
- ✅ ADR 0036, ADR index, CONTEXT §5, decision log.
- ✅ Design approved; underline and suggestions menu recorded in `docs/DESIGN.md` §3.
- ✅ Added both to the Molecules design-system page ("Spell check" section, v8, 2026-10-29) before anything is built (ADR 0013).
- ✅ Committed the docs (ADR, plan, DESIGN.md, CONTEXT, proposal page) on `docs/spell-checker` and merged (2026-10-29).

### 1. Engine spike (time-boxed, throwaway branch)
- Check nspell + `en_US`: gzipped download size, start-up time, time to check one paragraph and a 5,000-word document, quality of the top 5 suggestions, and loading from the cache when offline.
- Output: confirm the engine in ADR 0036 (or revise it, with the user).
- ✅ Done 2026-10-29, engine confirmed by the user. Results: 190 KB gzipped (163 KB brotli), start-up 55 ms, a paragraph 0.3 ms, 5,000 words 3 ms; `suggest()` 1–7 ms for common typos, 40–74 ms with no close match. nspell's order is poor ("teh" → "the" 9th), so we re-rank; hyphenated words are flagged whole, so the core checks each part.

### 2. Checker core: `src/lib/editor/spelling.ts` (`feat/spell-check-core`) ✅ 2026-10-29
- `findMisspellings(text, { dict, ignore, skip })`: text of one block + ignore list + ranges to skip (link text) → `{ from, to, word }[]`, offsets relative to the block. No suggestions here (they can take ~70 ms per word).
- `suggestionsFor(word, dict)`: called only when the menu opens; at most 5, re-ranked: swapped letters first, then the typed word's capitalisation, then nspell's order.
- Skips link text, URLs, email addresses, ALL CAPS words, words with digits, and words in the ignore list. Handles apostrophes ("don't", "client's") and hyphenated words.
- Unit tests first, with a small fixed dictionary so they're fast and always give the same result.

### 3. Worker: `src/lib/editor/spelling-worker.ts`
- Loads the dictionary lazily (on first edit or when the editor is idle), never blocking first paint.
- Requests carry block id + version; the caller drops out-of-date replies.
- Tests: replies that arrive out of order, only the latest one used; the dictionary loads only once.

### 4. Editor plugin: `SpellCheck` extension
- In `editorExtensions` only (like `Placeholder`), not `documentExtensions`.
- Plugin state: `DecorationSet` + changed blocks. Each transaction moves decorations along with the text, drops those inside edited ranges, and marks those blocks as changed; a 400 ms idle timer sends them to the worker. When the document opens: visible blocks first, then the rest.
- Paid only: follows the plan live, the same way the plain-text lock does (ADR 0035). On paid plans `spellcheck="false"` is set on the editor; on Free the plugin does nothing and the browser's built-in check stays on.
- Off on read-only documents.
- Tests: decorations follow typing above them; an edited word loses its underline until it's checked again; `getJSON()` unchanged; nothing runs on Free or on read-only documents.

### 5. Suggestions menu
- Opens on click/tap on an underlined word, or with ⌘; / Ctrl+; (`preventDefault`, so the browser's own "Check Document Now" doesn't run on paid plans). Positioned under the word, kept 16px inside the screen edges on phones (like the link editor).
- Up to 5 suggestions, divider, Ignore; "No suggestions" label when empty. The word is tinted while its menu is open. Arrows / Enter / Esc; focus goes back to the text.
- Picking a suggestion replaces the word in one transaction (one undo step) and keeps its marks. Ignore adds the word to the session's ignore list and removes its underlines everywhere.
- Tests (Testing Library): the menu shows up to 5 suggestions, keyboard navigation works, a pick is one undo step and keeps bold/italic, Ignore clears every instance of the word.

### 6. Manual test by the user, then docs + merge + deploy
Checked by hand on the emulators, in light and dark mode and at phone width:
- A typo gets underlined; a suggestion fixes it; Undo brings it back; autosave saves the corrected text.
- Ignore clears the word until the page is reloaded.
- No document text in network requests while checking (DevTools → Network).
- Works offline; off on read-only documents; Free shows only the browser's own underline.
- Typing in a 5,000-word document stays smooth.
- ⌘; opens suggestions in Chrome, Safari and Firefox on paid plans; on Free it does nothing of ours.

Then: roadmap ticked off in `WHERE_WE_ARE.md`, merge to `main`, deploy.

## Not in v1
- Personal dictionary / "Add to dictionary" (CONTEXT §12).
- Grammar, other languages, UK English.
- An on/off switch.
- End-to-end tests.
