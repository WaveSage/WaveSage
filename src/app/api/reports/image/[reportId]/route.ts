import { NextResponse } from "next/server";
import { readReportImage } from "@/lib/reports/storage";

export async function GET(
  request: Request,
  context: { params: Promise<{ reportId: string }> }
) {
  // Images for accepted reports are readable by guests (Trestles preview gallery).
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
      "Cache-Control": "public, max-age=3600",
    },
  });
}
