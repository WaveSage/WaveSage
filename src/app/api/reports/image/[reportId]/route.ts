import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { readReportImage } from "@/lib/reports/storage";

export async function GET(
  request: Request,
  context: { params: Promise<{ reportId: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { reportId } = await context.params;
  const url = new URL(request.url);
  const thumb = url.searchParams.get("thumb") === "1";

  const buffer = await readReportImage(reportId, thumb ? "thumb" : "full");
  if (!buffer) {
    return NextResponse.json({ error: "Image not found." }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
