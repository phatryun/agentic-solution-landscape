import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db/client";

export async function PUT(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN" && session.user.role !== "EDITOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const submission = await db.submission.findUnique({ where: { id: params.id } });
  if (!submission) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.submission.update({
    where: { id: params.id },
    data: { status: "REJECTED", reviewedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
