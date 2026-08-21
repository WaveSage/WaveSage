import type {
  DailyForecastDay,
  SpotForecast,
  SurfSpot,
  WindType,
} from "@/lib/types";
import {
  classifyWind,
  degreesToCompass,
} from "./wind";
import { applySpotTransform } from "./spot-transform";
import { fetchJsonWithRetry } from "./fetch-timeout";

interface OpenMeteoMarineResponse {
  hourly: {
    time: string[];
    wave_height?: number[];
    wave_period?: number[];
    wave_direction?: number[];
    swell_wave_height?: number[];
    swell_wave_direction?: number[];
    swell_wave_period?: number[];
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
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function metersToFeet(m: number): number {
  return Math.round(m * METERS_TO_FEET * 10) / 10;
}

function assessQuality(
  waveHeightFt: number,
  wavePeriodSec: number,
  windSpeedMph: number,
  windType: WindType,
  swellFitScore = 1
): DailyForecastDay["quality"] {
  if (waveHeightFt < 1 || wavePeriodSec < 6) return "poor";
  if (swellFitScore < 0.35) return "poor";

  const calmOffshore = windSpeedMph < 8 && windType === "offshore";
  const lightWind = windSpeedMph < 12 && windType !== "onshore";

  let quality: DailyForecastDay["quality"] = "fair";
  if (waveHeightFt >= 4 && wavePeriodSec >= 12 && calmOffshore) quality = "epic";
  else if (waveHeightFt >= 2 && wavePeriodSec >= 9 && lightWind) quality = "good";
  else if (windType === "onshore" && windSpeedMph > 10) quality = "poor";

  if (swellFitScore < 0.5 && quality === "good") quality = "fair";
  if (swellFitScore < 0.5 && quality === "epic") quality = "good";

  return quality;
}

function pickMiddayIndex(times: string[], dateKey: string): number {
  const target = new Date(`${dateKey}T13:00:00`);
  let bestIndex = -1;
  let bestDiff = Number.POSITIVE_INFINITY;

  for (let i = 0; i < times.length; i++) {
    if (!times[i].startsWith(dateKey)) continue;
    const diff = Math.abs(new Date(times[i]).getTime() - target.getTime());
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIndex = i;
    }
  }

  return bestIndex;
}

function uniqueDates(times: string[], maxDays: number): string[] {
  const dates: string[] = [];
  for (const time of times) {
    const date = time.slice(0, 10);
    if (!dates.includes(date)) dates.push(date);
    if (dates.length >= maxDays) break;
  }
  return dates;
}

async function fetchMarineForecast(spot: SurfSpot) {
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
    ].join(","),
    timezone: "America/Los_Angeles",
    forecast_days: "5",
  });

  const url = `https://marine-api.open-meteo.com/v1/marine?${params}`;
  return fetchJsonWithRetry<OpenMeteoMarineResponse>(url, "Marine forecast");
}

async function fetchSurfaceWind(spot: SurfSpot) {
  const params = new URLSearchParams({
    latitude: String(spot.latitude),
    longitude: String(spot.longitude),
    hourly: "wind_speed_10m,wind_direction_10m",
    wind_speed_unit: "mph",
    timezone: "America/Los_Angeles",
    forecast_days: "5",
  });

  const url = `https://api.open-meteo.com/v1/forecast?${params}`;
  return fetchJsonWithRetry<OpenMeteoWeatherResponse>(url, "Weather forecast");
}

export async function fetchSpotForecast(spot: SurfSpot): Promise<SpotForecast> {
  const [marine, weather] = await Promise.all([
    fetchMarineForecast(spot),
    fetchSurfaceWind(spot),
  ]);

  const dates = uniqueDates(marine.hourly.time, 5);
  const days: DailyForecastDay[] = [];

  for (const dateKey of dates) {
    const idx = pickMiddayIndex(marine.hourly.time, dateKey);
    if (idx < 0) continue;

    const windIdx = pickMiddayIndex(weather.hourly.time, dateKey);
    const waveHeightFt = metersToFeet(marine.hourly.wave_height?.[idx] ?? 0.5);
    const windSpeedMph =
      Math.round((weather.hourly.wind_speed_10m?.[windIdx] ?? 0) * 10) / 10;
    const windDirectionDeg = Math.round(
      weather.hourly.wind_direction_10m?.[windIdx] ?? 0
    );
    const windDirectionLabel = degreesToCompass(windDirectionDeg);
    const windType = classifyWind(windDirectionDeg, spot.shoreBearingDeg);
    const swellHeightFt = metersToFeet(
      marine.hourly.swell_wave_height?.[idx] ??
        waveHeightFt / METERS_TO_FEET
    );
    const combinedPeriodSec = Math.round(marine.hourly.wave_period?.[idx] ?? 8);
    const swellPeriodRaw = Math.round(
      marine.hourly.swell_wave_period?.[idx] ?? 0
    );
    const wavePeriodSec = Math.max(
      combinedPeriodSec,
      swellPeriodRaw >= 6 ? swellPeriodRaw : 0
    );
    const swellPeriodSec = wavePeriodSec;
    const waveDirectionDeg = Math.round(marine.hourly.wave_direction?.[idx] ?? 0);
    const marineSwellDir = marine.hourly.swell_wave_direction?.[idx];
    const swellHeightM = marine.hourly.swell_wave_height?.[idx] ?? 0;
    const preferSwellComponent =
      swellHeightM > 0.05 &&
      swellPeriodRaw >= 6 &&
      swellPeriodRaw >= combinedPeriodSec;
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
      null
    );
    const quality = assessQuality(
      transform.waveHeightFt,
      wavePeriodSec,
      windSpeedMph,
      windType,
      transform.swellFitScore
    );

    const date = new Date(`${dateKey}T12:00:00`);
    days.push({
      date: dateKey,
      label: DAY_LABELS[date.getDay()],
      waveHeightFt: transform.waveHeightFt,
      wavePeriodSec,
      swellHeightFt: transform.swellHeightFt,
      swellPeriodSec,
      swellDirectionLabel,
      windSpeedMph,
      windDirectionLabel,
      windType,
      quality,
      swellFit: transform.swellFit,
    });
  }

  return {
    spot,
    fetchedAt: new Date().toISOString(),
    days,
  };
}
