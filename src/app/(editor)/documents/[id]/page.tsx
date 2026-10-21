import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { isValidDocId } from "@/lib/documents/model";
import { EditorView } from "./editor-view";

export const metadata: Metadata = { title: "Document · RicherText" };

export default async function DocumentPage({
  params,
}: PageProps<"/documents/[id]">) {
  const { id } = await params;
  if (!isValidDocId(id)) notFound();
  const user = await requireUser();
  return <EditorView id={id} email={user.email} />;
}
