import type { SurfConditions } from "@/lib/types";
import type { CoachPeriod } from "@/lib/coach-period";
import type { UserProfile } from "@/lib/auth/types";
import { findSpotKnowledge, findSpotKnowledgeByCatalogId } from "@/lib/sage-knowledge";
import { degreesToCompass } from "@/engines/conditions/wind";
import { generateStyleCoachOutlook } from "./style-coach";

function windPhrase(conditions: SurfConditions): string {
  const type =
    conditions.windType !== "unknown" ? `${conditions.windType} ` : "";
  return `${type}${conditions.windDirectionLabel} ${conditions.windSpeedMph} mph`;
}

function tidePhrase(conditions: SurfConditions): string {
  if (!conditions.tide) return "Tide: unavailable";
  const stationNote = conditions.tide.stationName
    ? ` (${conditions.tide.stationName}, ${conditions.tide.stationDistanceKm} km away)`
    : "";
  return `Tide: ${conditions.tide.heightFt} ft MLLW, ${conditions.tide.trend}${stationNote}`;
}

export function formatDetailedConditionsReport(
  conditions: SurfConditions
): string {
  const modelWave =
    conditions.spotTransform?.modelWaveHeightFt ?? conditions.waveHeightFt;
  const modelSwell =
    conditions.spotTransform?.modelSwellHeightFt ?? conditions.swellHeightFt;

  const lines = [
    `${conditions.spot.name} — current conditions (Pacific time):`,
    "",
    `Primary swell: ${conditions.swellHeightFt} ft @ ${conditions.swellPeriodSec}s from ${conditions.swellDirectionLabel} (${conditions.swellDirectionDeg}°)`,
    `Combined wave (offshore model): ${modelWave} ft @ ${conditions.wavePeriodSec}s from ${degreesToCompass(conditions.waveDirectionDeg)} (${conditions.waveDirectionDeg}°)`,
    `At the break (spot-adjusted): ~${conditions.waveHeightFt} ft · ${conditions.quality}`,
    `Wind: ${windPhrase(conditions)}`,
    tidePhrase(conditions),
  ];

  if (conditions.spotTransform) {
    lines.push(
      "",
      `Spot read: ${conditions.spotTransform.breakType} break · swell fit ${conditions.spotTransform.swellFit}.`,
      conditions.spotTransform.note
    );
  }

  lines.push(
    "",
    "Note: swell height/direction/period come from the marine forecast grid; tide is NOAA MLLW from the nearest tide station."
  );

  return lines.join("\n").trim();
}

export function formatSpotConditionsReport(conditions: SurfConditions): string {
  const knowledge =
    findSpotKnowledge(conditions.spot.name) ??
    findSpotKnowledgeByCatalogId(conditions.spot.id);

  const lines = [
    `${conditions.spot.name} today — ${conditions.waveHeightFt} ft @ ${conditions.wavePeriodSec}s, ${conditions.swellDirectionLabel} swell @ ${conditions.swellPeriodSec}s, ${windPhrase(conditions)}, ${tidePhrase(conditions).replace("Tide: ", "tide ")}.`,
    `Overall: ${conditions.quality}.`,
  ];

  if (conditions.spotTransform) {
    lines.push(
      "",
      `Spot read: ${conditions.spotTransform.breakType} break · swell fit ${conditions.spotTransform.swellFit}. ${conditions.spotTransform.note}`
    );
  }

  if (knowledge) {
    lines.push(
      "",
      `How it breaks: ${knowledge.howItBreaks}`,
      "",
      `Best swell for this spot: ${knowledge.bestSwellDirection.split(".")[0]}. Cleanest wind: ${knowledge.cleanWindDirection.split(".")[0]}.`
    );
  }

  return lines.join("\n").trim();
}

export async function generateSpotConditionsOutlook(
  conditions: SurfConditions,
  profile: UserProfile,
  coachPeriod: CoachPeriod,
  options?: { includeStyle?: boolean }
): Promise<{ message: string; source: "ai" | "template" }> {
  const report = formatSpotConditionsReport(conditions);

  if (options?.includeStyle === false) {
    return { message: report, source: "template" };
  }

  const style = await generateStyleCoachOutlook(conditions, profile, coachPeriod);
  return {
    message: `${report}\n\n---\n\nFor your style:\n${style.message}`,
    source: style.source,
  };
}
