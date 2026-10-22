import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

// The Free plan is plain text (ADR 0035). While `locked()` is true the
// toolbar's shortcuts do nothing and pasted text loses its formatting. The
// markdown shortcuts are turned off when the editor is made (Tiptap builds
// them once), and typed addresses aren't linked (schema.ts). Documents that
// already have formatting keep it.
type Keys = Pick<
  KeyboardEvent,
  "code" | "metaKey" | "ctrlKey" | "shiftKey" | "altKey"
>;

// The toolbar's shortcuts (editor-toolbar.tsx), by physical key, so ⇧ and ⌥
// changing the character don't matter.
const PLAIN = new Set(["KeyB", "KeyI", "KeyU", "KeyK"]);
const SHIFT = new Set(["KeyS", "KeyB", "Digit7", "Digit8"]);
const ALT = new Set(["Digit0", "Digit1", "Digit2", "Digit3"]);

export function isFormattingShortcut(e: Keys) {
  if (!(e.metaKey || e.ctrlKey)) return false;
  if (e.altKey) return ALT.has(e.code);
  return (e.shiftKey ? SHIFT : PLAIN).has(e.code);
}

// A switch the editor reads at keystroke and paste time, so a plan change
// locks or unlocks without rebuilding the editor.
export function createLock(on: boolean) {
  return {
    get: () => on,
    set: (next: boolean) => {
      on = next;
    },
  };
}

export const PlainTextLock = Extension.create<{ locked: () => boolean }>({
  name: "plainTextLock",
  // Ahead of the formatting keymaps, so a swallowed shortcut never reaches
  // them.
  priority: 1000,
  addOptions() {
    return { locked: () => false };
  },
  addProseMirrorPlugins() {
    const { locked } = this.options;
    return [
      new Plugin({
        key: new PluginKey("plainTextLock"),
        props: {
          handleKeyDown: (_, event) => locked() && isFormattingShortcut(event),
          // Pasting again as text comes back here without clipboard data.
          handlePaste: (view, event) => {
            const data = event.clipboardData;
            if (!locked() || !data?.types.includes("text/html")) return false;
            view.pasteText(data.getData("text/plain"));
            return true;
          },
        },
      }),
    ];
  },
});
