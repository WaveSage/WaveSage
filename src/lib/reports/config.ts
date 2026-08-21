export const REPORT_CONFIG = {
  distanceThresholdMiles: 2,
  distanceThresholdKm: 3.2187,
  gpsMismatchMiles: 0.5,
  gpsTimestampToleranceMs: 2 * 60 * 1000,
  freshnessHours: 24,
  captionMaxLength: 140,
  confidenceAccept: 0.6,
  confidenceLow: 0.4,
  maxImageBytes: 8 * 1024 * 1024,
} as const;

export type ReportReasonCode =
  | "location_out_of_range"
  | "location_missing"
  | "invalid_media_type"
  | "image_not_waves"
  | "caption_too_long"
  | "caption_profanity"
  | "caption_format"
  | "timestamp_old"
  | "multiple_images";

export type ReportNote =
  | "low_image_confidence"
  | "gps_mismatch"
  | "location_from_exif";
