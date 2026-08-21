import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { findUserById } from "@/lib/auth/users";
import { REPORT_CONFIG } from "@/lib/reports/config";
import { listReports, toGalleryItem } from "@/lib/reports/storage";
import { selectReportForConditions } from "@/lib/reports/selection";
import { validateAndStoreReport } from "@/lib/reports/validate-submission";

export async function GET(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const url = new URL(request.url);
  const spotId = url.searchParams.get("spot_id") ?? undefined;
  const recentHours = Number(url.searchParams.get("recent_hours") ?? 24 * 7);
  const forConditions = url.searchParams.get("for_conditions") === "1";

  const reports = await listReports({
    spotId,
    recentHours: Number.isFinite(recentHours) ? recentHours : 24 * 7,
  });

  if (forConditions && spotId) {
    const selected = selectReportForConditions(
      reports,
      spotId,
      REPORT_CONFIG.freshnessHours
    );
    return NextResponse.json({
      selected: selected ? toGalleryItem(selected, userId) : null,
    });
  }

  return NextResponse.json({
    reports: reports.map((r) => toGalleryItem(r, userId)),
  });
}

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const user = await findUserById(userId);
  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const form = await request.formData();
  const imageFile = form.get("image_file");

  if (!imageFile || !(imageFile instanceof File)) {
    return NextResponse.json(
      {
        status: "rejected",
        reason_code: "invalid_media_type",
        user_message:
          "Only photos are allowed. Please submit a photo (no video).",
        fields: ["image_file"],
      },
      { status: 400 }
    );
  }

  const deviceLat = Number(form.get("device_lat"));
  const deviceLon = Number(form.get("device_lon"));
  const exifLat = Number(form.get("exif_lat"));
  const exifLon = Number(form.get("exif_lon"));

  const result = await validateAndStoreReport({
    imageBuffer: Buffer.from(await imageFile.arrayBuffer()),
    mimeType: imageFile.type,
    caption: String(form.get("caption") ?? ""),
    spotId: String(form.get("spot_id") ?? ""),
    userId,
    username: user.username,
    submissionTimestampUtc: new Date().toISOString(),
    deviceLat: Number.isFinite(deviceLat) ? deviceLat : undefined,
    deviceLon: Number.isFinite(deviceLon) ? deviceLon : undefined,
    deviceTs: String(form.get("device_ts") ?? "") || undefined,
    exifLat: Number.isFinite(exifLat) ? exifLat : undefined,
    exifLon: Number.isFinite(exifLon) ? exifLon : undefined,
    exifCaptureTime: String(form.get("exif_capture_time") ?? "") || undefined,
  });

  if (result.status === "rejected") {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json(result);
}
