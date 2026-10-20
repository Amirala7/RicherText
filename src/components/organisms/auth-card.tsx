import { cn } from "@/lib/utils";

// Auth card (ADR 0016, 0024): head, fields, footer with the way out left and
// the main button right; when narrow the button wraps above the way out.
export function AuthCard({
  title,
  line,
  footer,
  children,
  className,
  ...props
}: Omit<React.ComponentProps<"form">, "title"> & {
  title: string;
  line: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <form
      noValidate
      className={cn(
        "grid w-full max-w-[400px] min-w-0 gap-5 rounded-lg border border-border bg-background p-6 max-sm:gap-4 max-sm:p-5",
        className,
      )}
      {...props}
    >
      <div className="grid gap-1">
        <h1 className="m-0 text-xl">{title}</h1>
        <p className="m-0 text-sm leading-normal text-muted-foreground">
          {line}
        </p>
      </div>
      {children}
      <div className="flex flex-wrap-reverse items-center justify-between gap-3">
        {footer}
      </div>
    </form>
  );
}

// The way out in the footer: muted text with its link, in an h-md box.
export function AuthWayOut({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex h-control-md items-center gap-[0.3em] text-sm whitespace-nowrap text-muted-foreground [&_a]:font-medium">
      {children}
    </span>
  );
}
