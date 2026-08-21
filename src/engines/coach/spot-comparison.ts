import type { SurfConditions, SurfSpot } from "@/lib/types";
import { getSpotSpec } from "@/lib/spot-specs";
import { getSpotProfile } from "@/lib/spot-profiles/profiles";
import {
  applySpotTransform,
  swellExposureScore,
} from "@/engines/conditions/spot-transform";
import { degreesToCompass } from "@/engines/conditions/wind";
import { SOCAL_SPOTS, matchSpotInMessage } from "@/lib/socal-spots";
import { findSpotKnowledge } from "@/lib/sage-knowledge";
import { findSpotSpecInText } from "@/lib/spot-specs";

export interface SpotTodayScore {
  spot: SurfSpot;
  conditions: SurfConditions;
  overallScore: number;
  swellExposure: number;
  swellFit: string;
  tideFitNote: string;
  summary: string;
}

function tryAddSpot(spots: SurfSpot[], candidate: SurfSpot | null) {
  if (candidate && !spots.some((s) => s.id === candidate.id)) {
    spots.push(candidate);
  }
}

export function parseSpotsForComparison(message: string): SurfSpot[] {
  const parts = message.split(
    /\b(?:compare(?:d)?\s+(?:to|with)|vs\.?|versus)\b/i
  );

  const found: SurfSpot[] = [];

  if (parts.length >= 2) {
    for (const part of parts) {
      tryAddSpot(found, matchSpotInMessage(part));
    }
    if (found.length >= 2) return found.slice(0, 2);
  }

  const lower = message.toLowerCase();
  const ranked = [...SOCAL_SPOTS].sort(
    (a, b) => b.name.length - a.name.length
  );
  for (const spot of ranked) {
    if (lower.includes(spot.name.toLowerCase())) {
      tryAddSpot(found, spot);
    } else if (spot.aliases?.some((a) => lower.includes(a))) {
      tryAddSpot(found, spot);
    }
  }

  const knowledge = findSpotKnowledge(message);
  if (knowledge) {
    const fromCatalog = SOCAL_SPOTS.find((s) => s.id === knowledge.id);
    if (fromCatalog) tryAddSpot(found, fromCatalog);
  }

  const spec = findSpotSpecInText(message);
  if (spec) {
    const fromCatalog = SOCAL_SPOTS.find((s) => s.id === spec.catalogId);
    if (fromCatalog) tryAddSpot(found, fromCatalog);
  }

  return found.slice(0, 2);
}

function tideFitNote(conditions: SurfConditions): string {
  const pref = getSpotProfile(conditions.spot.id).tidePreference;
  const spec = getSpotSpec(conditions.spot.id);
  const tide = conditions.tide;
  if (!tide) return "Tide data unavailable.";

  const height = tide.heightFt;
  const trend = tide.trend;
  const prefLabel = spec?.tideNotes ?? `${pref} tide preferred`;

  if (pref === "low" && (trend === "low" || height <= 2.5)) {
    return `Tide ${height} ft ${trend} — good fit (${prefLabel}).`;
  }
  if (pref === "high" && (trend === "high" || height >= 4)) {
    return `Tide ${height} ft ${trend} — good fit (${prefLabel}).`;
  }
  if (pref === "mid" && height >= 2 && height <= 5) {
    return `Tide ${height} ft ${trend} — in the usual window (${prefLabel}).`;
  }
  return `Tide ${height} ft ${trend} — okay; spot prefers ${prefLabel}.`;
}

