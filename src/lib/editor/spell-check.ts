import { Extension } from "@tiptap/core";
import type { Node } from "@tiptap/pm/model";
import {
  Plugin,
  PluginKey,
  TextSelection,
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
// Suggestions (slice 5): a click or tap on an underlined word, or ⌘; / Ctrl+;
// (the misspelling at the cursor, or the next one), asks the worker for
// suggestions and hands them to `onSuggest`, which opens the menu; the word
// is tinted while it's open. Ignored words stay unflagged for the session.
const IDLE_MS = 400;

type Range = [number, number];
type Pending = { pos: number; text: string };
type State = {
  decorations: DecorationSet;
  // Ranges whose blocks need checking, in the current document.
  changed: Range[];
  // Blocks sent to the worker, by request id.
  pending: Map<number, Pending>;
  // The word whose suggestions menu is open.
  open: Range | null;
};
type Meta =
  | { type: "refresh" }
  | { type: "open"; range: Range }
  | { type: "close" }
  | { type: "ignore"; word: string }
  | { type: "sent"; blocks: [number, Pending][] }
  | { type: "result"; id: number; misspellings: Misspelling[] };

export const spellCheckKey = new PluginKey<State>("spellCheck");

// A misspelling, in document positions, with its suggestions (at most 5).
export type SpellTarget = Misspelling & { suggestions: string[] };

// Ignored for this session (until the page is reloaded), in every document.
const sessionIgnored = new Set<string>();

// Checks the whole document again, e.g. after the plan or editable changed.
export function refreshSpelling(view: EditorView) {
  view.dispatch(
    view.state.tr.setMeta(spellCheckKey, { type: "refresh" } satisfies Meta),
  );
}

export function closeSpellingMenu(view: EditorView) {
  view.dispatch(
    view.state.tr.setMeta(spellCheckKey, { type: "close" } satisfies Meta),
  );
}

// One transaction, so one undo step; the new word keeps the marks of the
// old one's first letter, and the cursor goes after it.
export function replaceMisspelling(
  view: EditorView,
  { from, to }: { from: number; to: number },
  text: string,
) {
  const { state } = view;
  const marks = state.doc.nodeAt(from)?.marks ?? [];
  const tr = state.tr.replaceWith(from, to, state.schema.text(text, marks));
  tr.setSelection(TextSelection.create(tr.doc, from + text.length));
  view.dispatch(tr.setMeta(spellCheckKey, { type: "close" } satisfies Meta));
}

// Clears every underline of the word, whatever its case.
export function ignoreMisspelling(view: EditorView, word: string) {
  view.dispatch(
    view.state.tr.setMeta(spellCheckKey, {
      type: "ignore",
      word,
    } satisfies Meta),
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

function apply(
  tr: Transaction,
  value: State,
  state: EditorState,
  ignored: Set<string>,
): State {
  const meta = tr.getMeta(spellCheckKey) as Meta | undefined;
  let { decorations, changed, pending, open } = value;
  if (tr.docChanged) {
    decorations = decorations.map(tr.mapping, tr.doc);
    const edits = changedRanges(tr);
    for (const [from, to] of edits)
      decorations = decorations.remove(decorations.find(from, to));
    if (open) {
      const [from, to] = open;
      const mapped: Range = [tr.mapping.map(from, 1), tr.mapping.map(to, -1)];
      const edited = edits.some(([a, b]) => a <= mapped[1] && b >= mapped[0]);
      open = edited || mapped[0] >= mapped[1] ? null : mapped;
    }
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
  if (meta?.type === "open") open = meta.range;
  if (meta?.type === "close" || meta?.type === "ignore") open = null;
  if (meta?.type === "ignore") {
    const word = meta.word.toLowerCase();
    ignored.add(word);
    decorations = decorations.remove(
      decorations.find(
        undefined,
        undefined,
        (spec: { word: string }) => spec.word.toLowerCase() === word,
      ),
    );
  }
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
        meta.misspellings
          .filter((m) => !ignored.has(m.word.toLowerCase()))
          .map((m) =>
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
    pending === value.pending &&
    open === value.open
  )
    return value;
  return { decorations, changed, pending, open };
}

// The misspelling at a position (a click), if any.
function misspellingAt(state: EditorState, pos: number) {
  const { decorations } = spellCheckKey.getState(state)!;
  return target(decorations.find(pos, pos).find((d) => d.from <= pos));
}

// The misspelling at the cursor, or the next one, or else the first one.
function misspellingNear(state: EditorState) {
  const { decorations } = spellCheckKey.getState(state)!;
  const { from } = state.selection;
  const all = decorations.find().sort((a, b) => a.from - b.from);
  return target(all.find((d) => d.to >= from) ?? all[0]);
}

function target(d: Decoration | undefined): Misspelling | null {
  return d
    ? { from: d.from, to: d.to, word: (d.spec as { word: string }).word }
    : null;
}

export const SpellCheck = Extension.create<{
  enabled: () => boolean;
  client: () => SpellClient;
  ignored: Set<string>;
  onSuggest: (target: SpellTarget) => void;
}>({
  name: "spellCheck",
  addOptions() {
    return {
      enabled: () => false,
      client: sharedClient,
      ignored: sessionIgnored,
      onSuggest: () => {},
    };
  },
  addProseMirrorPlugins() {
    const { client, ignored, onSuggest } = this.options;
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
          .check(`b${id}`, text, { skip, ignore: [...ignored] })
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

    // Opens the menu once the suggestions are in, if the word is still there.
    const suggest = (view: EditorView, { from, to, word }: Misspelling) => {
      void client()
        .suggest(word)
        .then((suggestions) => {
          if (view.isDestroyed || !on()) return;
          if (misspellingAt(view.state, from)?.to !== to) return;
          view.dispatch(
            view.state.tr.setMeta(spellCheckKey, {
              type: "open",
              range: [from, to],
            } satisfies Meta),
          );
          onSuggest({ from, to, word, suggestions });
        });
    };

    return [
      new Plugin<State>({
        key: spellCheckKey,
        state: {
          init: (_, state) => ({
            decorations: DecorationSet.empty,
            changed: whole(state.doc),
            pending: new Map(),
            open: null,
          }),
          apply: (tr, value, _old, state) => apply(tr, value, state, ignored),
        },
        props: {
          decorations: (state) => {
            const value = spellCheckKey.getState(state);
            if (!on() || !value) return undefined;
            if (!value.open) return value.decorations;
            const [from, to] = value.open;
            return value.decorations.add(state.doc, [
              Decoration.inline(from, to, { class: "rt-misspelling-open" }),
            ]);
          },
          // ⌘; / Ctrl+; is ours on paid plans, even with nothing to fix, so
          // the browser's own "Check Document Now" doesn't run.
          handleKeyDown: (view, event) => {
            const mod = event.metaKey || event.ctrlKey;
            if (event.key !== ";" || !mod || event.altKey || !on())
              return false;
            event.preventDefault();
            const near = misspellingNear(view.state);
            if (near) suggest(view, near);
            return true;
          },
          handleClick: (view, pos) => {
            const at = on() && misspellingAt(view.state, pos);
            if (at) suggest(view, at);
            return false;
          },
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
