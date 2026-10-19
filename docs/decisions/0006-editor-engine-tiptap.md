# 0006 — Editor engine: Tiptap

- Status: accepted
- Date: 2026-10-19

## Context
The editor is the product. Principles that matter most here: "never lose a keystroke" (reliability, stable saved format) and clean copy/paste to and from email, Docs and Word (CONTEXT §5).

## Options considered

| | **Tiptap** (ProseMirror) | **Lexical** (Meta) |
|---|---|---|
| Fit for v1 features | Ready-made extensions cover all of §5 | More assembly required |
| Paste from Docs / Word / email | Strong: pasted content is cleaned to fit the schema | Historically weaker; often needs custom handling |
| Bundle size | Larger (~100 kB+ compressed with our extensions) | Smaller core |
| Very large documents | Good | Excellent |
| Maturity / stability | ProseMirror ~10 years old; Tiptap v3 mature | Pre-1.0; API changes between versions |
| Stored format | ProseMirror JSON, validated against the schema | Lexical JSON, changed over time |
| Rendering without the editor | Can generate HTML on the server from saved JSON | Possible, less direct |
| Licence | MIT core; paid Pro add-ons we don't need | MIT |

Also rejected: Slate and plain ProseMirror (too much work for the same features), Notion-style block editors such as BlockNote and Plate (too opinionated and heavy for "calm by default").

## Decision
Tiptap, chosen for maturity and stability.

## Consequences
- Documents are stored as ProseMirror JSON in Firestore (0004). This ties stored content to the editor, so changing engines later means migrating every saved document.
- The editor schema (which nodes and marks are allowed) is defined in one place, matches CONTEXT §5 exactly, and is shared by the client and any server-side rendering.
- Changing the schema (adding or removing node or mark types) needs a migration plan for existing documents.
- Bundle size is accepted: the editor loads only on authenticated routes, never on the landing page (0001).
- Only MIT-licensed Tiptap packages; no Pro/paid extensions without a new decision.
