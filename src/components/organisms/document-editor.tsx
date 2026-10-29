"use client";

import { posToDOMRect, type Editor } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import { ArrowLeft, Lock } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Badge } from "@/components/atoms/badge";
import { buttonVariants } from "@/components/atoms/button";
import { EditorToolbar } from "@/components/molecules/editor-toolbar";
import { LinkEditor } from "@/components/molecules/link-editor";
import { Notice } from "@/components/molecules/notice";
import { SavedIndicator } from "@/components/molecules/saved-indicator";
import { AccountMenu } from "@/components/organisms/account-menu";
import { DocumentMenu } from "@/components/organisms/document-menu";
import { TITLE_MAX, type DocumentJson } from "@/lib/documents/model";
import type { SaveState } from "@/lib/editor/autosave";
import { createLock } from "@/lib/editor/plain-text";
import { editorExtensions } from "@/lib/editor/schema";
import { refreshSpelling } from "@/lib/editor/spell-check";
import { onScreenSelection } from "@/lib/editor/selection";
import type { WritingFont } from "@/lib/settings/writing";
import { cn } from "@/lib/utils";

const icon = { strokeWidth: 1.75, "aria-hidden": true } as const;

const phone = "(max-width: 639px)";
function useNarrow() {
  return useSyncExternalStore(
    (change) => {
      const query = window.matchMedia(phone);
      query.addEventListener("change", change);
      return () => query.removeEventListener("change", change);
    },
    () => window.matchMedia(phone).matches,
    () => false,
  );
}

// Editor organism (DESIGN.md editor template, ADR 0024, 0030): one h-bar bar
// with back, toolbar and account, items h-lg; on phones a header row (back,
// account) and the toolbar on its own line. Below, the 68ch writing column:
// title (xl 28, "Untitled") and the body. Saved floats quietly in the
// bottom-right corner. Read-only: a chip in the bar, toolbar disabled, a
// notice with Resubscribe above the title. The link button and ⌘K open the
// link editor under the selection (slice 4). Free plan (ADR 0035): plain
// text; the toolbar is locked and its toggles go to the plans page, and the
// shortcuts and formatted pastes do nothing. Markdown shortcuts follow the
// plan the editor opened with. Spell check (ADR 0036): paid plans only, so
// it follows the plan live like the lock; off on read-only documents.
type LinkTarget = { from: number; to: number; href?: string };

