import { REPORT_CONFIG } from "./config";
import type { UserReportGalleryItem, UserReportRecord } from "./types";
import { toGalleryItem } from "./storage";

export function rankReportsForConditions(
  reports: UserReportRecord[]
): UserReportRecord[] {
  return [...reports].sort((a, b) => {
    if (b.imageContentConfidence !== a.imageContentConfidence) {
      return b.imageContentConfidence - a.imageContentConfidence;
    }
    const timeDiff =
      Date.parse(b.captureTimeUtc) - Date.parse(a.captureTimeUtc);
    if (timeDiff !== 0) return timeDiff;
    return a.distanceToSpotMiles - b.distanceToSpotMiles;
  });
}

export function selectReportForConditions(
  reports: UserReportRecord[],
  spotId: string,
  recentHours = REPORT_CONFIG.freshnessHours
): UserReportRecord | null {
  const cutoff = Date.now() - recentHours * 60 * 60 * 1000;
  const eligible = reports.filter(
    (r) =>
      !r.deleted &&
      !r.moderationHidden &&
      r.spotId === spotId &&
      Date.parse(r.captureTimeUtc) >= cutoff
  );

  if (!eligible.length) return null;
  return rankReportsForConditions(eligible)[0];
}

export function toConditionsPhoto(
  report: UserReportRecord,
  viewerUserId: string
): UserReportGalleryItem & { lowConfidence: boolean } {
  const item = toGalleryItem(report, viewerUserId);
  return {
    ...item,
    lowConfidence:
      report.imageContentConfidence < REPORT_CONFIG.confidenceAccept,
  };
}
