import type { SurfConditions, SurfSpot } from "@/lib/types";
import type { UserProfile } from "@/lib/auth/types";
import { STYLE_LABELS } from "@/lib/auth/types";
import { SOCAL_SPOTS } from "@/lib/socal-spots";
import { fetchSurfConditions } from "@/engines/conditions";
import { getSpotProfile } from "@/lib/spot-profiles/profiles";
import { getTemplateStyleCoachResult } from "./style-coach";
import {
  formatSessionWhenLabel,
  type SessionTimeRequest,
  type RegionFilter,
} from "./session-time";

const NORTH_COUNTY_IDS = new Set([
  "oceanside",
  "oceanside-harbor",
  "the-rock",
  "tamarack",
  "terramar",
  "ponto-jetty",
  "beacons",
  "swamis",
  "grandview",
  "d-street",
  "cardiff",
  "seaside-reef",
  "del-mar",
  "del-mar-jetty",
]);

const ORANGE_COUNTY_IDS = new Set([
  "huntington",
  "newport",
  "salt-creek",
  "trestles",
  "trestles-uppers",
  "trestles-middles",
]);

function spotsForRegion(filter: RegionFilter): SurfSpot[] {
  if (filter === "north-county") {
    return SOCAL_SPOTS.filter((s) => NORTH_COUNTY_IDS.has(s.id));
  }
  if (filter === "orange-county") {
    return SOCAL_SPOTS.filter((s) => ORANGE_COUNTY_IDS.has(s.id));
  }
  return SOCAL_SPOTS;
}

function regionLabel(filter: RegionFilter): string {
  switch (filter) {
    case "north-county":
      return "North County";
    case "orange-county":
      return "Orange County";
    default:
      return "Southern California";
  }
}

function windLine(conditions: SurfConditions): string {
  const type =
    conditions.windType !== "unknown" ? `${conditions.windType} ` : "";
  return `${type}${conditions.windDirectionLabel} ${conditions.windSpeedMph} mph`;
}

function scoreSpotAtTime(
  conditions: SurfConditions,
  styleFit: number
): number {
  const quality =
    conditions.quality === "epic"
      ? 4
      : conditions.quality === "good"
        ? 3
        : conditions.quality === "fair"
          ? 2
          : 1;
  const fit =
    conditions.spotTransform?.swellFit === "excellent"
      ? 1
      : conditions.spotTransform?.swellFit === "good"
        ? 0.85
        : conditions.spotTransform?.swellFit === "marginal"
          ? 0.55
          : 0.3;
  const windPenalty =
    conditions.windType === "onshore" && conditions.windSpeedMph > 10
      ? 0.7
      : conditions.windType === "onshore" && conditions.windSpeedMph > 6
        ? 0.85
        : 1;
  return (
    (styleFit * 0.45 + quality * 1.2 + conditions.waveHeightFt * 0.35) *
    fit *
    windPenalty
  );
}

/** Hourly report: verdict, style fit at time, size/period/wind/tide. */
export function formatHourlySpotReportPretty(
  conditions: SurfConditions,
  session: SessionTimeRequest,
  style: {
    one_line_verdict: string;
    style_fit_score: number;
    conditions_for_style: string;
  }
): string {
  const windBit =
    conditions.windType === "onshore" && conditions.windSpeedMph > 8
      ? `Onshore ${conditions.windDirectionLabel} at ${conditions.windSpeedMph} mph will add chop.`
      : conditions.windType === "offshore"
        ? `Offshore ${conditions.windDirectionLabel} @ ${conditions.windSpeedMph} mph should clean the faces.`
        : `Wind is manageable (${conditions.windSpeedMph} mph ${conditions.windDirectionLabel}) for most approaches.`;

  const tideBit = conditions.tide
    ? ` Tide ${conditions.tide.heightFt} ft, ${conditions.tide.trend}.`
    : "";

  const fitBit = conditions.spotTransform
    ? ` Swell fit ${conditions.spotTransform.swellFit}.`
    : "";

  const when = formatSessionWhenLabel(session);

  return [
    `${conditions.spot.name} at ${when}:`,
    "",
    style.one_line_verdict,
    "",
    `Style fit at ${when}: ${style.style_fit_score}/10`,
    "",
    `${conditions.waveHeightFt} ft with ${conditions.wavePeriodSec}s period and ${conditions.quality} quality offers ${
      conditions.quality === "poor" || conditions.quality === "fair"
        ? "limited"
        : "enough"
    } energy for your session on the right bump. ${windBit}${tideBit}${fitBit}`,
  ].join("\n");
}

