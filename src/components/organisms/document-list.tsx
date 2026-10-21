"use client";

import { Lock, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/atoms/button";
import { Loader } from "@/components/atoms/loader";
import { DocumentRow } from "@/components/molecules/document-row";
import { EmptyState } from "@/components/molecules/empty-state";
import { FilterField } from "@/components/molecules/filter-field";
import { Notice } from "@/components/molecules/notice";
import { ConfirmDialog } from "@/components/organisms/dialog";
import { filterDocuments, type ListedDocument } from "@/lib/documents/list";
import { displayTitle } from "@/lib/documents/model";

// Document list organism (ADR 0016, 0024): title · filter + New · rows.
// Loading holds the space of four rows; delete asks in a dialog first. When a
// plan has ended (ADR 0020), a notice with Resubscribe sits above the rows.
// `documents` is null while loading.
export function DocumentList({
  documents,
  editable,
  now,
  creating,
  onCreate,
  onRename,
  onDelete,
}: {
  documents: ListedDocument[] | null;
  editable: Set<string>;
  now: Date;
  creating: boolean;
  onCreate: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}) {
  const [filter, setFilter] = useState("");
  const [deleting, setDeleting] = useState<ListedDocument | null>(null);
  const shown = documents ? filterDocuments(documents, filter) : [];
  const planEnded = documents?.some((d) => !editable.has(d.id)) ?? false;

  return (
    <>
      <h1 className="m-0 text-xl">Documents</h1>
      {documents === null ? (
        <div
          role="status"
          aria-label="Loading documents"
          className="grid h-[179px] place-items-center rounded-lg border border-border text-muted-foreground"
        >
          <Loader size="sm" />
        </div>
      ) : documents.length === 0 ? (
        <EmptyState
          title="No documents yet"
          line="Your documents will appear here."
          action={
            <Button loading={creating} onClick={onCreate}>
              New document
            </Button>
          }
        />
      ) : (
        <>
          <div className="flex min-w-0 items-center gap-3">
            <FilterField
              aria-label="Filter documents"
              placeholder="Filter"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="flex-auto"
            />
            <Button size="sm" loading={creating} onClick={onCreate}>
              <Plus className="size-4" strokeWidth={1.75} aria-hidden="true" />
              New
            </Button>
          </div>
          {planEnded && (
            <Notice
              icon={<Lock strokeWidth={1.75} aria-hidden="true" />}
              action={
                <Link
                  href="/plans"
                  className={buttonVariants({
                    variant: "secondary",
                    size: "sm",
                  })}
                >
                  Resubscribe
                </Link>
              }
            >
              Your plan has ended. Your newest document stays editable; the
              others are read-only.
            </Notice>
          )}
          {shown.length === 0 ? (
            <EmptyState
              title="No matches"
              line={`No document titles match “${filter.trim()}”.`}
            />
          ) : (
            <ul className="@container m-0 grid min-w-0 list-none overflow-hidden rounded-lg border border-border p-0 [&>*+*]:border-t [&>*+*]:border-border">
              {shown.map((d) => (
                <DocumentRow
                  key={d.id}
                  document={d}
                  editable={editable.has(d.id)}
                  now={now}
                  onRename={(title) => onRename(d.id, title)}
                  onDelete={() => setDeleting(d)}
                />
              ))}
            </ul>
          )}
        </>
      )}
      <ConfirmDialog
        open={deleting !== null}
        title={`Delete “${deleting ? displayTitle(deleting.title) : ""}”?`}
        line="This can't be undone."
        action="Delete"
        danger
        onConfirm={() => deleting && onDelete(deleting.id)}
        onOpenChange={(open) => !open && setDeleting(null)}
      />
    </>
  );
}
