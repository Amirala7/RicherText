"use client";

import { AlertDialog } from "radix-ui";
import { Button } from "@/components/atoms/button";

// Dialog organism (ADR 0016): scrim; card max 400, border, r-lg, gap s-5,
// edges s-6 (phone s-4 / s-5); heading lg + one muted line; Cancel
// (secondary) then the main action on the right. Esc closes; focus starts on
// Cancel.
export function ConfirmDialog({
  open,
  title,
  line,
  action,
  danger = false,
  onConfirm,
  onOpenChange,
}: {
  open: boolean;
  title: string;
  line: string;
  action: string;
  danger?: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-scrim" />
        <AlertDialog.Content className="fixed top-1/2 left-1/2 z-50 grid w-[calc(100vw-32px)] max-w-[400px] -translate-x-1/2 -translate-y-1/2 gap-6 rounded-lg border border-border bg-background p-8 text-foreground max-sm:gap-4 max-sm:p-6">
          <div className="grid gap-1">
            <AlertDialog.Title className="m-0 text-lg">
              {title}
            </AlertDialog.Title>
            <AlertDialog.Description className="m-0 text-sm text-muted-foreground">
              {line}
            </AlertDialog.Description>
          </div>
          <div className="flex justify-end gap-3">
            <AlertDialog.Cancel asChild>
              <Button variant="secondary">Cancel</Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <Button
                variant={danger ? "danger" : "primary"}
                onClick={onConfirm}
              >
                {action}
              </Button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
