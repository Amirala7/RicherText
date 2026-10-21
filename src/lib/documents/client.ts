import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
  type Firestore,
} from "firebase/firestore";
import type { Changes } from "@/lib/editor/autosave";
import { snippetOf } from "@/lib/editor/snippet";
import type { ListedDocument } from "./list";
import { emptyContent, type DocumentJson } from "./model";

// The browser side of documents (ADR 0028): create and delete go through the
// server routes; the list and renames go straight to Firestore under rules.

export type CreateRequestResult =
  { kind: "created"; id: string } | { kind: "limit" };

export async function requestCreate(): Promise<CreateRequestResult> {
  const response = await fetch("/api/documents", { method: "POST" });
  const body: { id?: unknown; error?: unknown } = await response
    .json()
    .catch(() => ({}));
  if (response.status === 201 && typeof body.id === "string") {
    return { kind: "created", id: body.id };
  }
  if (response.status === 403 && body.error === "limit") {
    return { kind: "limit" };
  }
  throw new Error(`Creating a document failed (${response.status})`);
}

// A document that's already gone counts as deleted.
export async function requestDelete(id: string): Promise<void> {
  const response = await fetch(`/api/documents/${id}`, { method: "DELETE" });
  if (response.status !== 204 && response.status !== 404) {
    throw new Error(`Deleting a document failed (${response.status})`);
  }
}

// Newest edit first. Writes still waiting for the server time show as now.
export function watchDocuments(
  db: Firestore,
  uid: string,
  onChange: (documents: ListedDocument[]) => void,
  onError: () => void,
) {
  return onSnapshot(
    query(
      collection(db, "users", uid, "documents"),
      orderBy("updatedAt", "desc"),
    ),
    (snap) => {
      onChange(
        snap.docs.map((d) => {
          const data = d.data({ serverTimestamps: "estimate" });
          return {
            id: d.id,
            title: String(data.title ?? ""),
            createdAt: data.createdAt?.toDate() ?? new Date(),
            updatedAt: data.updatedAt?.toDate() ?? new Date(),
          };
        }),
      );
    },
    onError,
  );
}

// Whether the user's plan is paid (customers/{uid}, written by the webhook).
export function watchPaid(
  db: Firestore,
  uid: string,
  onChange: (paid: boolean) => void,
) {
  return onSnapshot(
    doc(db, "customers", uid),
    (snap) => onChange(snap.get("plan") === "paid"),
    () => {},
  );
}

export function renameDocument(
  db: Firestore,
  uid: string,
  id: string,
  title: string,
) {
  return updateDoc(doc(db, "users", uid, "documents", id), {
    title,
    updatedAt: serverTimestamp(),
  });
}

export type OpenedDocument = { title: string; doc: DocumentJson };

// The editor's copy (ADR 0028); null when the document doesn't exist. Offline
// it comes from the device cache (ADR 0029).
export async function loadDocument(
  db: Firestore,
  uid: string,
  id: string,
): Promise<OpenedDocument | null> {
  const ref = doc(db, "users", uid, "documents", id);
  const [meta, content] = await Promise.all([
    getDoc(ref),
    getDoc(doc(ref, "content", "current")),
  ]);
  if (!meta.exists()) return null;
  return {
    title: String(meta.get("title") ?? ""),
    doc: (content.get("doc") as DocumentJson | undefined) ?? emptyContent(),
  };
}

// Autosave's write: title, snippet and content in one batch, so the list
// never shows a snippet from other content. Resolves when the server has it.
export function saveDocument(
  db: Firestore,
  uid: string,
  id: string,
  changes: Changes,
) {
  const ref = doc(db, "users", uid, "documents", id);
  const batch = writeBatch(db);
  batch.update(ref, {
    ...(changes.title !== undefined && { title: changes.title }),
    ...(changes.doc && { snippet: snippetOf(changes.doc) }),
    updatedAt: serverTimestamp(),
  });
  if (changes.doc) {
    batch.set(doc(ref, "content", "current"), {
      doc: changes.doc,
      updatedAt: serverTimestamp(),
    });
  }
  return batch.commit();
}
