import type {
  HourlySurfPoint,
  SurfConditions,
  StyleOutlook,
  WindType,
} from "@/lib/types";
import type { StylePreference } from "@/lib/auth/types";
import { getSpotProfile } from "@/lib/spot-profiles/profiles";

export type GoSignal = "go" | "worth" | "workable" | "marginal" | "skip";

export type AtmosphereMood =
  | "glass"
  | "building"
  | "overcast"
  | "storm"
  | "epic";

export interface ScoreBreakdown {
  overall: number;
  wave: number;
  wind: number;
  swell: number;
  tide: number;
}

export interface BoardRecommendation {
  label: string;
  why: string;
  fromQuiver: boolean;
}

export interface BestWindow {
  startLabel: string;
  endLabel: string;
  score: number;
}

function qualityToScore(
  quality: SurfConditions["quality"],
  heightFt?: number
): number {
  let score =
    quality === "epic"
      ? 9.2
      : quality === "good"
        ? 7.4
        : quality === "fair"
          ? 5.2
          : 3.2;
  if (heightFt != null) {
    if (heightFt < 1.5) score -= 1.8;
    else if (heightFt < 2.5) score -= 0.9;
    else if (heightFt >= 3.5 && heightFt <= 6) score += 0.5;
  }
  return Math.max(1, Math.min(10, Math.round(score * 10) / 10));
}

function windScore(type: WindType, speed: number): number {
  // Light air (<5 mph) barely textures the face, regardless of direction.
  if (speed < 5) return 8.4;
  if (type === "offshore") {
    if (speed <= 12) return 8.5;
    if (speed <= 18) return 7;
    return 5.5;
  }
  if (type === "cross-shore") {
    if (speed <= 8) return 6.5;
    if (speed <= 14) return 5;
    return 3.5;
  }
  if (type === "onshore") {
    if (speed < 5) return 8;
    if (speed <= 10) return 5.5;
    if (speed <= 15) return 3.5;
    return 2;
  }
  return 6.5;
}

function swellScore(period: number, fitScore?: number): number {
  const periodBit =
    period >= 14 ? 9 : period >= 11 ? 7.5 : period >= 8 ? 5.5 : 3.5;
  if (fitScore == null) return periodBit;
  return Math.round(((periodBit + fitScore * 10) / 2) * 10) / 10;
}

function tideScore(
  conditions: SurfConditions
): number {
  const pref = getSpotProfile(conditions.spot.id).tidePreference;
  if (!conditions.tide || pref === "any") return 6.5;
  const h = conditions.tide.heightFt;
  const trend = conditions.tide.trend;
  if (pref === "low") {
    if (h <= 2.5 || trend === "low") return 8;
    if (h <= 3.5) return 6.5;
    return 4.5;
  }
  if (pref === "high") {
    if (h >= 4 || trend === "high") return 8;
    if (h >= 3) return 6.5;
    return 4.5;
  }
  // mid
  if (h >= 2 && h <= 4.5) return 8;
  if (h >= 1.5 && h <= 5.5) return 6.5;
  return 4.5;
}

export function buildScoreBreakdown(
  conditions: SurfConditions,
  styleFit?: number
): ScoreBreakdown {
  const wave = qualityToScore(conditions.quality, conditions.waveHeightFt);
  const wind = windScore(conditions.windType, conditions.windSpeedMph);
  const swell = swellScore(
    conditions.swellPeriodSec || conditions.wavePeriodSec,
    conditions.spotTransform?.swellFitScore
  );
  const tide = tideScore(conditions);
  const base =
    wave * 0.3 + wind * 0.25 + swell * 0.3 + tide * 0.15;
  const overall =
    styleFit != null
      ? Math.round((base * 0.75 + styleFit * 0.25) * 10) / 10
      : Math.round(base * 10) / 10;
  return {
    overall: Math.min(10, overall),
    wave: Math.round(wave * 10) / 10,
    wind: Math.round(wind * 10) / 10,
    swell: Math.round(swell * 10) / 10,
    tide: Math.round(tide * 10) / 10,
  };
}

export function qualityLabel(quality: SurfConditions["quality"]): string {
  return quality.toUpperCase();
}

export function goSignal(
  score: number,
  windType: WindType,
  windSpeedMph = 99
): GoSignal {
  const chopped = windType === "onshore" && windSpeedMph >= 5;
  if (score >= 7.5 && !chopped) return "go";
  if (score >= 6.5) return "worth";
  if (score >= 5) return "workable";
  if (score >= 3.5) return "marginal";
  return "skip";
}

export function goSignalLabel(signal: GoSignal): string {
  switch (signal) {
    case "go":
      return "GO SURF";
    case "worth":
      return "WORTH IT";
    case "workable":
      return "WORKABLE";
    case "marginal":
      return "MARGINAL";
    default:
      return "SKIP IT";
  }
}

