import { doc, onSnapshot, setDoc, type Firestore } from "firebase/firestore";

// Writing font (ADR 0010, 0031): a per-user display setting in
// users/{uid}/settings/writing, Geist by default. It only changes how the
// body text looks to this user; documents never store it.
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

const settings = (db: Firestore, uid: string) =>
  doc(db, "users", uid, "settings", "writing");

export function watchWritingFont(
  db: Firestore,
  uid: string,
  onChange: (font: WritingFont) => void,
) {
  return onSnapshot(
    settings(db, uid),
    (snap) => onChange(writingFont(snap.get("font"))),
    () => {},
  );
}

export function saveWritingFont(db: Firestore, uid: string, font: WritingFont) {
  return setDoc(settings(db, uid), { font });
}
