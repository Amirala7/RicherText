import Link from "next/link";
import { Logotype } from "@/components/atoms/logotype";
import { cn } from "@/lib/utils";

// Page bar (ADR 0016, 0024): h-bar, logotype linking home, optional items on the right.
export function PageBar({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex h-bar min-w-0 items-center gap-5 border-b border-border bg-background px-6 max-sm:gap-3 max-sm:px-4",
        className,
      )}
    >
      <Link
        href="/"
        aria-label="RicherText home"
        className="inline-flex h-control-md flex-none items-center text-foreground max-sm:h-control-sm"
      >
        <Logotype className="h-5 w-auto max-sm:h-[18px]" />
      </Link>
      {children && (
        <>
          <span className="h-px min-w-0 flex-1" />
          {children}
        </>
      )}
    </header>
  );
}
