import { Extension } from "@tiptap/core";
import type { Node } from "@tiptap/pm/model";
import {
  Plugin,
  PluginKey,
  type EditorState,
  type Transaction,
} from "@tiptap/pm/state";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";
import type { Misspelling } from "./spelling";
import {
  createSpellClient,
  spellWorker,
  type SpellClient,
} from "./spelling-worker";

// Spell check (ADR 0036): misspellings are decorations, never marks, so the
// schema, saved documents and autosave don't change. Each change marks its
// blocks as changed; 400 ms after the last one they're sent to the worker.
// Underlines move with the text, and a word loses its underline as soon as
// it's edited. Only while `enabled()` (paid plans) and the editor is
// editable; then the browser's own spellcheck is off.
const IDLE_MS = 400;

type Range = [number, number];
type Pending = { pos: number; text: string };
type State = {
  decorations: DecorationSet;
  // Ranges whose blocks need checking, in the current document.
  changed: Range[];
  // Blocks sent to the worker, by request id.
  pending: Map<number, Pending>;
};
type Meta =
  | { type: "refresh" }
  | { type: "sent"; blocks: [number, Pending][] }
  | { type: "result"; id: number; misspellings: Misspelling[] };

export const spellCheckKey = new PluginKey<State>("spellCheck");

// Checks the whole document again, e.g. after the plan or editable changed.
export function refreshSpelling(view: EditorView) {
  view.dispatch(
    view.state.tr.setMeta(spellCheckKey, { type: "refresh" } satisfies Meta),
  );
}

// One worker per tab, started on first use.
let shared: SpellClient | null = null;
const sharedClient = () => (shared ??= createSpellClient(spellWorker));

const whole = (doc: Node): Range[] => [[0, doc.content.size]];

// A block's text, with line breaks as "\n" so offset i is at pos + 1 + i,
// and the ranges of its link text, which aren't checked.
function blockText(node: Node) {
  let text = "";
  const skip: Range[] = [];
  node.forEach((child) => {
    const from = text.length;
    text += child.isText ? child.text : "\n";
    if (child.marks.some((m) => m.type.name === "link"))
      skip.push([from, text.length]);
  });
  return { text, skip };
}

// The parts of the new document this transaction wrote.
function changedRanges(tr: Transaction): Range[] {
  const ranges: Range[] = [];
  tr.mapping.maps.forEach((map, i) => {
    const rest = tr.mapping.slice(i + 1);
    map.forEach((_from, _to, from, to) =>
      ranges.push([rest.map(from, -1), rest.map(to, 1)]),
    );
  });
  return ranges;
}

function apply(tr: Transaction, value: State, state: EditorState): State {
  const meta = tr.getMeta(spellCheckKey) as Meta | undefined;
  let { decorations, changed, pending } = value;
  if (tr.docChanged) {
    decorations = decorations.map(tr.mapping, tr.doc);
    const edits = changedRanges(tr);
    for (const [from, to] of edits)
      decorations = decorations.remove(decorations.find(from, to));
    changed = [
      ...changed.map(([from, to]): Range => [
        tr.mapping.map(from, -1),
        tr.mapping.map(to, 1),
      ]),
      ...edits,
    ];
    pending = new Map(
      [...pending].map(([id, p]) => [id, { ...p, pos: tr.mapping.map(p.pos) }]),
    );
  }
  if (meta?.type === "refresh") changed = whole(state.doc);
  if (meta?.type === "sent") {
    changed = [];
    pending = new Map([...pending, ...meta.blocks]);
  }
  if (meta?.type === "result") {
    const sent = pending.get(meta.id);
    pending = new Map(pending);
    pending.delete(meta.id);
    const node = sent && state.doc.nodeAt(sent.pos);
    // Out of date if the block's text changed since it was sent.
    if (sent && node?.isTextblock && blockText(node).text === sent.text) {
      const start = sent.pos + 1;
      const end = sent.pos + node.nodeSize - 1;
      decorations = decorations.remove(decorations.find(start, end)).add(
        state.doc,
        meta.misspellings.map((m) =>
          Decoration.inline(
            start + m.from,
            start + m.to,
            { class: "rt-misspelling" },
            { word: m.word },
          ),
        ),
      );
    }
  }
  if (
    decorations === value.decorations &&
    changed === value.changed &&
    pending === value.pending
  )
    return value;
  return { decorations, changed, pending };
}

export const SpellCheck = Extension.create<{
  enabled: () => boolean;
  client: () => SpellClient;
}>({
  name: "spellCheck",
  addOptions() {
    return { enabled: () => false, client: sharedClient };
  },
  addProseMirrorPlugins() {
    const { client } = this.options;
    const on = () => this.options.enabled() && this.editor.options.editable;
    let nextId = 1;

    const check = (view: EditorView) => {
      const { doc } = view.state;
      const { changed } = spellCheckKey.getState(view.state)!;
      const seen = new Set<number>();
      const blocks: [number, Pending & { skip: Range[] }][] = [];
      for (const [from, to] of changed) {
        doc.nodesBetween(
          Math.max(0, from),
          Math.min(doc.content.size, to),
          (node, pos) => {
            if (!node.isTextblock) return true;
            if (!seen.has(pos)) {
              seen.add(pos);
              blocks.push([nextId++, { pos, ...blockText(node) }]);
            }
            return false;
          },
        );
      }
      blocks.sort((a, b) => a[1].pos - b[1].pos);
      view.dispatch(
        view.state.tr.setMeta(spellCheckKey, {
          type: "sent",
          blocks: blocks.map(([id, { pos, text }]) => [id, { pos, text }]),
        } satisfies Meta),
      );
      for (const [id, { text, skip }] of blocks) {
        void client()
          .check(`b${id}`, text, { skip })
          .then((misspellings) => {
            if (!misspellings || view.isDestroyed) return;
            view.dispatch(
              view.state.tr.setMeta(spellCheckKey, {
                type: "result",
                id,
                misspellings,
              } satisfies Meta),
            );
          });
      }
    };

    return [
      new Plugin<State>({
        key: spellCheckKey,
        state: {
          init: (_, state) => ({
            decorations: DecorationSet.empty,
            changed: whole(state.doc),
            pending: new Map(),
          }),
          apply,
        },
        props: {
          decorations: (state) =>
            on() ? spellCheckKey.getState(state)?.decorations : undefined,
          attributes: (): Record<string, string> =>
            on() ? { spellcheck: "false" } : {},
        },
        view: (view) => {
          let timer: ReturnType<typeof setTimeout> | undefined;
          const schedule = () => {
            clearTimeout(timer);
            if (!on() || !spellCheckKey.getState(view.state)?.changed.length)
              return;
            timer = setTimeout(() => {
              if (on() && !view.isDestroyed) check(view);
            }, IDLE_MS);
          };
          schedule();
          return {
            update: (view, prev) => {
              const changed = spellCheckKey.getState(view.state)?.changed;
              if (changed !== spellCheckKey.getState(prev)?.changed) schedule();
            },
            destroy: () => clearTimeout(timer),
          };
        },
      }),
    ];
  },
});
