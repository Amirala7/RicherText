import type { Editor } from "@tiptap/core";

// What's highlighted right now: the editor reads a keyboard selection change
// a moment later (on selectionchange), so a quick ⌘K could otherwise link the
// previous one (seen on Android); the same goes for a quick pick of a text
// size or colour.
export function onScreenSelection(editor: Editor) {
  const { view, state } = editor;
  const sel = view.dom.ownerDocument.getSelection();
  if (
    !sel?.anchorNode ||
    !sel.focusNode ||
    !view.dom.contains(sel.anchorNode) ||
    !view.dom.contains(sel.focusNode)
  )
    return state.selection;
  const a = view.posAtDOM(sel.anchorNode, sel.anchorOffset);
  const b = view.posAtDOM(sel.focusNode, sel.focusOffset);
  return { from: Math.min(a, b), to: Math.max(a, b) };
}
