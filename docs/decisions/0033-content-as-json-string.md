# 0033 — Document content stored as a JSON string

- Status: accepted (amends 0028)
- Date: 2026-10-21

## Context
ADR 0028 stores the editor's ProseMirror JSON as a Firestore map (`content/current.doc`). Firestore rejects maps and arrays nested deeper than 20 levels. Each list level costs about four of them, so a list indented three times (Tab ×3) can never be saved: the server answers `INVALID_ARGUMENT: invalid nested entity`, autosave fails on every retry and the edits are lost on reload. Found in the backend audit and confirmed on the emulator through both the Admin and the browser SDK (2026-10-21). This breaks principle 2, "never lose a keystroke".

## Options considered
- **Cap list nesting in the editor** (e.g. two indents): no data change, but Word and Google Docs allow about nine levels, so pasted lists hit it, and quotes inside lists and future nodes eat into the same 20 levels. A limit we'd keep tripping over.
- **JSON string** (chosen): the usual way to store Tiptap JSON (one text/JSON value). No depth limit; same size per save, or a little smaller (no per-field map overhead).
- **Compressed bytes** (gzip of the JSON): 5–10× smaller saves and more room under the 1 MiB cap. Not needed for v1; an easy step on top of the string if documents get large.

## Decision
- `users/{uid}/documents/{id}/content/current` = `doc` (string: `JSON.stringify` of the ProseMirror doc, `type` first), `updatedAt`. Field name unchanged.
- **Rules:** `doc` must be a string of at most 900,000 characters that starts as a ProseMirror doc (`{"type":"doc"`). A map is no longer accepted. Rules no longer see inside the content (they didn't need to).
- **Reading** accepts both: a string is parsed; an old map (emulator data from before this change) is used as is. No migration.
- Autosave still sends the whole document each save (Firestore can't patch inside nested arrays, so this was true before too); the 1 MiB document cap is unchanged.

## Consequences
- Lists and quotes can nest as deep as the editor allows.
- Approved test changes needed (rules, create and save tests that assert the stored map format); see `WHERE_WE_ARE.md`.
- If documents ever approach the cap: compress to bytes (Options), or split the content across records.
