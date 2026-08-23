import type { SurfConditions, SurfSpot, TideInfo, WindType } from "@/lib/types";
import type { SwellFit } from "@/lib/types";
import { fetchTideInfo } from "./tide";
import { pickHourIndex } from "./time-index";
import { applySpotTransform } from "./spot-transform";
import { fetchJsonWithRetry } from "./fetch-timeout";
import { fetchNwsWind } from "./nws-wind";
import { getPacificNowParts } from "./pacific-time";
import {
  classifyWind,
  degreesToCompass,
  windTypeLabel,
} from "./wind";

interface OpenMeteoMarineResponse {
  hourly: {
    time: string[];
    wave_height?: number[];
    wave_direction?: number[];
    wave_period?: number[];
    swell_wave_height?: number[];
    swell_wave_direction?: number[];
    swell_wave_period?: number[];
    sea_surface_temperature?: number[];
  };
}

interface OpenMeteoWeatherResponse {
  hourly: {
    time: string[];
    wind_speed_10m?: number[];
    wind_direction_10m?: number[];
  };
}

const METERS_TO_FEET = 3.28084;

function metersToFeet(m: number): number {
  return Math.round(m * METERS_TO_FEET * 10) / 10;
}

function assessQuality(
  waveHeightFt: number,
  wavePeriodSec: number,
  windSpeedMph: number,
  windType: WindType,
  swellFitScore = 1
): SurfConditions["quality"] {
  if (waveHeightFt < 1 || wavePeriodSec < 6) return "poor";
  if (swellFitScore < 0.35) return "poor";

  const calmOffshore = windSpeedMph < 8 && windType === "offshore";
  const lightWind = windSpeedMph < 12 && windType !== "onshore";

  let quality: SurfConditions["quality"] = "fair";
  if (waveHeightFt >= 4 && wavePeriodSec >= 12 && calmOffshore) quality = "epic";
  else if (waveHeightFt >= 2 && wavePeriodSec >= 9 && lightWind) quality = "good";
  else if (windType === "onshore" && windSpeedMph > 10) quality = "poor";

  if (swellFitScore < 0.5 && quality === "good") quality = "fair";
  if (swellFitScore < 0.5 && quality === "epic") quality = "good";
  if (swellFitScore < 0.35) quality = "poor";

  return quality;
}

function formatTideSummary(tide: TideInfo | null): string {
  if (!tide) return "";
  const trend =
    tide.trend === "high"
      ? "high tide"
      : tide.trend === "low"
        ? "low tide"
        : `${tide.trend} tide`;
  return `Tide ${tide.heightFt} ft (${trend}).`;
}

function sizePhrase(waveHeightFt: number): string {
  if (waveHeightFt < 2) return `small surf (${waveHeightFt} ft)`;
  if (waveHeightFt < 4) return `fun-sized surf (${waveHeightFt} ft)`;
  if (waveHeightFt < 6) return `solid surf (${waveHeightFt} ft)`;
  return `overhead surf (${waveHeightFt} ft)`;
}

function energyPhrase(
  wavePeriodSec: number,
  swellFit: SwellFit,
  quality: SurfConditions["quality"]
): string {
  const longPeriod = wavePeriodSec >= 11;
  const decentPeriod = wavePeriodSec >= 9;

  if (wavePeriodSec < 8) return "short-period chop";

  if (swellFit === "poor") {
    return longPeriod
      ? "long-period swell that's poorly aligned for this break"
      : "swell that's poorly aligned for this break";
  }
  if (swellFit === "marginal") {
    return longPeriod
      ? "long-period swell only partially lining up"
      : "swell only partially lining up";
  }

  // Fit is good/excellent — quality may still be poor from wind or size.
  if (quality === "poor") {
    return longPeriod
      ? "long-period swell on paper"
      : decentPeriod
        ? "usable period on paper"
        : "modest energy";
  }

  if (longPeriod) return "clean, longer-period swell";
  if (decentPeriod) return "decent period and energy";
  return "shorter-period energy";
}

