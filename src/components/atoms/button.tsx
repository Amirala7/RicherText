import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Button atom (ADR 0013): never changes size; loading hides the label in place
// and puts the ring spinner on top (ADR 0012).
export const buttonVariants = cva(
  "relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md border border-transparent text-sm leading-none font-medium whitespace-nowrap transition-[background-color,border-color,color,transform] duration-(--dur-1) ease-standard active:not-disabled:translate-y-px disabled:cursor-not-allowed disabled:opacity-45 aria-busy:cursor-progress aria-busy:opacity-100",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground hover:not-disabled:bg-[color-mix(in_oklab,var(--primary)_88%,var(--foreground))] active:not-disabled:bg-[color-mix(in_oklab,var(--primary)_80%,var(--foreground))]",
        secondary:
          "border-border bg-background text-foreground hover:not-disabled:border-border-strong hover:not-disabled:bg-secondary active:not-disabled:bg-[color-mix(in_oklab,var(--secondary)_70%,var(--border))]",
        ghost:
          "bg-transparent text-foreground hover:not-disabled:bg-secondary active:not-disabled:bg-[color-mix(in_oklab,var(--secondary)_70%,var(--border))]",
      },
      size: {
        sm: "h-control-sm px-3",
        md: "h-control-md px-4",
        lg: "h-control-lg px-5 text-base",
      },
      icon: { true: "px-0" },
    },
    compoundVariants: [
      { icon: true, size: "sm", className: "w-control-sm" },
      { icon: true, size: "md", className: "w-control-md" },
      { icon: true, size: "lg", className: "w-control-lg" },
    ],
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { loading?: boolean };

export function Button({
  className,
  variant,
  size,
  icon,
  loading = false,
  disabled,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size, icon }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      <span
        data-slot="label"
        className={cn("inline-flex items-center gap-2", loading && "invisible")}
      >
        {children}
      </span>
      {loading && (
        <span
          data-slot="spinner"
          aria-hidden="true"
          className="absolute inset-0 m-auto size-4 animate-spin rounded-full border-2 border-current border-r-transparent [animation-duration:700ms]"
        />
      )}
    </button>
  );
}
