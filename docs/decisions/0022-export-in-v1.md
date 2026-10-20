# 0022 — Export in v1, paid plans only

- Status: accepted (amends ADR 0020)
- Date: 2026-10-20

## Context
ADR 0020 put export (Word, PDF) after v1, paid only. The landing page proposal showed an export card with six formats, and the user decided to ship it in v1.

## Decision
- Export is part of v1, on paid plans (Monthly, Yearly). The Free plan has no export.
- Formats: PDF, Word (.docx), RTF, Markdown, HTML, plain text, keeping the v1 formatting (headings, bold, italic, underline, strike, lists, quotes, links) as far as each format allows.

## Consequences
- New Phase 4 work: one converter per format from the shared ProseMirror JSON (ADR 0006), each with tests first (ADR 0014). Plain text and Markdown lose underline; that is expected.
- Export is gated by entitlement, checked where the file is generated, not only in the UI.
- Export runs on the server, in a Cloud Function (decided 2026-10-20): the PDF and DOCX libraries stay out of the editor bundle (principle 1, fast beats featureful), and the entitlement check sits next to the file generation.
- Landing copy: "Included with every subscription"; both paid pricing cards list "Export to PDF, Word and more".
