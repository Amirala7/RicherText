import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  type Firestore,
} from "firebase/firestore";
import type { ListedDocument } from "./list";

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
