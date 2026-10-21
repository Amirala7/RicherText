import { Check, CircleAlert, CloudOff } from "lucide-react";
import type { SaveState } from "@/lib/editor/autosave";
import { cn } from "@/lib/utils";

const icon = { strokeWidth: 1.75, "aria-hidden": true } as const;

// Saved indicator molecule (ADR 0015, 0029): every state stacked in one box,
// so the width never changes; muted, danger for errors. Screen readers hear
// only errors and Saved on device, through a polite live region.
export function SavedIndicator({
  state,
  onRetry,
  className,
}: {
  state: SaveState;
  onRetry: () => void;
  className?: string;
}) {
  const layer = (on: boolean) =>
    cn(
      "col-start-1 row-start-1 inline-flex items-center gap-2 whitespace-nowrap [&>svg]:size-4",
      !on && "invisible",
    );
  return (
    <span
      className={cn(
        "inline-grid h-control-sm flex-none items-center text-sm text-muted-foreground",
        className,
      )}
    >
      <span data-testid="saved-state" className={layer(state === "saved")}>
        <Check {...icon} />
        Saved
      </span>
      <span data-testid="saved-state" className={layer(state === "saving")}>
        <span
          aria-hidden="true"
          className="size-3.5 animate-spin rounded-full border-[1.75px] border-current border-r-transparent [animation-duration:700ms]"
        />
        Saving
      </span>
      <span data-testid="saved-state" className={layer(state === "device")}>
        <CloudOff {...icon} />
        Saved on device
      </span>
      <span
        data-testid="saved-state"
        className={cn(layer(state === "error"), "text-destructive")}
      >
        <CircleAlert {...icon} />
        Not saved ·{" "}
        {state === "error" ? (
          <button
            type="button"
            onClick={onRetry}
            className="cursor-pointer rounded-[2px] font-medium underline decoration-1 underline-offset-3 hover:decoration-2"
          >
            Retry
          </button>
        ) : (
          <span className="font-medium underline">Retry</span>
        )}
      </span>
      <span role="status" aria-live="polite" className="sr-only">
        {state === "error"
          ? "Not saved"
          : state === "device"
            ? "Saved on device"
            : ""}
      </span>
    </span>
  );
}
