import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { isSameOrigin } from "@/lib/auth/origin";
import { deleteDocument } from "@/lib/documents/core";
import { isValidDocId } from "@/lib/documents/model";
import { getAdminDb } from "@/lib/firebase/admin";

// DELETE → 204, or 404 when the signed-in user has no such document (ADR 0028).
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "signed out" }, { status: 401 });
  }
  const { id } = await params;
  if (!isValidDocId(id)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  try {
    const result = await deleteDocument(
      { uid: user.uid, id },
      { db: getAdminDb() },
    );
    if (result.kind === "not-found") {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    return new NextResponse(null, { status: 204 });
  } catch {
    // Nothing logged: the error can carry the user's details (ADR 0026).
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
