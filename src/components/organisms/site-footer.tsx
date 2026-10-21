import { NavLink } from "@/components/atoms/text-link";

// Site footer (ADR 0016): © left, Terms / Privacy / Refunds right; stacks on phone.
export function SiteFooter() {
  return (
    <footer className="flex h-bar min-w-0 items-center gap-6 border-t border-border bg-background px-8 max-sm:h-auto max-sm:flex-col max-sm:items-start max-sm:gap-3 max-sm:p-4">
      <span className="inline-flex h-control-md items-center text-sm whitespace-nowrap text-muted-foreground">
        © 2026 RicherText
      </span>
      <span className="h-px min-w-0 flex-1 max-sm:hidden" />
      <nav
        aria-label="Legal"
        className="flex flex-wrap items-center gap-6 max-sm:gap-4"
      >
        <NavLink href="/terms">Terms</NavLink>
        <NavLink href="/privacy">Privacy</NavLink>
        <NavLink href="/refunds">Refunds</NavLink>
      </nav>
    </footer>
  );
}
