import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { softDeleteReport } from "@/lib/reports/storage";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await context.params;
  const deleted = await softDeleteReport(id, userId);

  if (!deleted) {
    return NextResponse.json({ error: "Report not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
