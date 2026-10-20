import { cn } from "@/lib/utils";

// Notice molecule (ADR 0015): icon, text, optional button sm. One h-lg line
// from 560px, stacked below; neutral, or the warning tint for billing only.
export function Notice({
  icon,
  tone = "neutral",
  action,
  children,
}: {
  icon: React.ReactNode;
  tone?: "neutral" | "warning";
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="@container min-w-0">
      <div
        role="status"
        className={cn(
          "flex min-h-control-lg items-center gap-3 rounded-md border px-4 text-sm @max-[560px]:grid @max-[560px]:grid-cols-[auto_minmax(0,1fr)] @max-[560px]:items-start @max-[560px]:p-4 [&>svg]:size-4 [&>svg]:flex-none",
          tone === "warning"
            ? "border-[color-mix(in_oklab,var(--warning)_35%,var(--background))] bg-[color-mix(in_oklab,var(--warning)_10%,var(--background))] [&>svg]:text-warning"
            : "border-border bg-secondary [&>svg]:text-muted-foreground",
        )}
      >
        {icon}
        <span className="min-w-0 flex-auto @max-[560px]:leading-[1.4]">
          {children}
        </span>
        {action && (
          <span className="flex-none @max-[560px]:col-start-2">{action}</span>
        )}
      </div>
    </div>
  );
}
