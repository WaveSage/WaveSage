import { REPORT_CONFIG } from "./config";
import { validateCaption } from "./caption";
import {
  classifySurfImage,
  detectImageMime,
  imageConfidenceVerdict,
  prepareReportImages,
} from "./image-classifier";
import {
  isCaptureFresh,
  resolveSubmissionLocation,
  verifySpotDistance,
} from "./location";
import {
  createReport,
  saveReportImages,
} from "./storage";
import type {
  ReportRejectResponse,
  ReportSubmitResponse,
  SubmissionInput,
} from "./types";
import type { ReportNote } from "./config";
import { getSpotById } from "@/lib/socal-spots";

function reject(
  reason_code: ReportRejectResponse["reason_code"],
  user_message: string,
  fields: string[] = []
): ReportRejectResponse {
  return { status: "rejected", reason_code, user_message, fields };
}

export async function validateAndStoreReport(
  input: SubmissionInput
): Promise<ReportSubmitResponse> {
  if (input.imageBuffer.length > REPORT_CONFIG.maxImageBytes) {
    return reject(
      "invalid_media_type",
      "Only photos are allowed. Please submit a photo (no video).",
      ["image_file"]
    );
  }

  const detectedMime = detectImageMime(input.imageBuffer);
  if (
    !detectedMime ||
    (input.mimeType !== "image/jpeg" &&
      input.mimeType !== "image/png" &&
      input.mimeType !== detectedMime)
  ) {
    return reject(
      "invalid_media_type",
      "Only photos are allowed. Please submit a photo (no video).",
      ["image_file"]
    );
  }

  const captionResult = validateCaption(input.caption);
  if (!captionResult.ok) {
    const reason =
      captionResult.field === "caption" && captionResult.error?.includes("140")
        ? "caption_too_long"
        : captionResult.error?.includes("explicit")
          ? "caption_profanity"
          : "caption_format";
    return reject(reason, captionResult.error ?? "Invalid caption.", ["caption"]);
  }

  const spot = getSpotById(input.spotId);
  if (!spot) {
    return reject(
      "location_out_of_range",
      "Unknown spot. Choose a spot from the list.",
      ["spot_id"]
    );
  }

  const location = resolveSubmissionLocation({
    deviceLat: input.deviceLat,
    deviceLon: input.deviceLon,
    deviceTs: input.deviceTs,
    exifLat: input.exifLat,
    exifLon: input.exifLon,
    exifCaptureTime: input.exifCaptureTime,
    submissionTimestampUtc: input.submissionTimestampUtc,
  });

  if ("error" in location) {
    return reject("location_missing", location.error, [
      "device_location",
      "image_exif",
    ]);
  }

  if (
    !isCaptureFresh(location.captureTimeUtc, input.submissionTimestampUtc)
  ) {
    return reject(
      "timestamp_old",
      "Please submit a recent photo taken within the last 24 hours.",
      ["capture_time"]
    );
  }

  const distanceCheck = verifySpotDistance(
    input.spotId,
    location.latitude,
    location.longitude
  );

  if (!distanceCheck.ok) {
    return reject(
      "location_out_of_range",
      `Location not within 2 miles of ${distanceCheck.spotName}. Please enable location services and retake the photo at the break.`,
      ["device_location", "claimed_spot_id"]
    );
  }

  const classification = await classifySurfImage(input.imageBuffer);
  const verdict = imageConfidenceVerdict(classification.confidence);

  if (
    !verdict.accept ||
    classification.rejectedReason === "close_up_people"
  ) {
    return reject(
      "image_not_waves",
      "Photo does not show the waves at the break. Please retake the photo focusing on the surf.",
      ["image_file"]
    );
  }

  const notes: ReportNote[] = [];
  if (verdict.lowConfidence) notes.push("low_image_confidence");
  if (location.gpsMismatch) notes.push("gps_mismatch");
  if (location.locationFromExif) notes.push("location_from_exif");

  const { full, thumbnail } = await prepareReportImages(input.imageBuffer);
  const reportId =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `report-${Date.now()}`;
  const { imageFileName, thumbnailFileName } = await saveReportImages(
    reportId,
    full,
    thumbnail
  );

  const report = await createReport({
    id: reportId,
    userId: input.userId,
    username: input.username,
    spotId: input.spotId,
    spotName: spot.name,
    normalizedCaption: captionResult.normalized,
    imageFileName,
    thumbnailFileName,
    imageContentConfidence: classification.confidence,
    distanceToSpotMiles: distanceCheck.distanceMiles,
    captureTimeUtc: location.captureTimeUtc,
    submissionTimeUtc: input.submissionTimestampUtc,
    imageMetadata: {
      gpsUsed: location.gpsUsed,
      latitude: location.latitude,
      longitude: location.longitude,
      captureTimeUtc: location.captureTimeUtc,
    },
    notes,
    deleted: false,
    moderationHidden: false,
  });

  return {
    status: "accepted",
    report_id: report.id,
    spot_id: report.spotId,
    normalized_caption: report.normalizedCaption,
    image_metadata: {
      gps_used: report.imageMetadata.gpsUsed,
      latitude: report.imageMetadata.latitude,
      longitude: report.imageMetadata.longitude,
      capture_time_utc: report.imageMetadata.captureTimeUtc,
    },
    distance_to_spot_miles: report.distanceToSpotMiles,
    image_content_confidence: report.imageContentConfidence,
    notes: report.notes,
    gallery_url: "/user-reports/",
  };
}
