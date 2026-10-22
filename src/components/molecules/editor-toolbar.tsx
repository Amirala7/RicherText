"use client";

import type { Editor } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
import {
  ALargeSmall,
  Bold,
  Check,
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
import { DropdownMenu } from "radix-ui";
import { Fragment } from "react";
import { ToolbarToggle } from "@/components/atoms/toolbar-toggle";
import { Tooltip, TooltipProvider } from "@/components/atoms/tooltip";
import { menuContent, menuItem } from "@/components/molecules/menu";
import {
  TEXT_COLOURS,
  TEXT_SIZES,
  type TextColour,
  type TextSize,
} from "@/lib/editor/text-style";
import { onScreenSelection } from "@/lib/editor/selection";
import {
  WRITING_FONTS,
  writingFont,
  type WritingFont,
} from "@/lib/settings/writing";
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
// numbers, quote · font (ADR 0032), size, colour (ADR 0031) · link; dividers
// between groups. The link button opens the link editor (slice 4), which the
// editor organism owns.
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

// Free plan (ADR 0035): what a locked toggle says, and its look: disabled,
// but it can still be pointed at and pressed.
const UPGRADE = "Upgrade to unlock formatting";

function LockedToggle({
  label,
  onUpgrade,
  children,
}: {
  label: string;
  onUpgrade?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip label={UPGRADE}>
      <ToolbarToggle
        aria-label={label}
        aria-disabled="true"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onUpgrade}
      >
        {children}
      </ToolbarToggle>
    </Tooltip>
  );
}

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
  locked: lockedPlan = false,
  font = "geist",
  onFont,
  onLink,
  onUpgrade,
  className,
}: {
  editor: Editor;
  disabled?: boolean;
  // Free plan (ADR 0035): every toggle says to upgrade and calls onUpgrade.
  // A read-only document is plainly disabled instead.
  locked?: boolean;
  font?: WritingFont;
  onFont?: (font: WritingFont) => void;
  onLink?: () => void;
  onUpgrade?: () => void;
  className?: string;
}) {
  const locked = lockedPlan && !disabled;
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
  const style = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      size: (e.getAttributes("textSize").size ?? "default") as
        TextSize | "default",
      colour: (e.getAttributes("textColor").color ?? "default") as
        TextColour | "default",
    }),
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
            {g === GROUPS.length - 1 && (
              <>
                <Divider />
                {locked ? (
                  <>
                    <LockedToggle label="Writing font" onUpgrade={onUpgrade}>
                      {FONT_FACE}
                    </LockedToggle>
                    <LockedToggle label="Text size" onUpgrade={onUpgrade}>
                      {SIZE_ICON}
                    </LockedToggle>
                    <LockedToggle label="Text colour" onUpgrade={onUpgrade}>
                      <ColourFace colour={style.colour} />
                    </LockedToggle>
                  </>
                ) : (
                  <>
                    <WritingFontMenu
                      editor={editor}
                      font={font}
                      onFont={onFont}
                      disabled={disabled}
                    />
                    <TextStyleMenus
                      editor={editor}
                      size={style.size}
                      colour={style.colour}
                      disabled={disabled}
                    />
                  </>
                )}
              </>
            )}
            {g > 0 && <Divider />}
            {group.map((item) => {
              const s = state[n++];
              if (locked)
                return (
                  <LockedToggle
                    key={item.label}
                    label={item.label}
                    onUpgrade={onUpgrade}
                  >
                    {item.content}
                  </LockedToggle>
                );
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

function Divider() {
  return (
    <span aria-hidden="true" className="mx-1 h-5 w-px flex-none bg-border" />
  );
}

const FONT_FACE = (
  <span aria-hidden="true" className="font-serif text-[15px] leading-none">
    Ag
  </span>
);
const SIZE_ICON = <ALargeSmall {...icon} />;

function ColourFace({ colour }: { colour: TextColour | "default" }) {
  const bar =
    colour === "default" ? "var(--foreground)" : `var(--tc-${colour})`;
  return (
    <span
      aria-hidden="true"
      className="grid justify-items-center gap-px text-[13px] leading-none font-semibold"
    >
      A
      <span
        className="h-[3px] w-3.5 rounded-[2px]"
        style={{ background: bar }}
      />
    </span>
  );
}

const radioItem = `${menuItem} [&>svg]:invisible [&>svg]:text-foreground data-[state=checked]:[&>svg]:visible`;

// Writing font (ADR 0032): the document's font, not a mark; the pick goes up
// to be saved with the document, and focus returns to the text. The toggle
// is a serif "Ag" in the system serif, so IBM Plex Serif still only loads
// for documents that use it.
function WritingFontMenu({
  editor,
  font,
  onFont,
  disabled,
}: {
  editor: Editor;
  font: WritingFont;
  onFont?: (font: WritingFont) => void;
  disabled: boolean;
}) {
  return (
    <DropdownMenu.Root modal={false}>
      <Tooltip label="Writing font">
        <DropdownMenu.Trigger asChild disabled={disabled}>
          <ToolbarToggle
            aria-label="Writing font"
            onMouseDown={(e) => e.preventDefault()}
          >
            {FONT_FACE}
          </ToolbarToggle>
        </DropdownMenu.Trigger>
      </Tooltip>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={10}
          className={cn(menuContent, "w-[180px]")}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            if (!editor.isDestroyed) editor.commands.focus();
          }}
        >
          <DropdownMenu.RadioGroup
            value={font}
            onValueChange={(value) => onFont?.(writingFont(value))}
          >
            {WRITING_FONTS.map((option) => (
              <DropdownMenu.RadioItem
                key={option.id}
                value={option.id}
                className={radioItem}
              >
                <Check {...icon} />
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

// Text size and colour (ADR 0031): toggles that open a menu; picking applies
// to the selection (or what's typed next) and returns to the text.
function TextStyleMenus({
  editor,
  size,
  colour,
  disabled,
}: {
  editor: Editor;
  size: TextSize | "default";
  colour: TextColour | "default";
  disabled: boolean;
}) {
  const backToText = (e: Event) => {
    e.preventDefault();
    if (!editor.isDestroyed) editor.commands.focus();
  };
  // Picks apply to what's highlighted on screen, even if the editor hasn't
  // caught up with a quick keyboard selection yet.
  const syncSelection = (open: boolean) => {
    if (!open || editor.isDestroyed) return;
    const { from, to } = onScreenSelection(editor);
    const current = editor.state.selection;
    // Only when it differs: setting it again would drop a size or colour
    // picked with nothing selected, waiting for the next keystroke.
    if (from !== current.from || to !== current.to)
      editor.commands.setTextSelection({ from, to });
  };
  return (
    <>
      <DropdownMenu.Root modal={false} onOpenChange={syncSelection}>
        <Tooltip label="Text size">
          <DropdownMenu.Trigger asChild disabled={disabled}>
            <ToolbarToggle
              aria-label="Text size"
              onMouseDown={(e) => e.preventDefault()}
            >
              {SIZE_ICON}
            </ToolbarToggle>
          </DropdownMenu.Trigger>
        </Tooltip>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="start"
            sideOffset={10}
            className={cn(menuContent, "w-[180px]")}
            onCloseAutoFocus={backToText}
          >
            <DropdownMenu.RadioGroup
              value={size}
              onValueChange={(value) => {
                const chain = editor.chain().focus();
                (value === "default"
                  ? chain.unsetMark("textSize")
                  : chain.setMark("textSize", { size: value })
                ).run();
              }}
            >
              {[
                { ...TEXT_SIZES[0], className: "text-[13px]" },
                { id: "default", label: "Default", className: "" },
                { ...TEXT_SIZES[1], className: "text-base" },
              ].map((option) => (
                <DropdownMenu.RadioItem
                  key={option.id}
                  value={option.id}
                  className={radioItem}
                >
                  <Check {...icon} />
                  <span
                    className={cn("min-w-0 flex-1 truncate", option.className)}
                  >
                    {option.label}
                  </span>
                </DropdownMenu.RadioItem>
              ))}
            </DropdownMenu.RadioGroup>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      <DropdownMenu.Root modal={false} onOpenChange={syncSelection}>
        <Tooltip label="Text colour">
          <DropdownMenu.Trigger asChild disabled={disabled}>
            <ToolbarToggle
              aria-label="Text colour"
              onMouseDown={(e) => e.preventDefault()}
            >
              <ColourFace colour={colour} />
            </ToolbarToggle>
          </DropdownMenu.Trigger>
        </Tooltip>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="start"
            sideOffset={10}
            className={cn(
              menuContent,
              "grid-cols-[repeat(7,var(--spacing-control-sm))]",
            )}
            onCloseAutoFocus={backToText}
          >
            <DropdownMenu.RadioGroup
              value={colour}
              onValueChange={(value) => {
                const chain = editor.chain().focus();
                (value === "default"
                  ? chain.unsetMark("textColor")
                  : chain.setMark("textColor", { color: value })
                ).run();
              }}
              className="contents"
            >
              {[{ id: "default", label: "Default" }, ...TEXT_COLOURS].map(
                (option) => (
                  <DropdownMenu.RadioItem
                    key={option.id}
                    value={option.id}
                    aria-label={option.label}
                    className="grid size-control-sm cursor-pointer place-items-center rounded-sm transition-colors duration-(--dur-1) ease-standard outline-none data-highlighted:bg-secondary"
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "size-4 rounded-full shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--foreground)_12%,transparent)] in-data-[state=checked]:shadow-[0_0_0_2px_var(--popover),0_0_0_4px_var(--foreground)]",
                        option.id === "default" &&
                          "bg-[linear-gradient(135deg,transparent_45%,var(--muted-foreground)_45%_55%,transparent_55%)] shadow-[inset_0_0_0_1px_var(--border-strong)]",
                      )}
                      style={
                        option.id === "default"
                          ? undefined
                          : { background: `var(--tc-${option.id})` }
                      }
                    />
                  </DropdownMenu.RadioItem>
                ),
              )}
            </DropdownMenu.RadioGroup>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </>
  );
}
