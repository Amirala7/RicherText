import { Extension, Mark } from "@tiptap/core";
import { DOMSerializer, type Mark as PmMark } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";

// Text size and colour (ADR 0031): marks with a fixed set of values, saved
// in the document as data attributes and shown through the tc-* tokens, so
// each colour has its light and dark shade. Only RicherText's own spans are
// read back; other apps' sizes and colours are dropped on paste.
export const TEXT_SIZES = [
  { id: "small", label: "Small", em: "0.9375em" },
  { id: "large", label: "Large", em: "1.125em" },
] as const;

export const TEXT_COLOURS = [
  { id: "grey", label: "Grey", light: "#696871" },
  { id: "red", label: "Red", light: "#C22826" },
  { id: "orange", label: "Orange", light: "#B75400" },
  { id: "green", label: "Green", light: "#1D7D3E" },
  { id: "blue", label: "Blue", light: "#1467C2" },
  { id: "violet", label: "Violet", light: "#6440D8" },
] as const;

export type TextSize = (typeof TEXT_SIZES)[number]["id"];
export type TextColour = (typeof TEXT_COLOURS)[number]["id"];

function valueMark(
  name: string,
  attr: "size" | "color",
  allowed: readonly string[],
) {
  const data = `data-${attr}`;
  return Mark.create({
    name,
    addAttributes() {
      return {
        [attr]: {
          default: null,
          parseHTML: (el) => el.getAttribute(data),
          renderHTML: (attrs) => ({ [data]: attrs[attr] }),
        },
      };
    },
    parseHTML() {
      return [
        {
          tag: `span[${data}]`,
          // One span can carry both size and colour.
          consuming: false,
          getAttrs: (el) =>
            allowed.includes(el.getAttribute(data) ?? "") ? null : false,
        },
      ];
    },
    renderHTML({ HTMLAttributes }) {
      return ["span", HTMLAttributes, 0];
    },
  });
}

export const TextSizeMark = valueMark(
  "textSize",
  "size",
  TEXT_SIZES.map((s) => s.id),
);
export const TextColorMark = valueMark(
  "textColor",
  "color",
  TEXT_COLOURS.map((c) => c.id),
);

// Copied HTML also carries the light shade and the size as inline styles, so
// email, Docs and Word show them; pasting back reads the data attributes.
export const TextStyleClipboard = Extension.create({
  name: "textStyleClipboard",
  addProseMirrorPlugins() {
    const base = DOMSerializer.fromSchema(this.editor.schema);
    const serializer = new DOMSerializer(base.nodes, {
      ...base.marks,
      textSize: (mark: PmMark) => {
        const size = TEXT_SIZES.find((s) => s.id === mark.attrs.size);
        return [
          "span",
          { "data-size": mark.attrs.size, style: `font-size:${size?.em}` },
          0,
        ];
      },
      textColor: (mark: PmMark) => {
        const colour = TEXT_COLOURS.find((c) => c.id === mark.attrs.color);
        return [
          "span",
          { "data-color": mark.attrs.color, style: `color:${colour?.light}` },
          0,
        ];
      },
    });
    return [
      new Plugin({
        key: new PluginKey("textStyleClipboard"),
        props: { clipboardSerializer: serializer },
      }),
    ];
  },
});