export async function generateHourlySpotOutlook(
  spot: SurfSpot,
  profile: UserProfile,
  session: SessionTimeRequest
): Promise<{ message: string; conditions: SurfConditions; source: "ai" | "template" }> {
  const conditions = await fetchSurfConditions(spot, {
    at: {
      dateKey: session.dateKey,
      hour: session.hour,
      minute: session.minute,
    },
  });

  const style = getTemplateStyleCoachResult(conditions, profile);

  return {
    message: formatHourlySpotReportPretty(conditions, session, style),
    conditions,
    source: "template" as const,
  };
}

export async function generateRegionalAtTimeOutlook(
  filter: RegionFilter,
  profile: UserProfile,
  session: SessionTimeRequest
): Promise<{ message: string; conditions: SurfConditions; source: "template" }> {
  const spots = spotsForRegion(filter);
  const at = {
    dateKey: session.dateKey,
    hour: session.hour,
    minute: session.minute,
  };

  const batchSize = 5;
  const conditionsList: SurfConditions[] = [];
  for (let i = 0; i < spots.length; i += batchSize) {
    const batch = spots.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((spot) =>
        fetchSurfConditions(spot, { includeTide: true, at }).catch(() => null)
      )
    );
    for (const item of batchResults) {
      if (item) conditionsList.push(item);
    }
  }

  if (!conditionsList.length) {
    return {
      message: `Couldn't pull ${regionLabel(filter)} conditions for ${formatSessionWhenLabel(session)}. Try again in a minute.`,
      conditions: await fetchSurfConditions(spots[0] ?? SOCAL_SPOTS[0], { at }),
      source: "template",
    };
  }

  const ranked: {
    conditions: SurfConditions;
    styleFit: number;
    score: number;
    verdict: string;
  }[] = [];

  for (const conditions of conditionsList) {
    const style = getTemplateStyleCoachResult(conditions, profile);
    ranked.push({
      conditions,
      styleFit: style.style_fit_score,
      score: scoreSpotAtTime(conditions, style.style_fit_score),
      verdict: style.one_line_verdict,
    });
  }

  ranked.sort((a, b) => b.score - a.score);
  const top = ranked.slice(0, 5);
  const best = top[0];

  const profileNote = (c: SurfConditions) => {
    const p = getSpotProfile(c.spot.id);
    return `${p.breakType} · ideal swell ~${p.idealSwellDegMin}–${p.idealSwellDegMax}°`;
  };

  const lines = [
    `Best in ${regionLabel(filter)} at ${formatSessionWhenLabel(session)} for your ${STYLE_LABELS[profile.stylePreference].toLowerCase()} style:`,
    "",
    `1. ${best.conditions.spot.name} — ${best.conditions.quality}, ${best.conditions.waveHeightFt} ft @ ${best.conditions.wavePeriodSec}s, ${windLine(best.conditions)}, style fit ${best.styleFit}/10.`,
    `   Why: ${best.conditions.swellDirectionLabel} swell · ${profileNote(best.conditions)}${best.conditions.spotTransform ? ` · swell fit ${best.conditions.spotTransform.swellFit}` : ""}.`,
    "",
    "Also solid:",
    ...top.slice(1).map(
      (item, i) =>
        `${i + 2}. ${item.conditions.spot.name} — ${item.conditions.quality}, ${item.conditions.waveHeightFt} ft @ ${item.conditions.wavePeriodSec}s, ${windLine(item.conditions)}, style ${item.styleFit}/10.`
    ),
    "",
    best.verdict,
  ];

  return {
    message: lines.join("\n"),
    conditions: best.conditions,
    source: "template",
  };
}
