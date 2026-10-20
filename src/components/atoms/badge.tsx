import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Badge atom (ADR 0013): 22px pill, xs 500, tinted by its tone; `chip` is the
// h-sm version for control rows (layout rule 1). The dot is optional.
const badgeVariants = cva(
  "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 text-xs leading-none font-medium whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral: "bg-secondary text-muted-foreground",
        primary:
          "bg-[color-mix(in_oklab,var(--primary)_14%,transparent)] text-primary",
      },
      size: { default: "h-[22px]", chip: "h-control-sm px-3" },
      dot: {
        true: "before:size-1.5 before:rounded-full before:bg-current before:content-['']",
      },
    },
    defaultVariants: { tone: "neutral", size: "default" },
  },
);

export function Badge({
  className,
  tone,
  size,
  dot,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      className={cn(badgeVariants({ tone, size, dot }), className)}
      {...props}
    />
  );
}
