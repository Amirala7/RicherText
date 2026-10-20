import { cn } from "@/lib/utils";

// Toast atom (ADR 0013) in its placement (ADR 0016): bottom centre, one at a
// time. h-md, sm text; the error tone uses danger and is announced as an alert.
export function Toast({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "error";
  children: React.ReactNode;
}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-50 flex justify-center px-4">
      <div
        role={tone === "error" ? "alert" : "status"}
        className={cn(
          "pointer-events-auto inline-flex h-control-md max-w-full items-center rounded-md px-4 text-sm whitespace-nowrap shadow-[0_8px_24px_-8px_rgb(0_0_0/0.3)]",
          tone === "error"
            ? "bg-destructive text-primary-foreground dark:text-background"
            : "bg-foreground text-background",
        )}
      >
        <span className="min-w-0 truncate">{children}</span>
      </div>
    </div>
  );
}
