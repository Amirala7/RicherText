"use client";

import { FileText, Lock, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { DropdownMenu } from "radix-ui";
import { useRef, useState } from "react";
import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { inputClasses } from "@/components/atoms/input";
import {
  menuContent,
  menuDangerItem,
  menuIcon as icon,
  menuItem,
  menuSeparator,
} from "@/components/molecules/menu";
import { sinceEdited, type ListedDocument } from "@/lib/documents/list";
import { TITLE_MAX, displayTitle } from "@/lib/documents/model";
import { cn } from "@/lib/utils";

// Document row molecule (ADR 0015): a list row (h-lg, children in h-sm boxes,
// gap s-3, edges s-4). The whole row opens the document; the menu button shows
// on hover or focus (always on touch). Rename in place: the title becomes an
// input sm of the same height; Enter (or leaving the field) saves, Esc cancels.
// Read-only (plan ended, ADR 0020): title muted, the Read-only chip in place
// of the edit time (lock only under 420px).
export function DocumentRow({
  document,
  editable,
  now,
  onRename,
  onDelete,
}: {
  document: ListedDocument;
  editable: boolean;
  now: Date;
  onRename: (title: string) => void;
  onDelete: () => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const finished = useRef(false);
  // Set as Rename is chosen: when the menu closes, focus goes to the title
  // field instead of back to the menu button.
  const renameChosen = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  const title = displayTitle(document.title);

  function finish(value: string | null) {
    if (finished.current) return;
    finished.current = true;
    setRenaming(false);
    const next = value?.trim();
    if (next !== undefined && next !== document.title.trim()) onRename(next);
  }

  return (
    <li className="group relative flex h-control-lg min-w-0 items-center gap-3 px-4 transition-colors duration-(--dur-1) ease-standard hover:bg-secondary has-[a:focus-visible]:bg-secondary has-[a:focus-visible]:shadow-[inset_0_0_0_2px_var(--ring)]">
      <span className="inline-flex h-control-sm flex-none items-center text-muted-foreground">
        <FileText className="size-4" {...icon} />
      </span>
      {renaming ? (
        <input
          ref={input}
          aria-label="Title"
          defaultValue={document.title}
          maxLength={TITLE_MAX}
          onFocus={(e) => e.currentTarget.select()}
          onKeyDown={(e) => {
            if (e.key === "Enter") finish(e.currentTarget.value);
            if (e.key === "Escape") finish(null);
          }}
          onBlur={(e) => finish(e.currentTarget.value)}
          className={cn(inputClasses, "h-control-sm flex-auto")}
        />
      ) : (
        <Link
          href={`/documents/${document.id}`}
          className="flex h-control-sm min-w-0 flex-auto items-center gap-3 outline-none after:absolute after:inset-0"
        >
          <span
            className={cn(
              "min-w-0 flex-auto truncate text-sm font-medium",
              !editable && "text-muted-foreground",
            )}
          >
            {title}
          </span>
          {editable ? (
            <span className="flex-none text-sm whitespace-nowrap text-muted-foreground tabular-nums">
              <span className="@max-[420px]:hidden">Edited </span>
              {sinceEdited(document.updatedAt, now)}
            </span>
          ) : (
            <Badge size="chip">
              <Lock className="size-4" {...icon} />
              <span className="@max-[420px]:sr-only">Read-only</span>
            </Badge>
          )}
        </Link>
      )}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <Button
            variant="ghost"
            size="sm"
            icon
            aria-label="Document actions"
            className="relative z-10 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 [@media(hover:none)]:opacity-100"
          >
            <MoreHorizontal className="size-4" {...icon} />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={4}
            className={cn(menuContent, "w-[180px]")}
            // Renaming takes the focus; the trigger mustn't take it back.
            onCloseAutoFocus={(e) => {
              if (!renameChosen.current) return;
              renameChosen.current = false;
              e.preventDefault();
              input.current?.focus();
            }}
          >
            {editable && (
              <>
                <DropdownMenu.Item
                  className={menuItem}
                  onSelect={() => {
                    finished.current = false;
                    renameChosen.current = true;
                    setRenaming(true);
                  }}
                >
                  <Pencil {...icon} />
                  <span className="min-w-0 flex-1 truncate">Rename</span>
                </DropdownMenu.Item>
                <DropdownMenu.Separator className={menuSeparator} />
              </>
            )}
            <DropdownMenu.Item
              className={cn(menuItem, menuDangerItem)}
              onSelect={onDelete}
            >
              <Trash2 {...icon} />
              <span className="min-w-0 flex-1 truncate">Delete</span>
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </li>
  );
}
