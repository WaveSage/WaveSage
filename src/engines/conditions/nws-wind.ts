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
  { hourlyUrl: string; fetchedAt: number }
>();
const POINT_CACHE_MS = 6 * 60 * 60 * 1000;

const windCache = new Map<string, { wind: NwsWind; fetchedAt: number }>();
const WIND_CACHE_MS = 20 * 60 * 1000;

function cellKey(lat: number, lng: number): string {
  return `${lat.toFixed(2)},${lng.toFixed(2)}`;
}

function parseWindSpeed(value: string): number | null {
  const matches = value.match(/[\d.]+/g);
  if (!matches?.length) return null;
  const nums = matches.map(Number).filter((n) => Number.isFinite(n));
  if (!nums.length) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

function parseWindDirection(value: string): number | null {
  const deg = COMPASS_TO_DEG[value.trim().toUpperCase()];
  return deg == null ? null : deg;
}

interface NwsPointsResponse {
  properties?: { forecastHourly?: string };
}

interface NwsHourlyResponse {
  properties?: {
    periods?: Array<{
      startTime?: string;
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

async function hourlyUrlForSpot(spot: SurfSpot): Promise<string | null> {
  const key = cellKey(spot.latitude, spot.longitude);
  const cached = pointCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < POINT_CACHE_MS) {
    return cached.hourlyUrl;
  }

  const points = await fetchJson<NwsPointsResponse>(
    `https://api.weather.gov/points/${spot.latitude},${spot.longitude}`
  );
  const hourlyUrl = points.properties?.forecastHourly;
  if (!hourlyUrl) return null;

  pointCache.set(key, { hourlyUrl, fetchedAt: Date.now() });
  return hourlyUrl;
}

export async function fetchNwsWind(spot: SurfSpot): Promise<NwsWind | null> {
  const key = cellKey(spot.latitude, spot.longitude);
  const cached = windCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < WIND_CACHE_MS) {
    return cached.wind;
  }

  try {
    const hourlyUrl = await hourlyUrlForSpot(spot);
    if (!hourlyUrl) return null;

    const hourly = await fetchJson<NwsHourlyResponse>(hourlyUrl);
    const period = hourly.properties?.periods?.[0];
    if (!period?.windSpeed || !period.windDirection) return null;

    const speedMph = parseWindSpeed(period.windSpeed);
    const directionDeg = parseWindDirection(period.windDirection);
    if (speedMph == null || directionDeg == null) return null;

    const wind = { speedMph, directionDeg };
    windCache.set(key, { wind, fetchedAt: Date.now() });
    return wind;
  } catch {
    return null;
  }
}
