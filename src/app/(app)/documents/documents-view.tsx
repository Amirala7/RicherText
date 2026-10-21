"use client";

import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Toast } from "@/components/atoms/toast";
import { DocumentList } from "@/components/organisms/document-list";
import {
  renameDocument,
  requestCreate,
  requestDelete,
  watchDocuments,
  watchPaid,
} from "@/lib/documents/client";
import { editableIds, type ListedDocument } from "@/lib/documents/list";
import { getClientAuth, getClientDb } from "@/lib/firebase/client";

const TOAST_MS = 5000;

type Toasted = { text: string; tone: "neutral" | "error"; at: number };

// The documents page (ADR 0024, 0028): a live list from Firestore; New and
// Delete go through the server routes. A Free user who already has a document
// goes to the plans page (user, 2026-10-21).
export function DocumentsView() {
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null);
  const [documents, setDocuments] = useState<ListedDocument[] | null>(null);
  const [paid, setPaid] = useState(false);
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState<Toasted | null>(null);
  const [now, setNow] = useState(() => new Date());

  const say = (text: string, tone: Toasted["tone"] = "neutral") =>
    setToast({ text, tone, at: Date.now() });

  useEffect(() => {
    let stop = () => {};
    const stopAuth = onAuthStateChanged(getClientAuth(), (user) => {
      stop();
      setUid(user?.uid ?? null);
      if (!user) return;
      const db = getClientDb();
      const stopDocs = watchDocuments(db, user.uid, setDocuments, () =>
        say("Couldn't load your documents. Reload to try again.", "error"),
      );
      const stopPaid = watchPaid(db, user.uid, setPaid);
      stop = () => {
        stopDocs();
        stopPaid();
      };
    });
    return () => {
      stopAuth();
      stop();
    };
  }, []);

  // Deleted from the editor's document menu: say so here, once.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("deleted") !== "1")
      return;
    router.replace("/documents");
    const timer = setTimeout(() => say("Document deleted"));
    return () => clearTimeout(timer);
  }, [router]);

  // Next keeps this page's state when you leave it (React Activity) and runs
  // effect clean-ups on the way out, so New isn't still busy when you return.
  useEffect(() => () => setCreating(false), []);

  // Keeps "Edited 2 min ago" current.
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  const editable = useMemo(
    () => editableIds(documents ?? [], paid),
    [documents, paid],
  );

  async function create() {
    setCreating(true);
    try {
      const result = await requestCreate();
      router.push(
        result.kind === "created" ? `/documents/${result.id}` : "/plans",
      );
    } catch {
      setCreating(false);
      say("Couldn't create a document. Try again.", "error");
    }
  }

  async function rename(id: string, title: string) {
    if (!uid) return;
    try {
      await renameDocument(getClientDb(), uid, id, title);
    } catch {
      say("Couldn't rename the document. Try again.", "error");
    }
  }

  async function remove(id: string) {
    try {
      await requestDelete(id);
      say("Document deleted");
    } catch {
      say("Couldn't delete the document. Try again.", "error");
    }
  }

  return (
    <main className="mx-auto grid w-full max-w-[808px] min-w-0 gap-5 px-6 py-7 max-sm:gap-4 max-sm:p-5">
      <DocumentList
        documents={documents}
        editable={editable}
        now={now}
        creating={creating}
        onCreate={create}
        onRename={rename}
        onDelete={remove}
      />
      {toast && (
        <Toast key={toast.at} tone={toast.tone}>
          {toast.text}
        </Toast>
      )}
    </main>
  );
}