function scoreSpotToday(conditions: SurfConditions): SpotTodayScore {
  const profile = getSpotProfile(conditions.spot.id);
  const spec = getSpotSpec(conditions.spot.id);
  const exposure = swellExposureScore(
    conditions.swellDirectionDeg,
    profile.idealSwellDegMin,
    profile.idealSwellDegMax
  );

  const transform = conditions.spotTransform;
  const swellFit = transform?.swellFit ?? "unknown";
  const qualityScore =
    conditions.quality === "epic"
      ? 1
      : conditions.quality === "good"
        ? 0.85
        : conditions.quality === "fair"
          ? 0.65
          : 0.45;

  const overallScore =
    Math.round(
      ((transform?.swellFitScore ?? exposure) * 0.55 +
        exposure * 0.25 +
        qualityScore * 0.2) *
        100
    ) / 100;

  const swellWindow = spec
    ? `${spec.swellDegMin}°–${spec.swellDegMax}°`
    : `${profile.idealSwellDegMin}°–${profile.idealSwellDegMax}°`;

  const exposurePct = Math.round(exposure * 100);
  const inWindow = exposure >= 0.85;

  const summary = `${conditions.waveHeightFt} ft @ ${conditions.wavePeriodSec}s, ${conditions.quality}. Swell ${degreesToCompass(conditions.swellDirectionDeg)} ${conditions.swellDirectionDeg}° (${exposurePct}% of ideal ${swellWindow} window) — swell fit ${swellFit}.${inWindow ? "" : " Partial swell shadow today."}`;

  return {
    spot: conditions.spot,
    conditions,
    overallScore,
    swellExposure: exposure,
    swellFit,
    tideFitNote: tideFitNote(conditions),
    summary,
  };
}

export function conditionsForSpot(
  spot: SurfSpot,
  regional: SurfConditions[]
): SurfConditions | null {
  return regional.find((c) => c.spot.id === spot.id) ?? null;
}

export function buildSpotComparisonReport(
  spots: SurfSpot[],
  regional: SurfConditions[]
): string | null {
  if (spots.length < 2) return null;

  const scored: SpotTodayScore[] = [];
  for (const spot of spots) {
    let conditions = conditionsForSpot(spot, regional);
    if (!conditions) continue;

    if (!conditions.spotTransform) {
      const transform = applySpotTransform(
        spot,
        {
          waveHeightFt: conditions.waveHeightFt,
          wavePeriodSec: conditions.wavePeriodSec,
          swellHeightFt: conditions.swellHeightFt,
          swellPeriodSec: conditions.swellPeriodSec,
          swellDirectionDeg: conditions.swellDirectionDeg,
          windSpeedMph: conditions.windSpeedMph,
          windType: conditions.windType,
        },
        conditions.tide
      );
      conditions = { ...conditions, spotTransform: transform };
    }

    scored.push(scoreSpotToday(conditions));
  }

  if (scored.length < 2) {
    return `I need live conditions for both spots to compare. Open the Spots tab and refresh — I have ${scored[0]?.spot.name ?? spots[0].name} but not ${spots.find((s) => s.id !== scored[0]?.spot.id)?.name ?? "the other spot"} in the regional feed yet.`;
  }

  const [a, b] = scored;
  const ref = scored[0].conditions;
  const swellLine = `Today's swell: ${degreesToCompass(ref.swellDirectionDeg)} ${ref.swellDirectionDeg}° @ ${ref.swellPeriodSec}s, ${ref.swellHeightFt} ft. Wind ${ref.windType !== "unknown" ? ref.windType + " " : ""}${ref.windDirectionLabel} ${ref.windSpeedMph} mph.`;

  const winner =
    a.overallScore > b.overallScore + 0.08
      ? a.spot.name
      : b.overallScore > a.overallScore + 0.08
        ? b.spot.name
        : null;

  const specA = getSpotSpec(a.spot.id);
  const specB = getSpotSpec(b.spot.id);

  const lines = [
    `${a.spot.name} vs ${b.spot.name} today:`,
    "",
    swellLine,
    "",
    `${a.spot.name} (${specA?.breakType ?? "break"}):`,
    a.summary,
    a.tideFitNote,
    "",
    `${b.spot.name} (${specB?.breakType ?? "break"}):`,
    b.summary,
    b.tideFitNote,
    "",
    winner
      ? `Pick: ${winner} likely works better today on swell angle, tide fit, and current shape.`
      : `Pick: It's close — ${a.spot.name} and ${b.spot.name} are both workable; choose ${a.spot.name} for ${specA?.breakType === "reef" || specA?.breakType === "point" ? "more defined peaks" : "sandbar options"} or ${b.spot.name} if the crowd or access suits you better.`,
    "",
    "Want the deets on either spot, or another comparison?",
  ];

  return lines.join("\n");
}
