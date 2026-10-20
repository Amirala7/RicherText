import type { Metadata } from "next";
import { EmptyState } from "@/components/molecules/empty-state";

export const metadata: Metadata = { title: "Documents · RicherText" };

// The new-account state (ADR 0024); the list and New document come in Phase 4.
export default function DocumentsPage() {
  return (
    <main className="mx-auto grid w-full max-w-[808px] min-w-0 gap-5 px-6 py-7 max-sm:gap-4 max-sm:p-5">
      <h1 className="m-0 text-xl">Documents</h1>
      <EmptyState
        title="No documents yet"
        line="Your documents will appear here."
      />
    </main>
  );
}
