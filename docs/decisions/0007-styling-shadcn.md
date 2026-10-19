# 0007 — Styling and UI: shadcn/ui, minimal typographic design, light + dark

- Status: accepted
- Date: 2026-10-19

## Context
Principle 3 is "calm by default: the UI recedes; the text is the interface". Both the landing page and the editor need a consistent, modern look without decorative weight.

## Decision
- **shadcn/ui** for components: Tailwind CSS plus Radix primitives. The components are copied into the repo, so we own and trim them.
- **Design direction:** minimal and modern. Hierarchy comes from large, confident typography and whitespace, not from graphical elements.
- **Light and dark mode**, following the system setting by default, with a manual toggle.

## Design rules
- **Typography first.** Large type scale, generous line-height, a comfortable reading width in the editor (~65–75 characters). Headings carry the layout.
- **No fluff:** no illustrations, gradients, decorative shapes, stock imagery or heavy shadows. Borders and subtle dividers only when they aid structure.
- **Restrained colour:** neutral greys plus a single accent colour (for primary actions and links). All colours are theme tokens (CSS variables), never hard-coded, so both themes stay in sync.
- **Few components.** Add a shadcn component only when a screen needs it, and remove variants we don't use.
- **Accessible contrast** in both themes (WCAG AA as the floor).

## Consequences
- Tailwind CSS is the styling layer everywhere; no separate CSS-in-JS or CSS Modules.
- Theme switching via `next-themes`, which uses a tiny inline script to set the theme before first paint (no flash of the wrong theme), including on marketing pages.
- Marketing pages should prefer components that render on the server (Button, Card, typography) over interactive Radix ones, to keep landing-page JavaScript minimal (0001).
- Editor content (Tiptap output) gets its own typography styles from the same tokens, so the editor and the landing page read as one product.
- **OPEN:** typeface(s) (e.g. one sans for UI + headings, optionally a serif for the writing surface), and the accent colour. *Resolved by 0010: Geist only, violet accent.*