function windSentence(
  windSpeedMph: number,
  windDirectionLabel: string,
  windType: WindType
): string {
  if (windType === "unknown") {
    return `${windDirectionLabel} wind at ${windSpeedMph} mph`;
  }
  return `${windTypeLabel(windType)} ${windDirectionLabel} wind at ${windSpeedMph} mph`;
}

function buildSummary(
  spot: SurfSpot,
  waveHeightFt: number,
  wavePeriodSec: number,
  windSpeedMph: number,
  windDirectionLabel: string,
  windType: WindType,
  tide: TideInfo | null,
  quality: SurfConditions["quality"],
  swellFit: SwellFit,
  swellDirectionLabel: string,
  modelWaveFt: number
): string {
  const size = sizePhrase(waveHeightFt);
  const energy = energyPhrase(wavePeriodSec, swellFit, quality);
  const wind = windSentence(windSpeedMph, windDirectionLabel, windType);

  const parts: string[] = [
    `${spot.name}: ${size} with ${energy}.`,
    `${wind}.`,
  ];

  // Limiting-factor line — one clear reason, not conflicting slogans.
  if (swellFit === "poor") {
    parts.push(
      `${swellDirectionLabel} swell is a weak match here, so don't trust the open-ocean size.`
    );
  } else if (swellFit === "marginal") {
    parts.push(
      `${swellDirectionLabel} swell is only a partial match for this break.`
    );
  } else if (
    windType === "onshore" &&
    windSpeedMph >= 6 &&
    (quality === "poor" || quality === "fair")
  ) {
    parts.push("Onshore wind is the main limiter on the face.");
  } else if (swellFit === "excellent" || swellFit === "good") {
    parts.push(`${swellDirectionLabel} swell fits this break.`);
  }

  const delta = waveHeightFt - modelWaveFt;
  if (Math.abs(delta) >= 0.5) {
    parts.push(
      delta > 0
        ? `Spot focusing adds size (model ${modelWaveFt} ft → ~${waveHeightFt} ft).`
        : `Spot-adjusted size is a bit under the model (model ${modelWaveFt} ft → ~${waveHeightFt} ft).`
    );
  }

  const tidePart = formatTideSummary(tide);
  if (tidePart) parts.push(tidePart);
  parts.push(`Overall: ${quality}.`);

  return parts.join(" ");
}

async function fetchMarineForecast(spot: SurfSpot, forecastDays = 2) {
  const params = new URLSearchParams({
    latitude: String(spot.latitude),
    longitude: String(spot.longitude),
    hourly: [
      "wave_height",
      "wave_direction",
      "wave_period",
      "swell_wave_height",
      "swell_wave_direction",
      "swell_wave_period",
      "sea_surface_temperature",
    ].join(","),
    timezone: "America/Los_Angeles",
    forecast_days: String(forecastDays),
  });

  const url = `https://marine-api.open-meteo.com/v1/marine?${params}`;
  return fetchJsonWithRetry<OpenMeteoMarineResponse>(
    url,
    "Marine forecast"
  );
}

function weatherHasWind(weather: OpenMeteoWeatherResponse): boolean {
  return Boolean(
    weather.hourly.wind_speed_10m?.some((value) => value != null)
  );
}

async function fetchOpenMeteoWind(spot: SurfSpot, forecastDays = 2) {
  const params = new URLSearchParams({
    latitude: String(spot.latitude),
    longitude: String(spot.longitude),
    hourly: "wind_speed_10m,wind_direction_10m",
    wind_speed_unit: "mph",
    timezone: "America/Los_Angeles",
    forecast_days: String(forecastDays),
  });

  const url = `https://api.open-meteo.com/v1/forecast?${params}`;
  return fetchJsonWithRetry<OpenMeteoWeatherResponse>(
    url,
    "Weather forecast",
    1
  );
}

