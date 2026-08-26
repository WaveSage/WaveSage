import { NextResponse } from "next/server";
import { getGuestSpot, GUEST_SPOT_ID } from "@/lib/auth/guest";
import { getSessionUserId } from "@/lib/auth/session";
import { findUserById } from "@/lib/auth/users";
import { REPORT_CONFIG } from "@/lib/reports/config";
import { listReports, toGalleryItem } from "@/lib/reports/storage";
import { selectReportForConditions } from "@/lib/reports/selection";

export async function GET(request: Request) {
  try {
  const userId = await getSessionUserId();

  const url = new URL(request.url);
  let spotId = url.searchParams.get("spot_id") ?? undefined;
  const recentHours = Number(url.searchParams.get("recent_hours") ?? 24 * 7);
  const forConditions = url.searchParams.get("for_conditions") === "1";

  if (!userId) {
    // Guests may only browse Lower Trestles reports.
    spotId = GUEST_SPOT_ID;
  }

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
    guest: !userId,
    spotId: spotId ?? null,
    spotName: !userId ? getGuestSpot().name : null,
  });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not load reports.";
    return NextResponse.json({ error: message, reports: [] }, { status: 500 });
  }
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

  const { validateAndStoreReport } = await import(
    "@/lib/reports/validate-submission"
  );
  const {
    parseCrowd,
    parseSurface,
    parseTags,
    parseWaveQuality,
    parseWaveSize,
    formatStructuredSummary,
  } = await import("@/lib/reports/structured");

  const waveQuality = parseWaveQuality(String(form.get("wave_quality") ?? ""));
  const waveSize = parseWaveSize(String(form.get("wave_size") ?? ""));
  const surface = parseSurface(String(form.get("surface") ?? ""));
  const crowd = parseCrowd(String(form.get("crowd") ?? ""));
  const tags = parseTags(String(form.get("tags") ?? ""));
  const comment = String(form.get("caption") ?? "");
  const caption =
    waveQuality && waveSize && surface && crowd
      ? formatStructuredSummary(
          { waveQuality, waveSize, surface, crowd, tags },
          comment
        )
      : comment;

  const result = await validateAndStoreReport({
    imageBuffer: Buffer.from(await imageFile.arrayBuffer()),
    mimeType: imageFile.type,
    caption,
    waveQuality: waveQuality ?? undefined,
    waveSize: waveSize ?? undefined,
    surface: surface ?? undefined,
    crowd: crowd ?? undefined,
    tags,
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
