import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { emptyContent } from "./model";

// Creating and deleting documents happens only here, on the server (ADR 0028):
// rules can't count documents, so the Free limit of one at a time (ADR 0020)
// is checked in a transaction. Both also keep users/{uid}.newestDocId, which
// the rules use to keep the newest document editable after a downgrade.

export type CreateResult = { kind: "created"; id: string } | { kind: "limit" };
export type DeleteResult = { kind: "deleted" } | { kind: "not-found" };

export async function createDocument(
  { uid }: { uid: string },
  { db }: { db: Firestore },
): Promise<CreateResult> {
  const user = db.doc(`users/${uid}`);
  const documents = db.collection(`users/${uid}/documents`);

  return db.runTransaction(async (tx) => {
    // Reading users/{uid} makes simultaneous creates conflict and retry.
    const [customer, , existing] = await Promise.all([
      tx.get(db.doc(`customers/${uid}`)),
      tx.get(user),
      tx.get(documents.limit(1)),
    ]);
    if (customer.get("plan") !== "paid" && !existing.empty) {
      return { kind: "limit" } as const;
    }

    const ref = documents.doc();
    const now = FieldValue.serverTimestamp();
    tx.create(ref, { title: "", snippet: "", createdAt: now, updatedAt: now });
    tx.create(ref.collection("content").doc("current"), {
      doc: emptyContent(),
      updatedAt: now,
    });
    tx.set(user, { newestDocId: ref.id }, { merge: true });
    return { kind: "created", id: ref.id } as const;
  });
}

export async function deleteDocument(
  { uid, id }: { uid: string; id: string },
  { db }: { db: Firestore },
): Promise<DeleteResult> {
  const user = db.doc(`users/${uid}`);
  const documents = db.collection(`users/${uid}/documents`);
  const ref = documents.doc(id);

  return db.runTransaction(async (tx) => {
    const [doc, userSnap, newestTwo] = await Promise.all([
      tx.get(ref),
      tx.get(user),
      tx.get(documents.orderBy("createdAt", "desc").limit(2)),
    ]);
    if (!doc.exists) return { kind: "not-found" } as const;

    tx.delete(ref.collection("content").doc("current"));
    tx.delete(ref);
    if (userSnap.get("newestDocId") === id) {
      const next = newestTwo.docs.find((d) => d.id !== id);
      tx.set(user, { newestDocId: next?.id ?? null }, { merge: true });
    }
    return { kind: "deleted" } as const;
  });
}
