// Writing font (ADR 0010, 0032): each document's body font, Geist by default,
// saved with the document's title (users/{uid}/documents/{id}.font) and
// picked in the editor toolbar. Not part of the content, so copy and paste
// are unaffected.
export const WRITING_FONTS = [
  { id: "geist", label: "Geist" },
  { id: "plex-serif", label: "IBM Plex Serif" },
] as const;

export type WritingFont = (typeof WRITING_FONTS)[number]["id"];

export function writingFont(value: unknown): WritingFont {
  return WRITING_FONTS.find((f) => f.id === value)?.id ?? "geist";
}

export function fontLabel(font: WritingFont): string {
  return WRITING_FONTS.find((f) => f.id === font)!.label;
}
