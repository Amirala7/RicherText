import { cn } from "@/lib/utils";

// Input atom (ADR 0013): focus is a primary border plus a 3px halo, never a thicker border.
export const inputClasses =
  "h-control-md w-full min-w-0 rounded-sm border border-input bg-background px-3 text-sm text-foreground transition-[border-color,box-shadow] duration-(--dur-1) ease-standard placeholder:text-muted-foreground hover:not-disabled:border-border-strong focus:border-primary focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--primary)_25%,transparent)] focus:outline-none focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground aria-invalid:border-destructive aria-invalid:focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--destructive)_22%,transparent)]";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(inputClasses, className)} {...props} />;
}
