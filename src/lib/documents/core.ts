import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { emptyContent } from "./model";

// Creating and deleting documents happens only here, on the server (ADR 0028):
// rules can't count documents, so the Free limit of one at a time (ADR 0020)
// is checked in a transaction. users/{uid} keeps the count and newestDocId,
// which the rules use to keep the newest document editable after a downgrade.
// Transactions read only single records: a query inside one makes the
// emulator serialise every user's transactions.

export type CreateResult = { kind: "created"; id: string } | { kind: "limit" };
export type DeleteResult = { kind: "deleted" } | { kind: "not-found" };

export async function createDocument(
  { uid }: { uid: string },
  { db }: { db: Firestore },
): Promise<CreateResult> {
  const user = db.doc(`users/${uid}`);
  const documents = db.collection(`users/${uid}/documents`);

  return db.runTransaction(async (tx) => {
    // Every create and delete writes users/{uid}, so simultaneous ones
    // conflict here and retry.
    const [customer, userSnap] = await Promise.all([
      tx.get(db.doc(`customers/${uid}`)),
      tx.get(user),
    ]);
    const count = Number(userSnap.get("documentCount") ?? 0);
    if (customer.get("plan") !== "paid" && count >= 1) {
      return { kind: "limit" } as const;
    }

    const ref = documents.doc();
    const now = FieldValue.serverTimestamp();
    tx.create(ref, { title: "", snippet: "", createdAt: now, updatedAt: now });
    tx.create(ref.collection("content").doc("current"), {
      doc: emptyContent(),
      updatedAt: now,
    });
    tx.set(
      user,
      { newestDocId: ref.id, documentCount: count + 1 },
      { merge: true },
    );
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
    const [doc, userSnap] = await Promise.all([tx.get(ref), tx.get(user)]);
    if (!doc.exists) return { kind: "not-found" } as const;

    let newestDocId = userSnap.get("newestDocId") ?? null;
    if (newestDocId === id) {
      // Read outside the transaction's locks; a create or delete racing this
      // one also writes users/{uid}, which makes this transaction retry.
      const newestTwo = await documents
        .orderBy("createdAt", "desc")
        .limit(2)
        .get();
      newestDocId = newestTwo.docs.find((d) => d.id !== id)?.id ?? null;
    }

    tx.delete(ref.collection("content").doc("current"));
    tx.delete(ref);
    tx.set(
      user,
      {
        newestDocId,
        documentCount: Math.max(
          0,
          Number(userSnap.get("documentCount") ?? 1) - 1,
        ),
      },
      { merge: true },
    );
    return { kind: "deleted" } as const;
  });
}
