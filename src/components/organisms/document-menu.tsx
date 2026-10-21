"use client";

import { Download, Lock, MoreHorizontal, Trash2 } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { useState } from "react";
import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import {
  menuContent,
  menuDangerItem as danger,
  menuIcon as icon,
  menuItem as item,
  menuLabel as label,
  menuSeparator as separator,
} from "@/components/molecules/menu";
import { ConfirmDialog } from "@/components/organisms/dialog";
import { displayTitle } from "@/lib/documents/model";

const FORMATS = [
  "PDF",
  "Word (.docx)",
  "Rich Text (.rtf)",
  "Markdown",
  "HTML",
  "Plain text",
];

// Document menu in the editor bar (ADR 0024): "Export as" and the six
// formats, then Delete document (danger), which asks first. Export isn't
// built yet (ADR 0022), so its items are shown disabled and, on a paid plan,
// the label carries a "Coming soon" badge; on Free they show a lock and the
// label reads "Export · paid plans".
export function DocumentMenu({
  title,
  paid,
  onDelete,
  triggerClassName,
  sideOffset = 14,
}: {
  title: string;
  paid: boolean;
  onDelete: () => void;
  triggerClassName?: string;
  sideOffset?: number;
}) {
  const [confirming, setConfirming] = useState(false);
  const FormatIcon = paid ? Download : Lock;

  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <Button
            variant="ghost"
            icon
            aria-label="Document menu"
            className={triggerClassName}
          >
            <MoreHorizontal className="size-4" {...icon} />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={sideOffset}
            className={`${menuContent} w-[220px] max-w-[calc(100vw-32px)]`}
          >
            <DropdownMenu.Label className={`${label} justify-between gap-2`}>
              <span>{paid ? "Export as" : "Export · paid plans"}</span>
              {paid && <Badge tone="primary">Coming soon</Badge>}
            </DropdownMenu.Label>
            {FORMATS.map((format) => (
              <DropdownMenu.Item key={format} disabled className={item}>
                <FormatIcon {...icon} />
                <span className="min-w-0 flex-1 truncate">{format}</span>
              </DropdownMenu.Item>
            ))}
            <DropdownMenu.Separator className={separator} />
            <DropdownMenu.Item
              className={`${item} ${danger}`}
              onSelect={() => setConfirming(true)}
            >
              <Trash2 {...icon} />
              <span className="min-w-0 flex-1 truncate">Delete document</span>
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      <ConfirmDialog
        open={confirming}
        title={`Delete “${displayTitle(title)}”?`}
        line="This can't be undone."
        action="Delete"
        danger
        onConfirm={onDelete}
        onOpenChange={setConfirming}
      />
    </>
  );
}
