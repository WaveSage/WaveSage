import type { WindType } from "@/lib/types";

const COMPASS = [
  "N",
  "NNE",
  "NE",
  "ENE",
  "E",
  "ESE",
  "SE",
  "SSE",
  "S",
  "SSW",
  "SW",
  "WSW",
  "W",
  "WNW",
  "NW",
  "NNW",
] as const;

export function degreesToCompass(deg: number): string {
  const normalized = ((deg % 360) + 360) % 360;
  const index = Math.round(normalized / 22.5) % 16;
  return COMPASS[index];
}

function angleDifference(a: number, b: number): number {
  const diff = Math.abs(((a - b + 540) % 360) - 180);
  return diff;
}

/** Classify wind relative to which direction the beach faces (toward the ocean). */
export function classifyWind(
  windFromDeg: number,
  shoreBearingDeg?: number
): WindType {
  if (shoreBearingDeg === undefined) return "unknown";

  // Offshore wind blows toward the ocean (same direction the beach faces).
  // Meteorological convention: wind direction is where it comes FROM.
  const offshoreFromDeg = (shoreBearingDeg + 180) % 360;
  const diff = angleDifference(windFromDeg, offshoreFromDeg);

  if (diff <= 45) return "offshore";
  if (diff >= 135) return "onshore";
  return "cross-shore";
}

export function windTypeLabel(type: WindType): string {
  switch (type) {
    case "offshore":
      return "offshore";
    case "onshore":
      return "onshore";
    case "cross-shore":
      return "cross-shore";
    default:
      return "";
  }
}
