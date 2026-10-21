"use client";

import { Tooltip as Radix } from "radix-ui";

// Tooltip atom (ADR 0013): xs 500 on the foreground colour, r-md, with the
// shortcut keys after the label.
export function Tooltip({
  label,
  keys,
  children,
}: {
  label: string;
  keys?: string[];
  children: React.ReactNode;
}) {
  return (
    <Radix.Root>
      <Radix.Trigger asChild>{children}</Radix.Trigger>
      <Radix.Portal>
        <Radix.Content
          side="bottom"
          sideOffset={6}
          className="z-50 inline-flex items-center gap-2 rounded-md bg-foreground py-1.5 pr-2 pl-2.5 text-xs font-medium text-background"
        >
          {label}
          {keys && (
            <span className="inline-flex gap-[3px]">
              {keys.map((k) => (
                <kbd
                  key={k}
                  className="inline-flex h-5 min-w-5 items-center justify-center rounded-[4px] border border-b-2 border-[color-mix(in_oklab,var(--background)_35%,var(--foreground))] px-[5px] font-sans text-[11.5px] leading-none font-medium text-[color-mix(in_oklab,var(--background)_70%,var(--foreground))]"
                >
                  {k}
                </kbd>
              ))}
            </span>
          )}
          <Radix.Arrow className="fill-foreground" width={8} height={4} />
        </Radix.Content>
      </Radix.Portal>
    </Radix.Root>
  );
}

export const TooltipProvider = Radix.Provider;