export function atmosphereFromConditions(
  conditions: SurfConditions
): AtmosphereMood {
  if (conditions.quality === "epic") return "epic";
  if (
    conditions.windType === "onshore" &&
    conditions.windSpeedMph >= 12
  ) {
    return "storm";
  }
  if (conditions.quality === "poor") return "overcast";
  if (
    conditions.windType === "offshore" &&
    conditions.windSpeedMph <= 10 &&
    conditions.quality === "good"
  ) {
    return "glass";
  }
  if (conditions.swellPeriodSec >= 12) return "building";
  return "overcast";
}

export function recommendBoard(
  conditions: SurfConditions,
  style: StylePreference,
  outlook?: StyleOutlook | null
): BoardRecommendation {
  if (outlook?.recommended_board_from_quiver) {
    return {
      label: outlook.recommended_board_from_quiver,
      why: outlook.style_specific_feedback || outlook.conditions_for_style,
      fromQuiver: true,
    };
  }

  const h = conditions.waveHeightFt;
  const period = conditions.swellPeriodSec || conditions.wavePeriodSec;

  if (style === "cruise") {
    return {
      label: h >= 5 ? "Longboard / Nose-rider" : "Longboard",
      why: `${h} ft with ${period}s period favors trim speed and nose time over the softer sections.`,
      fromQuiver: false,
    };
  }
  if (style === "trim") {
    if (h <= 3.5) {
      return {
        label: "Fish / Groveler",
        why: `${h} ft and ${period}s period — a wider outline keeps speed on softer shoulders.`,
        fromQuiver: false,
      };
    }
    return {
      label: "Fish / Mid-length",
      why: `Enough push at ${h} ft @ ${period}s for glide without needing a full shortboard.`,
      fromQuiver: false,
    };
  }
  // carving
  if (h >= 6 && period >= 13) {
    return {
      label: "Performance shortboard",
      why: `Steeper ${h} ft faces with ${period}s period — vertical lines and pocket turns are on.`,
      fromQuiver: false,
    };
  }
  if (h <= 3) {
    return {
      label: "Groveler / Small-wave shortboard",
      why: `Smaller ${h} ft surf needs extra paddle and release — leave the stickier board at home.`,
      fromQuiver: false,
    };
  }
  return {
    label: "Shortboard",
    why: `${h} ft @ ${period}s has enough energy for performance turns on the right peak.`,
    fromQuiver: false,
  };
}

export function findBestWindow(points: HourlySurfPoint[]): BestWindow | null {
  if (points.length < 2) return null;

  let bestStart = 0;
  let bestScore = -1;
  const windowSize = Math.min(3, points.length);

  for (let i = 0; i <= points.length - windowSize; i++) {
    const slice = points.slice(i, i + windowSize);
    const avg =
      slice.reduce((sum, p) => sum + p.styleFitScore * 0.6 + qualityToScore(p.quality) * 0.4, 0) /
      slice.length;
    const windPenalty = slice.some(
      (p) => p.windType === "onshore" && p.windSpeedMph > 10
    )
      ? 0.85
      : 1;
    const score = avg * windPenalty;
    if (score > bestScore) {
      bestScore = score;
      bestStart = i;
    }
  }

  const start = points[bestStart];
  const end = points[bestStart + windowSize - 1];
  return {
    startLabel: start.label,
    endLabel: end.label,
    score: Math.round(bestScore * 10) / 10,
  };
}

export function windTypeHeadline(type: WindType): string {
  switch (type) {
    case "offshore":
      return "OFFSHORE";
    case "onshore":
      return "ONSHORE";
    case "cross-shore":
      return "CROSS-SHORE";
    default:
      return "VARIABLE";
  }
}

/** Live wind line for Sage stats / wind card. */
export function formatWindDisplay(
  windSpeedMph: number,
  windDirectionLabel: string,
  windType: WindType
): { headline: string; detail: string; available: boolean } {
  if (windType === "unknown" && windDirectionLabel === "—") {
    return {
      headline: "VARIABLE",
      detail: "Wind data catching up",
      available: false,
    };
  }
  if (windSpeedMph === 0 || windDirectionLabel === "Calm") {
    return {
      headline: "CALM",
      detail: "Calm / glassy",
      available: true,
    };
  }
  return {
    headline: windTypeHeadline(windType),
    detail: `${windSpeedMph} mph ${windDirectionLabel}`,
    available: true,
  };
}

export function formatHeightRange(ft: number): string {
  const low = Math.max(0.5, Math.round((ft - 0.5) * 2) / 2);
  const high = Math.round((ft + 0.5) * 2) / 2;
  if (high - low < 0.5) return `${ft} ft`;
  return `${low}–${high} ft`;
}
