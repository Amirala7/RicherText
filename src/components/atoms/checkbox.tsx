import { cn } from "@/lib/utils";

// Checkbox atom with its text; links inside keep the text size (ADR 0013).
export function Checkbox({
  className,
  children,
  ...props
}: Omit<React.ComponentProps<"input">, "type">) {
  return (
    <label
      className={cn(
        "inline-flex cursor-pointer items-center gap-2 text-sm",
        className,
      )}
    >
      <input
        type="checkbox"
        className="m-0 grid size-[18px] shrink-0 cursor-pointer appearance-none place-items-center rounded-[4px] border border-border-strong bg-background after:h-1.5 after:w-2.5 after:translate-x-px after:-translate-y-px after:-rotate-45 after:border-0 after:border-b-2 after:border-l-2 after:border-solid after:border-primary-foreground after:opacity-0 after:content-[''] checked:border-primary checked:bg-primary checked:after:opacity-100 aria-invalid:border-destructive"
        {...props}
      />
      <span>{children}</span>
    </label>
  );
}
