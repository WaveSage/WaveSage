import type { SurfSpot, TideInfo, WindType } from "@/lib/types";
import { getSpotProfile } from "@/lib/spot-profiles/profiles";
import type {
  BreakType,
  SpotTransformResult,
  SwellFit,
  TidePreference,
} from "@/lib/spot-profiles/types";
import { degreesToCompass } from "./wind";

function normalizeDeg(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

function isInSwellWindow(deg: number, min: number, max: number): boolean {
  const d = normalizeDeg(deg);
  const a = normalizeDeg(min);
  const b = normalizeDeg(max);
  if (a <= b) return d >= a && d <= b;
  return d >= a || d <= b;
}

/** 0–1 exposure based on angular distance from ideal swell window. */
export function swellExposureScore(
  swellDirectionDeg: number,
  idealMin: number,
  idealMax: number
): number {
  if (isInSwellWindow(swellDirectionDeg, idealMin, idealMax)) return 1;

  const d = normalizeDeg(swellDirectionDeg);
  const a = normalizeDeg(idealMin);
  const b = normalizeDeg(idealMax);

  const distTo = (target: number) => {
    const diff = Math.abs(d - target);
    return Math.min(diff, 360 - diff);
  };

  let edgeDistance: number;
  if (a <= b) {
    if (d < a) edgeDistance = distTo(a);
    else if (d > b) edgeDistance = distTo(b);
    else edgeDistance = 0;
  } else {
    if (d > b && d < a) {
      const toA = distTo(a);
      const toB = distTo(b);
      edgeDistance = Math.min(toA, toB);
    } else {
      edgeDistance = 0;
    }
  }

  return Math.max(0, 1 - edgeDistance / 90);
}

function periodScore(periodSec: number, minPeriodSec: number): number {
  if (periodSec >= minPeriodSec) return 1;
  if (periodSec < 6) return 0.5;
  return 0.55 + 0.45 * (periodSec / minPeriodSec);
}

function tideScore(tide: TideInfo | null, preference: TidePreference): number {
  if (!tide || preference === "any") return 1;

  const height = tide.heightFt;
  const trend = tide.trend;

  switch (preference) {
    case "low":
      if (trend === "low" || height <= 2) return 1;
      if (trend === "high" || height >= 5) return 0.75;
      return 0.9;
    case "high":
      if (trend === "high" || height >= 4) return 1;
      if (trend === "low" || height <= 2) return 0.78;
      return 0.9;
    case "mid":
      if (height >= 2.5 && height <= 4.5) return 1;
      if (height < 1.5 || height > 5.5) return 0.8;
      return 0.92;
    default:
      return 1;
  }
}

function swellFitLabel(score: number): SwellFit {
  if (score >= 0.85) return "excellent";
  if (score >= 0.65) return "good";
  if (score >= 0.4) return "marginal";
  return "poor";
}

function breakTypeLabel(type: BreakType): string {
  switch (type) {
    case "reef":
      return "reef";
    case "point":
      return "point";
    case "jetty":
      return "jetty";
    default:
      return "beach";
  }
}

function buildTransformNote(
  spotName: string,
  profile: ReturnType<typeof getSpotProfile>,
  swellDirectionDeg: number,
  swellFit: SwellFit,
  modelWaveFt: number,
  adjustedWaveFt: number,
  tide: TideInfo | null
): string {
  const dir = degreesToCompass(swellDirectionDeg);
  const type = breakTypeLabel(profile.breakType);
  const delta = adjustedWaveFt - modelWaveFt;
  const deltaText =
    Math.abs(delta) >= 0.5
      ? delta > 0
        ? ` Spot focusing adds size (model ${modelWaveFt} ft → ~${adjustedWaveFt} ft).`
        : ` Spot-adjusted under the model (model ${modelWaveFt} ft → ~${adjustedWaveFt} ft).`
      : "";

  if (swellFit === "excellent" || swellFit === "good") {
    return `${dir} swell fits this ${type} break well.${deltaText}`;
  }

  if (swellFit === "marginal") {
    const tideBit =
      tide && profile.tidePreference !== "any"
        ? ` Tide is ${tide.trend} — ${profile.tidePreference} tide usually works better.`
        : "";
    return `${dir} swell is only a partial match for ${spotName}.${deltaText}${tideBit}`;
  }

  return `${dir} swell is a weak match for this ${type}.${deltaText}`;
}

export interface RawConditionsInput {
  waveHeightFt: number;
  wavePeriodSec: number;
  swellHeightFt: number;
  swellPeriodSec: number;
  swellDirectionDeg: number;
  windSpeedMph: number;
  windType: WindType;
}

export function applySpotTransform(
  spot: SurfSpot,
  raw: RawConditionsInput,
  tide: TideInfo | null
): SpotTransformResult {
  const profile = getSpotProfile(spot.id);
  const exposure = swellExposureScore(
    raw.swellDirectionDeg,
    profile.idealSwellDegMin,
    profile.idealSwellDegMax
  );
  const period = periodScore(raw.swellPeriodSec, profile.minPeriodSec);
  const tideFit = tideScore(tide, profile.tidePreference);

  const shadowPenalty =
    exposure < 1
      ? 1 - profile.shadowSensitivity * (1 - exposure)
      : 1;

  const amp = exposure >= 0.7 ? profile.amplificationFactor : 1;

  const combined = exposure * period * tideFit * shadowPenalty;
  // Keep solid exposure from shrinking the model size. Long-period tropical
  // and groundswell were reading 20–40% low when fit was merely "good".
  const fitFactor = 0.55 + 0.45 * combined;
  const heightFactor = fitFactor * amp;
  const clampedFactor = Math.max(0.3, Math.min(1.55, heightFactor));
  const floorFt =
    exposure >= 0.65 ? raw.waveHeightFt : raw.waveHeightFt * 0.85;

  const adjustedWave =
    Math.round(Math.max(floorFt, raw.waveHeightFt * clampedFactor) * 10) / 10;
  const adjustedSwell =
    Math.round(raw.swellHeightFt * clampedFactor * 10) / 10;

  const swellFitScore = Math.round(combined * 100) / 100;
  const swellFit = swellFitLabel(swellFitScore);

  const note = buildTransformNote(
    spot.name,
    profile,
    raw.swellDirectionDeg,
    swellFit,
    raw.waveHeightFt,
    adjustedWave,
    tide
  );

  return {
    modelWaveHeightFt: raw.waveHeightFt,
    modelSwellHeightFt: raw.swellHeightFt,
    waveHeightFt: adjustedWave,
    swellHeightFt: adjustedSwell,
    swellFit,
    swellFitScore,
    breakType: profile.breakType,
    note,
  };
}