async function fetchSurfaceWind(
  spot: SurfSpot,
  forecastDays = 2
): Promise<OpenMeteoWeatherResponse> {
  try {
    const openMeteo = await fetchOpenMeteoWind(spot, forecastDays);
    if (weatherHasWind(openMeteo)) return openMeteo;
  } catch {
    // Render often gets Open-Meteo 429s; NWS is the fallback for US spots.
  }

  const nws = await fetchNwsWind(spot);
  if (!nws) {
    return { hourly: { time: [] } };
  }

  return {
    hourly: {
      time: [new Date().toISOString()],
      wind_speed_10m: [nws.speedMph],
      wind_direction_10m: [nws.directionDeg],
    },
  };
}

const CONDITIONS_CACHE_MS = 8 * 60 * 1000;
const conditionsCache = new Map<
  string,
  { conditions: SurfConditions; fetchedAt: number }
>();

function conditionsCacheKey(
  spot: SurfSpot,
  options?: {
    includeTide?: boolean;
    at?: { dateKey: string; hour: number; minute?: number };
  }
): string {
  const includeTide = options?.includeTide !== false;
  const at = options?.at;
  return `${spot.id}:${includeTide ? "tide" : "notide"}:${at?.dateKey ?? "now"}:${at?.hour ?? "live"}`;
}

export async function fetchSurfConditions(
  spot: SurfSpot,
  options?: {
    includeTide?: boolean;
    /** Pacific-local hour snapshot (e.g. 9am dawn patrol). */
    at?: { dateKey: string; hour: number; minute?: number };
  }
): Promise<SurfConditions> {
  const cacheKey = conditionsCacheKey(spot, options);
  const cached = conditionsCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CONDITIONS_CACHE_MS) {
    return cached.conditions;
  }

  const conditions = await fetchSurfConditionsUncached(spot, options);
  conditionsCache.set(cacheKey, {
    conditions,
    fetchedAt: Date.now(),
  });
  return conditions;
}

