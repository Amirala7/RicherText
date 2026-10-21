"use client";

import { Link2, Unlink } from "lucide-react";
import { Popover } from "radix-ui";
import { useId, useState } from "react";
import { Button } from "@/components/atoms/button";
import { inputClasses } from "@/components/atoms/input";
import { normalizeLink } from "@/lib/editor/link";
import { cn } from "@/lib/utils";

const icon = { strokeWidth: 1.75, "aria-hidden": true } as const;

// Link editor molecule (ADR 0015, DESIGN.md §3): input sm with a link icon,
// Apply (button sm), Remove link (icon button sm) when editing a link; all
// items h-sm, gap s-2, edges s-3; a floating layer (border + shadow, r-md)
// under the selection. Enter applies, Esc closes. A bad address only marks
// the input invalid, so nothing changes size (slice 4, user 2026-10-21).
export function LinkEditor({
  open,
  anchor,
  href,
  onApply,
  onRemove,
  onClose,
}: {
  open: boolean;
  // Where the selection is on screen; the panel opens under it.
  anchor: () => DOMRect;
  // The link being edited, if the selection is in one.
  href?: string;
  // The address to link to, and the text as typed (used when nothing is
  // selected).
  onApply: (href: string, text: string) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(href ?? "");
  const [invalid, setInvalid] = useState(false);
  const errorId = useId();

  function apply() {
    const link = normalizeLink(value);
    if (link) onApply(link, value.trim());
    else setInvalid(true);
  }

  return (
    <Popover.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Popover.Anchor
        virtualRef={{ current: { getBoundingClientRect: anchor } }}
      />
      <Popover.Portal>
        <Popover.Content
          aria-label="Link"
          side="bottom"
          align="start"
          sideOffset={8}
          collisionPadding={16}
          onCloseAutoFocus={(e) => e.preventDefault()}
          className="z-50 w-[min(380px,calc(100vw-32px))] rounded-md border border-border bg-popover px-3 py-2 text-popover-foreground shadow-[0_8px_24px_-8px_rgb(0_0_0/.22),0_2px_6px_-2px_rgb(0_0_0/.08)]"
        >
          <form
            noValidate
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              apply();
            }}
          >
            <div className="relative min-w-0 flex-1">
              <Link2
                {...icon}
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="url"
                aria-label="Link address"
                placeholder="Paste or type a link"
                autoComplete="off"
                value={value}
                aria-invalid={invalid || undefined}
                aria-describedby={invalid ? errorId : undefined}
                onChange={(e) => {
                  setValue(e.target.value);
                  setInvalid(false);
                }}
                onKeyDown={(e) => {
                  if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
                  e.preventDefault();
                  apply();
                }}
                className={cn(inputClasses, "h-control-sm pl-9")}
              />
              <span id={errorId} className="sr-only">
                Use a web or email address, like example.com.
              </span>
            </div>
            <Button type="submit" size="sm">
              Apply
            </Button>
            {href && (
              <Button
                variant="ghost"
                size="sm"
                icon
                aria-label="Remove link"
                onClick={onRemove}
              >
                <Unlink className="size-4" {...icon} />
              </Button>
            )}
          </form>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