export function DocumentEditor({
  title: initialTitle,
  doc,
  editable,
  paid,
  font: initialFont = "geist",
  saveState,
  email,
  onTitle,
  onDoc,
  onFont,
  onRetry,
  onDelete,
  onUpgrade,
}: {
  title: string;
  doc: DocumentJson;
  editable: boolean;
  paid: boolean;
  font?: WritingFont;
  saveState: SaveState;
  email: string | null;
  onTitle: (title: string) => void;
  onDoc: (doc: DocumentJson) => void;
  onFont?: (font: WritingFont) => void;
  onRetry: () => void;
  onDelete: () => void;
  onUpgrade?: () => void;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [font, setFont] = useState(initialFont);
  const [link, setLink] = useState<LinkTarget | null>(null);
  const narrow = useNarrow();
  const openLink = useRef(() => {});
  const [lock] = useState(() => createLock(!paid));
  useEffect(() => lock.set(!paid), [lock, paid]);
  const [spelling] = useState(() => createLock(paid));
  const editor = useEditor({
    extensions: editorExtensions({ locked: lock.get, spelling: spelling.get }),
    enableInputRules: paid,
    enablePasteRules: paid,
    content: doc,
    editable,
    immediatelyRender: false,
    autofocus: editable ? "end" : false,
    editorProps: {
      attributes: {
        class: "rt-doc",
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": "Document body",
      },
      handleKeyDown: (_, event) => {
        const mod = event.metaKey || event.ctrlKey;
        if (!mod || event.altKey || event.key.toLowerCase() !== "k")
          return false;
        openLink.current();
        return true;
      },
    },
    onUpdate: ({ editor: e }) => onDoc(e.getJSON() as DocumentJson),
  });

  useEffect(() => {
    editor?.setEditable(editable, false);
  }, [editor, editable]);

  // After the editable effect above, so a document that becomes editable
  // (or a plan that becomes paid) is checked from the start.
  useEffect(() => {
    if (!editor) return;
    spelling.set(paid);
    refreshSpelling(editor.view);
  }, [editor, spelling, paid, editable]);

  useEffect(() => {
    openLink.current = () => {
      if (!editor || !editable || !paid) return;
      const { from, to } = onScreenSelection(editor);
      setLink({ from, to, href: linkIn(editor, from, to) });
    };
  }, [editor, editable, paid]);

  function closeLink() {
    setLink(null);
    editor?.commands.focus();
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-bar min-w-0 items-center gap-5 border-b border-border bg-background px-6 max-sm:h-auto max-sm:flex-wrap max-sm:gap-2 max-sm:p-3">
        <Link
          href="/documents"
          aria-label="Back to documents"
          className={cn(
            buttonVariants({ variant: "ghost", size: "lg", icon: true }),
            "max-sm:size-control-md",
          )}
        >
          <ArrowLeft className="size-4" {...icon} />
        </Link>
        {editor && (
          <EditorToolbar
            editor={editor}
            disabled={!editable}
            locked={!paid}
            onUpgrade={onUpgrade}
            font={font}
            onFont={(next) => {
              setFont(next);
              onFont?.(next);
            }}
            onLink={() => openLink.current()}
            className="min-w-0 flex-[0_1_auto] max-sm:order-10 max-sm:flex-[1_1_100%]"
          />
        )}
        {editor && link && (
          <LinkEditor
            open
            anchor={() => posToDOMRect(editor.view, link.from, link.to)}
            href={link.href}
            onApply={(href, text) => {
              applyLink(editor, link, href, text);
              closeLink();
            }}
            onRemove={() => {
              editor
                .chain()
                .setTextSelection(link)
                .extendMarkRange("link")
                .unsetLink()
                .run();
              closeLink();
            }}
            onClose={closeLink}
          />
        )}
        <span className="h-px min-w-0 flex-1" />
        {!editable && (
          <Badge size="chip">
            <Lock className="size-4" {...icon} />
            Read-only
          </Badge>
        )}
        <DocumentMenu
          title={title}
          paid={paid}
          onDelete={onDelete}
          triggerClassName="size-control-lg max-sm:size-control-md"
          sideOffset={narrow ? 4 : 14}
        />
        <AccountMenu
          email={email}
          triggerClassName="size-control-lg max-sm:size-control-md"
          sideOffset={narrow ? 4 : 14}
        />
      </header>
      <main className="px-6 pt-7 pb-24 max-sm:px-4 max-sm:pt-5 max-sm:pb-7">
        <div className="mx-auto grid max-w-[68ch] min-w-0">
          {!editable && (
            <div className="mb-6 max-sm:mb-5">
              <Notice
                icon={<Lock {...icon} />}
                action={
                  <Link
                    href="/plans"
                    className={buttonVariants({
                      variant: "secondary",
                      size: "sm",
                    })}
                  >
                    Resubscribe
                  </Link>
                }
              >
                On the Free plan only your newest document can be edited.
              </Notice>
            </div>
          )}
          <div className="grid min-w-0 gap-4" data-writing-font={font}>
            <input
              aria-label="Title"
              placeholder="Untitled"
              value={title}
              maxLength={TITLE_MAX}
              readOnly={!editable}
              onChange={(e) => {
                setTitle(e.target.value);
                onTitle(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                editor?.commands.focus("start");
              }}
              className="w-full min-w-0 bg-transparent text-xl outline-none placeholder:text-muted-foreground"
            />
            <EditorContent editor={editor} />
          </div>
        </div>
      </main>
      {editable && (
        <SavedIndicator
          state={saveState}
          onRetry={onRetry}
          className="fixed right-6 bottom-6 z-10 max-sm:right-4 max-sm:bottom-4"
        />
      )}
    </div>
  );
}

// The address of the link at the cursor or in the selection, if any.
function linkIn(editor: Editor, from: number, to: number) {
  const { doc, schema } = editor.state;
  const type = schema.marks.link;
  let href: string | undefined;
  if (from === to) href = type.isInSet(doc.resolve(from).marks())?.attrs.href;
  else
    doc.nodesBetween(from, to, (node) => {
      href ??= type.isInSet(node.marks)?.attrs.href;
    });
  return href;
}

// A selection gets the link; inside a link, the whole link changes; with
// nothing selected the address is typed in as linked text, and what's typed
// next isn't part of it (2026-10-21).
function applyLink(
  editor: Editor,
  { from, to, href: editing }: LinkTarget,
  href: string,
  text: string,
) {
  const chain = editor.chain().setTextSelection({ from, to });
  if (editing) chain.extendMarkRange("link").setLink({ href });
  else if (from === to)
    chain
      .insertContent({
        type: "text",
        text,
        marks: [{ type: "link", attrs: { href } }],
      })
      .unsetMark("link");
  else chain.setLink({ href });
  chain.run();
}
