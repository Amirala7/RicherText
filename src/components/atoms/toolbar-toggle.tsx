import { cn } from "@/lib/utils";

// Toolbar toggle atom (ADR 0013): h-sm square, r-sm; "on" in the violet tint
// (16% mix); never changes size. Locked (aria-disabled, Free plan, ADR 0035)
// looks disabled but can still be pointed at and pressed.
export function ToolbarToggle({
  className,
  pressed,
  ...props
}: React.ComponentProps<"button"> & { pressed?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={cn(
        "inline-grid size-control-sm flex-none cursor-pointer place-items-center rounded-sm text-sm font-semibold text-foreground transition-colors duration-(--dur-1) ease-standard hover:not-disabled:not-aria-disabled:bg-secondary focus-visible:outline-offset-1 disabled:cursor-not-allowed disabled:opacity-40 aria-disabled:cursor-not-allowed aria-disabled:opacity-40 aria-pressed:bg-[color-mix(in_oklab,var(--primary)_16%,transparent)] aria-pressed:text-primary [&>svg]:size-4",
        className,
      )}
      {...props}
    />
  );
}
