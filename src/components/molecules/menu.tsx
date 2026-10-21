// Menu molecule (ADR 0015): items h-sm, sm, icon + label, gap 0, edge s-1;
// inside an item gap s-2, edge s-3; Delete is the only danger item; border +
// shadow. Disabled items: 45%, no hover, skipped by the keyboard (ADR 0024).
// Class names for Radix DropdownMenu parts.
export const menuContent =
  "z-50 grid gap-0 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-[0_8px_24px_-8px_rgb(0_0_0/.22),0_2px_6px_-2px_rgb(0_0_0/.08)]";
export const menuItem =
  "flex h-control-sm w-full cursor-pointer items-center gap-2 rounded-sm px-3 text-left text-sm text-foreground outline-none transition-colors duration-(--dur-1) ease-standard data-highlighted:bg-secondary data-disabled:cursor-not-allowed data-disabled:opacity-45 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-muted-foreground";
export const menuDangerItem = "text-destructive [&>svg]:text-destructive";
export const menuLabel =
  "flex h-control-sm min-w-0 items-center px-3 text-xs text-muted-foreground";
export const menuSeparator = "-mx-1 my-1 h-px bg-border";
export const menuIcon = { strokeWidth: 1.75, "aria-hidden": true } as const;
