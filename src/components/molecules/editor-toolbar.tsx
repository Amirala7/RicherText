"use client";

import type { Editor } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
import {
  Bold,
  Italic,
  Link2,
  List,
  ListOrdered,
  Redo2,
  Strikethrough,
  TextQuote,
  Underline,
  Undo2,
} from "lucide-react";
import { Fragment } from "react";
import { ToolbarToggle } from "@/components/atoms/toolbar-toggle";
import { Tooltip, TooltipProvider } from "@/components/atoms/tooltip";
import { cn } from "@/lib/utils";

const icon = { strokeWidth: 1.75, "aria-hidden": true } as const;

type Item = {
  label: string;
  // Tiptap's default keys; Mod is ⌘ on Apple devices, Ctrl elsewhere.
  keys: string[];
  content: React.ReactNode;
  active?: (e: Editor) => boolean;
  can?: (e: Editor) => boolean;
  run: (e: Editor, onLink?: () => void) => void;
};

const heading = (level: 1 | 2 | 3): Item => ({
  label: `Heading ${level}`,
  keys: ["Mod", "Alt", String(level)],
  content: `H${level}`,
  active: (e) => e.isActive("heading", { level }),
  run: (e) => e.chain().focus().toggleHeading({ level }).run(),
});

// Editor toolbar groups (ADR 0015): undo redo · H1 H2 H3 · B I U S · bullets,
// numbers, quote · link; dividers between groups. The link button opens the
// link editor (slice 4), which the editor organism owns.
const GROUPS: Item[][] = [
  [
    {
      label: "Undo",
      keys: ["Mod", "Z"],
      content: <Undo2 {...icon} />,
      can: (e) => e.can().undo(),
      run: (e) => e.chain().focus().undo().run(),
    },
    {
      label: "Redo",
      keys: ["Mod", "Shift", "Z"],
      content: <Redo2 {...icon} />,
      can: (e) => e.can().redo(),
      run: (e) => e.chain().focus().redo().run(),
    },
  ],
  [heading(1), heading(2), heading(3)],
  [
    {
      label: "Bold",
      keys: ["Mod", "B"],
      content: <Bold {...icon} />,
      active: (e) => e.isActive("bold"),
      run: (e) => e.chain().focus().toggleBold().run(),
    },
    {
      label: "Italic",
      keys: ["Mod", "I"],
      content: <Italic {...icon} />,
      active: (e) => e.isActive("italic"),
      run: (e) => e.chain().focus().toggleItalic().run(),
    },
    {
      label: "Underline",
      keys: ["Mod", "U"],
      content: <Underline {...icon} />,
      active: (e) => e.isActive("underline"),
      run: (e) => e.chain().focus().toggleUnderline().run(),
    },
    {
      label: "Strikethrough",
      keys: ["Mod", "Shift", "S"],
      content: <Strikethrough {...icon} />,
      active: (e) => e.isActive("strike"),
      run: (e) => e.chain().focus().toggleStrike().run(),
    },
  ],
  [
    {
      label: "Bulleted list",
      keys: ["Mod", "Shift", "8"],
      content: <List {...icon} />,
      active: (e) => e.isActive("bulletList"),
      run: (e) => e.chain().focus().toggleBulletList().run(),
    },
    {
      label: "Numbered list",
      keys: ["Mod", "Shift", "7"],
      content: <ListOrdered {...icon} />,
      active: (e) => e.isActive("orderedList"),
      run: (e) => e.chain().focus().toggleOrderedList().run(),
    },
    {
      label: "Quote",
      keys: ["Mod", "Shift", "B"],
      content: <TextQuote {...icon} />,
      active: (e) => e.isActive("blockquote"),
      run: (e) => e.chain().focus().toggleBlockquote().run(),
    },
  ],
  [
    {
      label: "Link",
      keys: ["Mod", "K"],
      content: <Link2 {...icon} />,
      active: (e) => e.isActive("link"),
      run: (_, onLink) => onLink?.(),
    },
  ],
];

const ITEMS = GROUPS.flat();

function isApple() {
  return (
    typeof navigator !== "undefined" &&
    /Mac|iPhone|iPad/.test(navigator.platform)
  );
}

const ARIA: Record<string, [string, string]> = {
  Mod: ["Meta", "Control"],
  Alt: ["Alt", "Alt"],
  Shift: ["Shift", "Shift"],
};
const SHOWN: Record<string, [string, string]> = {
  Mod: ["⌘", "Ctrl"],
  Alt: ["⌥", "Alt"],
  Shift: ["⇧", "Shift"],
};

export function EditorToolbar({
  editor,
  disabled = false,
  onLink,
  className,
}: {
  editor: Editor;
  disabled?: boolean;
  onLink?: () => void;
  className?: string;
}) {
  const apple = isApple();
  const at = apple ? 0 : 1;
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      ITEMS.map((item) => ({
        active: item.active?.(e) ?? undefined,
        can: item.can?.(e) ?? true,
      })),
  });

  let n = 0;
  return (
    <TooltipProvider delayDuration={400}>
      <div
        role="toolbar"
        aria-label="Formatting"
        className={cn(
          "inline-flex h-control-lg max-w-full [scrollbar-width:none] items-center gap-0.5 overflow-x-auto rounded-md border border-border bg-background px-[5px] [&::-webkit-scrollbar]:hidden",
          className,
        )}
      >
        {GROUPS.map((group, g) => (
          <Fragment key={g}>
            {g > 0 && (
              <span
                aria-hidden="true"
                className="mx-1 h-5 w-px flex-none bg-border"
              />
            )}
            {group.map((item) => {
              const s = state[n++];
              return (
                <Tooltip
                  key={item.label}
                  label={item.label}
                  keys={item.keys.map((k) => SHOWN[k]?.[at] ?? k)}
                >
                  <ToolbarToggle
                    aria-label={item.label}
                    aria-keyshortcuts={item.keys
                      .map((k) => ARIA[k]?.[at] ?? k)
                      .join("+")}
                    pressed={s.active}
                    disabled={disabled || !s.can}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => item.run(editor, onLink)}
                  >
                    {item.content}
                  </ToolbarToggle>
                </Tooltip>
              );
            })}
          </Fragment>
        ))}
      </div>
    </TooltipProvider>
  );
}
