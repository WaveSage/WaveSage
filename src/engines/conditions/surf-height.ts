/**
 * Open-Meteo / wave models report significant wave height (Hs).
 * Surfers quote approximate breaking face height, which runs larger
 * on long-period groundswell and tropical swell as energy shoals.
 */

const METERS_TO_FEET = 3.28084;

export function metersToFeet(m: number): number {
  return Math.round(m * METERS_TO_FEET * 10) / 10;
}

/** Deep-water Hs in feet from marine wave + swell components. */
export function modelSignificantHeightFt(
  waveHeightM: number | undefined,
  swellHeightM: number | undefined
): number {
  const combined = waveHeightM ?? 0.5;
  const swell = swellHeightM ?? 0;
  const meters = swell > 0 ? Math.max(combined, swell) : combined;
  return metersToFeet(meters);
}

/**
 * Approximate surf face height from significant wave height + period.
 * Short windswell stays near Hs; 12–16s tropical/groundswell scales toward
 * the shoulder–overhead numbers surfers actually call.
 */
export function significantToFaceHeightFt(
  hsFt: number,
  periodSec: number
): number {
  const p = Math.max(0, periodSec);
  let factor = 1;
  if (p >= 16) factor = 1.55;
  else if (p >= 14) factor = 1.45;
  else if (p >= 12) factor = 1.35;
  else if (p >= 10) factor = 1.22;
  else if (p >= 8) factor = 1.1;
  return Math.round(hsFt * factor * 10) / 10;
}
