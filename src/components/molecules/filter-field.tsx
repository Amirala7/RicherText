import { Search } from "lucide-react";
import { inputClasses } from "@/components/atoms/input";
import { cn } from "@/lib/utils";

// Filter field molecule (ADR 0015): input sm with a leading search icon, for
// the document list header.
export function FilterField({
  className,
  ...props
}: Omit<React.ComponentProps<"input">, "type">) {
  return (
    <div className={cn("relative min-w-0", className)}>
      <Search
        aria-hidden="true"
        strokeWidth={1.75}
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <input
        type="search"
        className={cn(inputClasses, "h-control-sm pl-9")}
        {...props}
      />
    </div>
  );
}
