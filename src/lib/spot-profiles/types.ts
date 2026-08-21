export type BreakType = "beach" | "reef" | "point" | "jetty";

export type TidePreference = "low" | "mid" | "high" | "any";

export type SwellFit = "excellent" | "good" | "marginal" | "poor";

export interface SpotProfile {
  id: string;
  breakType: BreakType;
  /** Ideal swell direction window (degrees, meteorological). Supports wrap if min > max. */
  idealSwellDegMin: number;
  idealSwellDegMax: number;
  /** Multiplier when swell angle is a strong match (jetties, canyons, focused reefs). */
  amplificationFactor: number;
  /** Swell below this period feels weaker at the break. */
  minPeriodSec: number;
  tidePreference: TidePreference;
  /** How sharply size drops when swell is outside the ideal window (0.5 = gentle, 1.0 = steep). */
  shadowSensitivity: number;
}

export interface SpotTransformResult {
  modelWaveHeightFt: number;
  modelSwellHeightFt: number;
  waveHeightFt: number;
  swellHeightFt: number;
  swellFit: SwellFit;
  swellFitScore: number;
  breakType: BreakType;
  note: string;
}