async function fetchSurfConditionsUncached(
  spot: SurfSpot,
  options?: {
    includeTide?: boolean;
    at?: { dateKey: string; hour: number; minute?: number };
  }
): Promise<SurfConditions> {
  const includeTide = options?.includeTide !== false;
  const todayKey = getPacificNowParts().dateKey;
  const forecastDays =
    options?.at && options.at.dateKey !== todayKey ? 5 : 2;
  const [marine, weatherResult, tide] = await Promise.all([
    fetchMarineForecast(spot, forecastDays),
    fetchSurfaceWind(spot, forecastDays),
    includeTide
      ? fetchTideInfo(spot, { at: options?.at }).catch(() => null)
      : Promise.resolve(null),
  ]);
  const weather: OpenMeteoWeatherResponse =
    weatherResult.hourly.time.length > 0
      ? weatherResult
      : { hourly: { time: marine.hourly.time } };
  const idx = pickHourIndex(marine.hourly.time, options?.at);
  const windIdx = pickHourIndex(weather.hourly.time, options?.at);

  const combinedWaveM = marine.hourly.wave_height?.[idx] ?? 0.5;
  const swellM = marine.hourly.swell_wave_height?.[idx] ?? 0;
  const modelWaveHeightFt = metersToFeet(
    swellM > 0 ? Math.max(combinedWaveM, swellM) : combinedWaveM
  );
  // Open-Meteo's swell_wave_period can lag a shorter secondary component while
  // wave_period reflects the dominant groundswell — prefer the longer period.
  const combinedPeriodSec = Math.round(marine.hourly.wave_period?.[idx] ?? 8);
  const swellPeriodFromMarine = Math.round(
    marine.hourly.swell_wave_period?.[idx] ?? 0
  );
  const wavePeriodSec = Math.max(
    combinedPeriodSec,
    swellPeriodFromMarine >= 6 ? swellPeriodFromMarine : 0
  );
  const waveHeightFt = modelWaveHeightFt;
  const waveDirectionDeg = Math.round(marine.hourly.wave_direction?.[idx] ?? 0);
  const windMissing = weather.hourly.wind_speed_10m?.[windIdx] == null;
  const windSpeedMph = windMissing
    ? 0
    : Math.round((weather.hourly.wind_speed_10m?.[windIdx] ?? 0) * 10) / 10;
  const windDirectionDeg = windMissing
    ? 0
    : Math.round(weather.hourly.wind_direction_10m?.[windIdx] ?? 0);
  const windDirectionLabel = windMissing
    ? "—"
    : degreesToCompass(windDirectionDeg);
  const windType = windMissing
    ? "unknown"
    : classifyWind(windDirectionDeg, spot.shoreBearingDeg);
  const swellHeightFt = metersToFeet(
    marine.hourly.swell_wave_height?.[idx] ?? waveHeightFt / METERS_TO_FEET
  );
  // Report the period we actually scored on (dominant energy), not a short secondary.
  const swellPeriodSec = wavePeriodSec;
  // Prefer direction of the longer-period energy. Open-Meteo's swell_wave_* often
  // tracks a short windswell (e.g. W @ 5s) while wave_* is the dominant groundswell
  // (e.g. WSW @ 10s) — matching the period preference above.
  const marineSwellDir = marine.hourly.swell_wave_direction?.[idx];
  const preferSwellComponent =
    swellM > 0.15 &&
    swellPeriodFromMarine >= 6 &&
    swellPeriodFromMarine >= combinedPeriodSec;
  const swellDirectionDeg = Math.round(
    preferSwellComponent && marineSwellDir != null
      ? marineSwellDir
      : waveDirectionDeg
  );
  const swellDirectionLabel = degreesToCompass(swellDirectionDeg);

  const transform = applySpotTransform(
    spot,
    {
      waveHeightFt,
      wavePeriodSec,
      swellHeightFt,
      swellPeriodSec,
      swellDirectionDeg,
      windSpeedMph,
      windType,
    },
    tide
  );

  const quality = assessQuality(
    transform.waveHeightFt,
    wavePeriodSec,
    windSpeedMph,
    windType,
    transform.swellFitScore
  );
  const summary = buildSummary(
    spot,
    transform.waveHeightFt,
    wavePeriodSec,
    windSpeedMph,
    windDirectionLabel,
    windType,
    tide,
    quality,
    transform.swellFit,
    swellDirectionLabel,
    transform.modelWaveHeightFt
  );

  const sstC = marine.hourly.sea_surface_temperature?.[idx];
  const waterTempF =
    typeof sstC === "number" && Number.isFinite(sstC)
      ? Math.round(sstC * (9 / 5) + 32)
      : null;

  return {
    spot,
    fetchedAt: new Date().toISOString(),
    waveHeightFt: transform.waveHeightFt,
    wavePeriodSec,
    waveDirectionDeg,
    windSpeedMph,
    windDirectionDeg,
    windDirectionLabel,
    windType,
    swellHeightFt: transform.swellHeightFt,
    swellPeriodSec,
    swellDirectionDeg,
    swellDirectionLabel,
    tide,
    waterTempF,
    summary:
      waterTempF != null ? `${summary} Water ${waterTempF}°F.` : summary,
    quality,
    spotTransform: {
      modelWaveHeightFt: transform.modelWaveHeightFt,
      modelSwellHeightFt: transform.modelSwellHeightFt,
      swellFit: transform.swellFit,
      swellFitScore: transform.swellFitScore,
      breakType: transform.breakType,
      note: transform.note,
    },
  };
}

export function getDefaultSpot(): SurfSpot {
  const shoreBearing = process.env.DEFAULT_SHORE_BEARING;
  return {
    id: "hermosa",
    name: process.env.DEFAULT_SPOT_NAME ?? "Hermosa Beach",
    region: "South Bay",
    latitude: Number(process.env.DEFAULT_LAT ?? 33.862),
    longitude: Number(process.env.DEFAULT_LNG ?? -118.399),
    shoreBearingDeg: shoreBearing ? Number(shoreBearing) : 270,
  };
}
