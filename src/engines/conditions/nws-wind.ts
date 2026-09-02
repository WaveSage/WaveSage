import type { SurfSpot } from "@/lib/types";
import { fetchWithTimeout } from "./fetch-timeout";

const NWS_HEADERS = {
  Accept: "application/geo+json",
  "User-Agent": "WaveSage/1.0 (https://www.wavesage.app)",
};

const COMPASS_TO_DEG: Record<string, number> = {
  N: 0,
  NNE: 22.5,
  NE: 45,
  ENE: 67.5,
  E: 90,
  ESE: 112.5,
  SE: 135,
  SSE: 157.5,
  S: 180,
  SSW: 202.5,
  SW: 225,
  WSW: 247.5,
  W: 270,
  WNW: 292.5,
  NW: 315,
  NNW: 337.5,
};

export interface NwsWind {
  speedMph: number;
  directionDeg: number;
}

const pointCache = new Map<
  string,
  { hourlyUrl: string; stationsUrl?: string; fetchedAt: number }
>();
const POINT_CACHE_MS = 6 * 60 * 60 * 1000;

const windCache = new Map<string, { wind: NwsWind; fetchedAt: number }>();
const WIND_CACHE_MS = 10 * 60 * 1000;

function cellKey(lat: number, lng: number): string {
  return `${lat.toFixed(2)},${lng.toFixed(2)}`;
}

function parseForecastSpeed(value: string): number | null {
  if (/calm/i.test(value)) return 0;
  const matches = value.match(/[\d.]+/g);
  if (!matches?.length) return null;
  const nums = matches.map(Number).filter((n) => Number.isFinite(n));
  if (!nums.length) return null;
  return Math.round(Math.min(...nums) * 10) / 10;
}

function parseCompass(value: string): number | null {
  const deg = COMPASS_TO_DEG[value.trim().toUpperCase()];
  return deg == null ? null : deg;
}

function toMph(
  value: number | null | undefined,
  unitCode?: string | null
): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  const unit = (unitCode ?? "").toLowerCase();
  if (unit.includes("m_s-1") || unit.includes("m/s")) {
    return Math.round(value * 2.23694 * 10) / 10;
  }
  if (unit.includes("km_h") || unit.includes("km/h")) {
    return Math.round(value * 0.621371 * 10) / 10;
  }
  return Math.round(value * 10) / 10;
}

interface NwsPointsResponse {
  properties?: {
    forecastHourly?: string;
    observationStations?: string;
  };
}

interface NwsStationsResponse {
  features?: Array<{
    properties?: { stationIdentifier?: string };
  }>;
}

interface NwsObservationResponse {
  properties?: {
    windSpeed?: { value?: number | null; unitCode?: string };
    windDirection?: { value?: number | null };
  };
}

interface NwsHourlyResponse {
  properties?: {
    periods?: Array<{
      windSpeed?: string;
      windDirection?: string;
    }>;
  };
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetchWithTimeout(url, {
    headers: NWS_HEADERS,
    cache: "no-store",
    timeoutMs: 8_000,
  });
  if (!response.ok) {
    throw new Error(`NWS unavailable (${response.status})`);
  }
  return (await response.json()) as T;
}

async function pointsForSpot(spot: SurfSpot) {
  const key = cellKey(spot.latitude, spot.longitude);
  const cached = pointCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < POINT_CACHE_MS) {
    return cached;
  }

  const points = await fetchJson<NwsPointsResponse>(
    `https://api.weather.gov/points/${spot.latitude},${spot.longitude}`
  );
  const hourlyUrl = points.properties?.forecastHourly;
  if (!hourlyUrl) return null;

  const entry = {
    hourlyUrl,
    stationsUrl: points.properties?.observationStations,
    fetchedAt: Date.now(),
  };
  pointCache.set(key, entry);
  return entry;
}

async function fetchObservedWind(spot: SurfSpot): Promise<NwsWind | null> {
  const points = await pointsForSpot(spot);
  if (!points?.stationsUrl) return null;

  const stations = await fetchJson<NwsStationsResponse>(points.stationsUrl);
  const stationId = stations.features?.[0]?.properties?.stationIdentifier;
  if (!stationId) return null;

  const obs = await fetchJson<NwsObservationResponse>(
    `https://api.weather.gov/stations/${stationId}/observations/latest`
  );
  const speedMph = toMph(
    obs.properties?.windSpeed?.value,
    obs.properties?.windSpeed?.unitCode
  );
  // Missing station wind — fall through to hourly forecast / Open-Meteo.
  if (speedMph == null) return null;

  const directionDeg = obs.properties?.windDirection?.value;
  if (directionDeg == null || !Number.isFinite(directionDeg)) {
    return { speedMph, directionDeg: 0 };
  }
  return { speedMph, directionDeg: Math.round(directionDeg) };
}

async function fetchForecastWind(spot: SurfSpot): Promise<NwsWind | null> {
  const points = await pointsForSpot(spot);
  if (!points?.hourlyUrl) return null;

  const hourly = await fetchJson<NwsHourlyResponse>(points.hourlyUrl);
  const period = hourly.properties?.periods?.[0];
  if (!period?.windSpeed) return null;

  const speedMph = parseForecastSpeed(period.windSpeed);
  const directionDeg = period.windDirection
    ? parseCompass(period.windDirection)
    : 0;
  if (speedMph == null) return null;
  return { speedMph, directionDeg: directionDeg ?? 0 };
}

export async function fetchNwsWind(spot: SurfSpot): Promise<NwsWind | null> {
  const key = cellKey(spot.latitude, spot.longitude);
  const cached = windCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < WIND_CACHE_MS) {
    return cached.wind;
  }

  try {
    const observed = await fetchObservedWind(spot);
    const wind = observed ?? (await fetchForecastWind(spot));
    if (!wind) return null;
    windCache.set(key, { wind, fetchedAt: Date.now() });
    return wind;
  } catch {
    return null;
  }
}
