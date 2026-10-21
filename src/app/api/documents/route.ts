import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { isSameOrigin } from "@/lib/auth/origin";
import { createDocument } from "@/lib/documents/core";
import { getAdminDb } from "@/lib/firebase/admin";

// POST → 201 { id } for a new, untitled document; 403 { error: "limit" } when
// a Free user already has one (ADR 0020, 0028).
export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "signed out" }, { status: 401 });
  }

  try {
    const result = await createDocument(
      { uid: user.uid },
      { db: getAdminDb() },
    );
    if (result.kind === "limit") {
      return NextResponse.json({ error: "limit" }, { status: 403 });
    }
    return NextResponse.json({ id: result.id }, { status: 201 });
  } catch {
    // Nothing logged: the error can carry the user's details (ADR 0026).
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
