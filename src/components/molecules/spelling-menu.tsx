"use client";

import { EyeOff } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import {
  menuContent,
  menuIcon as icon,
  menuItem as item,
  menuLabel as label,
  menuSeparator as separator,
} from "@/components/molecules/menu";

const MAX = 5;

// Spelling suggestions menu (ADR 0036, DESIGN.md §3): the menu molecule, 180
// wide, under the misspelt word; on phones 16px inside the screen edges. Up
// to 5 suggestions (sm 500), divider, Ignore; "No suggestions" label when
// there are none. The first suggestion has focus; arrows, Enter, Esc.
export function SpellingMenu({
  anchor,
  suggestions,
  onPick,
  onIgnore,
  onClose,
}: {
  // Where the word is on screen.
  anchor: DOMRect;
  suggestions: string[];
  onPick: (word: string) => void;
  onIgnore: () => void;
  onClose: () => void;
}) {
  return (
    <DropdownMenu.Root open onOpenChange={(next) => !next && onClose()}>
      {/* An empty box over the word for the menu to open under; the menu is
          modal, so the page can't scroll away from it. */}
      <DropdownMenu.Trigger asChild>
        <span
          aria-hidden
          tabIndex={-1}
          className="pointer-events-none fixed"
          style={{
            left: anchor.left,
            top: anchor.top,
            width: anchor.width,
            height: anchor.height,
          }}
        />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          aria-label="Spelling suggestions"
          // Named by its label, not by the empty box it opens from.
          aria-labelledby={undefined}
          side="bottom"
          align="start"
          sideOffset={4}
          collisionPadding={16}
          onCloseAutoFocus={(e) => e.preventDefault()}
          className={`${menuContent} w-[180px] max-w-[calc(100vw-32px)]`}
        >
          {suggestions.length === 0 && (
            <DropdownMenu.Label className={label}>
              No suggestions
            </DropdownMenu.Label>
          )}
          {suggestions.slice(0, MAX).map((word, i) => (
            <DropdownMenu.Item
              key={word}
              // The first suggestion takes focus as the menu opens.
              ref={i === 0 ? (el) => el?.focus() : undefined}
              className={`${item} font-medium`}
              onSelect={() => onPick(word)}
            >
              <span className="min-w-0 flex-1 truncate">{word}</span>
            </DropdownMenu.Item>
          ))}
          <DropdownMenu.Separator className={separator} />
          <DropdownMenu.Item className={item} onSelect={onIgnore}>
            <EyeOff {...icon} />
            <span className="min-w-0 flex-1 truncate">Ignore</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
