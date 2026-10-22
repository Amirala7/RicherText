"use client";

import { onAuthStateChanged } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Toast } from "@/components/atoms/toast";
import { WritingLoader } from "@/components/atoms/writing-loader";
import { buttonVariants } from "@/components/atoms/button";
import { EmptyState } from "@/components/molecules/empty-state";
import { DocumentEditor } from "@/components/organisms/document-editor";
import { PageBar } from "@/components/organisms/page-bar";
import { AccountMenu } from "@/components/organisms/account-menu";
import {
  loadDocument,
  requestDelete,
  saveDocument,
  watchDocuments,
  watchPaid,
  type OpenedDocument,
} from "@/lib/documents/client";
import { editableIds, type ListedDocument } from "@/lib/documents/list";
import { displayTitle } from "@/lib/documents/model";
import { createAutosave, type SaveState } from "@/lib/editor/autosave";
import { getClientAuth, getClientDb } from "@/lib/firebase/client";

type Opened = OpenedDocument | "missing" | "failed" | null;

// The editor page (ADR 0024, 0028, 0029): loads the document (from the device
// cache when offline), works out whether it's editable the same way the list
// does, and autosaves title and content straight to Firestore.
export function EditorView({
  id,
  email,
}: {
  id: string;
  email: string | null;
}) {
  const [uid, setUid] = useState<string | null>(null);
  const [opened, setOpened] = useState<Opened>(null);
  const [documents, setDocuments] = useState<ListedDocument[] | null>(null);
  // Unknown until the plan arrives; the editor waits for it, since the Free
  // plan's markdown shortcuts are set when it's made (ADR 0035).
  const [paid, setPaid] = useState<boolean | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [deleteFailed, setDeleteFailed] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    let stop = () => {};
    const stopAuth = onAuthStateChanged(getClientAuth(), (user) => {
      stop();
      setUid(user?.uid ?? null);
      if (!user) return;
      const db = getClientDb();
      let live = true;
      loadDocument(db, user.uid, id).then(
        (loaded) => live && setOpened(loaded ?? "missing"),
        () => live && setOpened("failed"),
      );
      const stopDocs = watchDocuments(db, user.uid, setDocuments, () => {});
      const stopPaid = watchPaid(db, user.uid, setPaid);
      stop = () => {
        live = false;
        stopDocs();
        stopPaid();
      };
    });
    return () => {
      stopAuth();
      stop();
      // Next keeps this page alive when you leave it (React Activity) and
      // runs these clean-ups; Tiptap's editor is rebuilt on return. Drop the
      // copy loaded on the first visit, so the return loads the latest one
      // (with unsent edits, from the device cache) instead of showing stale
      // text that the next keystroke would save over.
      setOpened(null);
    };
  }, [id]);

  const autosave = useMemo(
    () =>
      uid
        ? createAutosave(
            (changes) => saveDocument(getClientDb(), uid, id, changes),
            setSaveState,
          )
        : null,
    [uid, id],
  );

  // Leaving or hiding the page writes what's waiting into the device cache,
  // which sends it on the next visit if the server didn't get it (ADR 0029).
  useEffect(() => {
    if (!autosave) return;
    const flush = () => autosave.flush();
    const hidden = () => document.visibilityState === "hidden" && flush();
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", hidden);
      autosave.dispose();
    };
  }, [autosave]);

  const showTitle = (next: string) => {
    document.title = `${displayTitle(next)} · RicherText`;
  };
  useEffect(() => {
    if (opened && typeof opened === "object") showTitle(opened.title);
  }, [opened]);

  useEffect(() => {
    if (deleteFailed === null) return;
    const timer = setTimeout(() => setDeleteFailed(null), 5000);
    return () => clearTimeout(timer);
  }, [deleteFailed]);

  // Edits still waiting are sent first, so none lands after the delete; the
  // list then says "Document deleted".
  async function remove() {
    autosave?.dispose();
    try {
      await requestDelete(id);
      router.replace("/documents?deleted=1");
    } catch {
      setDeleteFailed(Date.now());
    }
  }

  const editable = useMemo(
    () =>
      documents && paid !== null ? editableIds(documents, paid).has(id) : false,
    [documents, paid, id],
  );

  if (opened === "missing" || opened === "failed") {
    return (
      <div className="flex min-h-dvh flex-col">
        <PageBar>
          <AccountMenu email={email} />
        </PageBar>
        <main className="mx-auto grid w-full max-w-[808px] flex-1 content-center px-6 py-7 max-sm:p-5">
          <EmptyState
            title={
              opened === "missing"
                ? "Document not found"
                : "Couldn't open the document"
            }
            line={
              opened === "missing"
                ? "It may have been deleted."
                : "Check your connection, then reload the page."
            }
            action={
              <Link
                href="/documents"
                className={buttonVariants({ variant: "secondary" })}
              >
                Back to documents
              </Link>
            }
          />
        </main>
      </div>
    );
  }

  if (!opened || !documents || paid === null || !autosave) {
    return (
      <main
        aria-busy="true"
        aria-label="Opening document"
        className="grid min-h-dvh place-items-center"
      >
        <WritingLoader />
      </main>
    );
  }

  return (
    <>
      <DocumentEditor
        title={opened.title}
        doc={opened.doc}
        editable={editable}
        paid={paid}
        font={opened.font}
        saveState={saveState}
        email={email}
        onTitle={(next) => {
          showTitle(next);
          autosave.change({ title: next });
        }}
        onDoc={(doc) => autosave.change({ doc })}
        onFont={(font) => autosave.change({ font })}
        onRetry={() => autosave.retry()}
        onDelete={remove}
        onUpgrade={() => router.push("/plans")}
      />
      {deleteFailed !== null && (
        <Toast key={deleteFailed} tone="error">
          {"Couldn't delete the document. Try again."}
        </Toast>
      )}
    </>
  );
}
