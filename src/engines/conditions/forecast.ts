import type {
  DailyForecastDay,
  DailyForecastPeriod,
  ForecastPeriodId,
  SpotForecast,
  SurfSpot,
  TideInfo,
  WindType,
} from "@/lib/types";
import {
  classifyWind,
  degreesToCompass,
} from "./wind";
import { applySpotTransform } from "./spot-transform";
import { fetchJsonWithRetry } from "./fetch-timeout";
import { pickHourIndex } from "./time-index";
import { fetchTideInfo } from "./tide";

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
const CALM_WIND_MPH = 8;

const PERIODS: Array<{
  id: ForecastPeriodId;
  label: string;
  hour: number;
}> = [
  { id: "morning", label: "Morning", hour: 8 },
  { id: "afternoon", label: "Afternoon", hour: 13 },
  { id: "evening", label: "Evening", hour: 17 },
];

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

function readWindAt(
  weather: OpenMeteoWeatherResponse | null,
  dateKey: string,
  hour: number,
  shoreBearingDeg?: number
): {
  windSpeedMph: number;
  windDirectionLabel: string;
  windType: WindType;
} {
  if (!weather?.hourly.time?.length) {
    return {
      windSpeedMph: 0,
      windDirectionLabel: "Calm",
      windType: "unknown",
    };
  }

  const windIdx = pickHourIndex(weather.hourly.time, { dateKey, hour });
  if (windIdx < 0 || weather.hourly.wind_speed_10m?.[windIdx] == null) {
    return {
      windSpeedMph: 0,
      windDirectionLabel: "—",
      windType: "unknown",
    };
  }

  const rawWindMph =
    Math.round((weather.hourly.wind_speed_10m?.[windIdx] ?? 0) * 10) / 10;
  const windSpeedMph = rawWindMph < CALM_WIND_MPH ? 0 : rawWindMph;
  const windDirectionDeg = Math.round(
    weather.hourly.wind_direction_10m?.[windIdx] ?? 0
  );
  const windDirectionLabel =
    windSpeedMph === 0 ? "Calm" : degreesToCompass(windDirectionDeg);
  const windType = classifyWind(windDirectionDeg, shoreBearingDeg);

  return { windSpeedMph, windDirectionLabel, windType };
}

function buildPeriod(
  spot: SurfSpot,
  marine: OpenMeteoMarineResponse,
  weather: OpenMeteoWeatherResponse | null,
  dateKey: string,
  period: (typeof PERIODS)[number],
  tide: TideInfo | null
): DailyForecastPeriod | null {
  const idx = pickHourIndex(marine.hourly.time, {
    dateKey,
    hour: period.hour,
  });
  if (idx < 0) return null;

  const waveHeightFt = metersToFeet(marine.hourly.wave_height?.[idx] ?? 0.5);
  const { windSpeedMph, windDirectionLabel, windType } = readWindAt(
    weather,
    dateKey,
    period.hour,
    spot.shoreBearingDeg
  );
  const swellHeightFt = metersToFeet(
    marine.hourly.swell_wave_height?.[idx] ?? waveHeightFt / METERS_TO_FEET
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
    tide
  );
  const quality = assessQuality(
    transform.waveHeightFt,
    wavePeriodSec,
    windSpeedMph,
    windType,
    transform.swellFitScore
  );

  return {
    id: period.id,
    label: period.label,
    hour: period.hour,
    waveHeightFt: transform.waveHeightFt,
    wavePeriodSec,
    swellHeightFt: transform.swellHeightFt,
    swellPeriodSec,
    swellDirectionLabel,
    windSpeedMph,
    windDirectionLabel,
    windType,
    tideHeightFt: tide?.heightFt ?? null,
    tideTrend: tide?.trend ?? null,
    quality,
    swellFit: transform.swellFit,
  };
}

function periodToDaySummary(
  dateKey: string,
  periods: DailyForecastPeriod[]
): DailyForecastDay {
  const afternoon =
    periods.find((p) => p.id === "afternoon") ?? periods[0];
  const date = new Date(`${dateKey}T12:00:00`);

  return {
    date: dateKey,
    label: DAY_LABELS[date.getDay()],
    waveHeightFt: afternoon.waveHeightFt,
    wavePeriodSec: afternoon.wavePeriodSec,
    swellHeightFt: afternoon.swellHeightFt,
    swellPeriodSec: afternoon.swellPeriodSec,
    swellDirectionLabel: afternoon.swellDirectionLabel,
    windSpeedMph: afternoon.windSpeedMph,
    windDirectionLabel: afternoon.windDirectionLabel,
    windType: afternoon.windType,
    quality: afternoon.quality,
    swellFit: afternoon.swellFit,
    periods,
  };
}

export async function fetchSpotForecast(spot: SurfSpot): Promise<SpotForecast> {
  const marine = await fetchMarineForecast(spot);

  let weather: OpenMeteoWeatherResponse | null = null;
  try {
    weather = await fetchSurfaceWind(spot);
  } catch {
    weather = null;
  }

  const dates = uniqueDates(marine.hourly.time, 5);
  const days: DailyForecastDay[] = [];

  for (const dateKey of dates) {
    const tides = await Promise.all(
      PERIODS.map((period) =>
        fetchTideInfo(spot, {
          at: { dateKey, hour: period.hour, minute: 0 },
        })
      )
    );

    const periods: DailyForecastPeriod[] = [];
    for (let i = 0; i < PERIODS.length; i++) {
      const built = buildPeriod(
        spot,
        marine,
        weather,
        dateKey,
        PERIODS[i],
        tides[i]
      );
      if (built) periods.push(built);
    }

    if (!periods.length) continue;
    days.push(periodToDaySummary(dateKey, periods));
  }

  return {
    spot,
    fetchedAt: new Date().toISOString(),
    days,
  };
}
