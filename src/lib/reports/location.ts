import { REPORT_CONFIG } from "./config";
import type { GpsSource } from "./types";
import { getSpotById } from "@/lib/socal-spots";

const EARTH_RADIUS_KM = 6371;

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function kmToMiles(km: number): number {
  return Math.round(km * 0.621371 * 100) / 100;
}

export interface ResolvedLocation {
  latitude: number;
  longitude: number;
  captureTimeUtc: string;
  gpsUsed: GpsSource;
  gpsMismatch: boolean;
  locationFromExif: boolean;
}

export function resolveSubmissionLocation(input: {
  deviceLat?: number;
  deviceLon?: number;
  deviceTs?: string;
  exifLat?: number;
  exifLon?: number;
  exifCaptureTime?: string;
  submissionTimestampUtc: string;
}): ResolvedLocation | { error: string } {
  const hasDevice =
    Number.isFinite(input.deviceLat) && Number.isFinite(input.deviceLon);
  const hasExif =
    Number.isFinite(input.exifLat) && Number.isFinite(input.exifLon);

  if (!hasDevice && !hasExif) {
    return {
      error:
        "Enable location services and retake the photo at the break.",
    };
  }

  let gpsUsed: GpsSource = "device";
  let latitude = input.deviceLat!;
  let longitude = input.deviceLon!;
  let captureTimeUtc =
    input.deviceTs ?? input.exifCaptureTime ?? input.submissionTimestampUtc;
  let gpsMismatch = false;
  let locationFromExif = false;

  if (hasDevice && hasExif) {
    const mismatchKm = haversineKm(
      input.deviceLat!,
      input.deviceLon!,
      input.exifLat!,
      input.exifLon!
    );
    gpsMismatch = kmToMiles(mismatchKm) > REPORT_CONFIG.gpsMismatchMiles;

    if (input.deviceTs && input.exifCaptureTime) {
      const deviceMs = Date.parse(input.deviceTs);
      const exifMs = Date.parse(input.exifCaptureTime);
      if (
        Number.isFinite(deviceMs) &&
        Number.isFinite(exifMs) &&
        Math.abs(deviceMs - exifMs) <= REPORT_CONFIG.gpsTimestampToleranceMs
      ) {
        gpsUsed = "device";
      }
    }
  } else if (!hasDevice && hasExif) {
    gpsUsed = "exif";
    latitude = input.exifLat!;
    longitude = input.exifLon!;
    captureTimeUtc = input.exifCaptureTime ?? input.submissionTimestampUtc;
    locationFromExif = true;
  }

  return {
    latitude,
    longitude,
    captureTimeUtc,
    gpsUsed,
    gpsMismatch,
    locationFromExif,
  };
}

export function verifySpotDistance(
  spotId: string,
  latitude: number,
  longitude: number
): { ok: true; distanceMiles: number; spotName: string } | { ok: false; spotName: string; distanceMiles: number } {
  const spot = getSpotById(spotId);
  if (!spot) {
    return { ok: false, spotName: spotId, distanceMiles: Infinity };
  }

  const distanceKm = haversineKm(
    latitude,
    longitude,
    spot.latitude,
    spot.longitude
  );
  const distanceMiles = kmToMiles(distanceKm);

  return {
    ok: distanceMiles <= REPORT_CONFIG.distanceThresholdMiles,
    distanceMiles,
    spotName: spot.name,
  };
}

export function isCaptureFresh(
  captureTimeUtc: string,
  submissionTimestampUtc: string
): boolean {
  const captureMs = Date.parse(captureTimeUtc);
  const submissionMs = Date.parse(submissionTimestampUtc);
  if (!Number.isFinite(captureMs) || !Number.isFinite(submissionMs)) {
    return false;
  }
  const windowMs = REPORT_CONFIG.freshnessHours * 60 * 60 * 1000;
  return submissionMs - captureMs <= windowMs && captureMs <= submissionMs + 60_000;
}
