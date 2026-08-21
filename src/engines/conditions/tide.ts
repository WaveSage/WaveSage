import type { SurfSpot, TideInfo } from "@/lib/types";
import {
  getPacificNowParts,
  parseNoaaPacificTime,
} from "./pacific-time";
import { SPOT_TIDE_STATIONS, type MappedTideStation } from "./tide-stations";

interface NoaaStation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type?: string;
  reference_id?: string;
}

interface NoaaStationsResponse {
  stations: {
    id: string;
    name: string;
    lat: number;
    lng: number;
    type?: string;
    reference_id?: string;
  }[];
}

interface NoaaPrediction {
  t: string;
  v: string;
  type?: "H" | "L";
}

interface NoaaPredictionsResponse {
  predictions?: NoaaPrediction[];
  error?: { message: string };
}

const EARTH_RADIUS_KM = 6371;
const MAX_STATION_DISTANCE_KM = 80;
const MAX_STATION_CANDIDATES = 5;

let stationsCache: { stations: NoaaStation[]; fetchedAt: number } | null = null;
const STATIONS_CACHE_MS = 24 * 60 * 60 * 1000;

const predictionCache = new Map<
  string,
  { predictions: NoaaPrediction[]; fetchedAt: number }
>();
const PREDICTION_CACHE_MS = 30 * 60 * 1000;

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isUsCoastalSpot(spot: SurfSpot): boolean {
  return (
    spot.latitude >= 24 &&
    spot.latitude <= 50 &&
    spot.longitude <= -65 &&
    spot.longitude >= -130
  );
}

async function loadNoaaStations(): Promise<NoaaStation[]> {
  if (
    stationsCache &&
    Date.now() - stationsCache.fetchedAt < STATIONS_CACHE_MS
  ) {
    return stationsCache.stations;
  }

  const url =
    "https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json?type=tidepredictions";
  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    throw new Error(`NOAA stations unavailable (${response.status})`);
  }

  const data = (await response.json()) as NoaaStationsResponse;
  const stations = data.stations.map((s) => ({
    id: s.id,
    name: s.name,
    lat: s.lat,
    lng: s.lng,
    type: s.type,
    reference_id: s.reference_id || undefined,
  }));

  stationsCache = { stations, fetchedAt: Date.now() };
  return stations;
}

function resolvePredictionStationId(station: NoaaStation): string {
  if (station.type === "S" && station.reference_id) {
    return station.reference_id;
  }
  return station.id;
}

function findNearestStations(
  spot: SurfSpot,
  stations: NoaaStation[]
): { station: NoaaStation; distanceKm: number }[] {
  return stations
    .map((station) => ({
      station,
      distanceKm: haversineKm(
        spot.latitude,
        spot.longitude,
        station.lat,
        station.lng
      ),
    }))
    .filter((entry) => entry.distanceKm <= MAX_STATION_DISTANCE_KM)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, MAX_STATION_CANDIDATES);
}

function pickClosestPredictionIndex(
  times: string[],
  at?: { dateKey: string; hour: number; minute?: number }
): number {
  if (!times.length) return 0;

  const target = at
    ? {
        dateKey: at.dateKey,
        hour: at.hour,
        minute: at.minute ?? 0,
      }
    : getPacificNowParts();
  const nowTotal = target.hour * 60 + target.minute;
  let bestIndex = 0;
  let bestDiff = Number.POSITIVE_INFINITY;

  for (let i = 0; i < times.length; i++) {
    const parsed = parseNoaaPacificTime(times[i]);
    const predTotal = parsed.hour * 60 + parsed.minute;
    const dayDiff =
      parsed.dateKey === target.dateKey
        ? 0
        : parsed.dateKey < target.dateKey
          ? -1
          : 1;
    const diffMinutes = Math.abs(dayDiff * 24 * 60 + (predTotal - nowTotal));

    if (diffMinutes < bestDiff) {
      bestDiff = diffMinutes;
      bestIndex = i;
    }
  }

  return bestIndex;
}

function inferTideTrend(
  predictions: NoaaPrediction[],
  index: number
): TideInfo["trend"] {
  const current = predictions[index];
  if (!current) return "rising";

  if (current.type === "H") return "high";
  if (current.type === "L") return "low";

  const height = Number(current.v);
  const prev = predictions[index - 1];
  const next = predictions[index + 1];
  const prevHeight = prev ? Number(prev.v) : height;
  const nextHeight = next ? Number(next.v) : height;

  if (nextHeight > height) return "rising";
  if (nextHeight < height) return "falling";
  if (prevHeight > height) return "falling";
  if (prevHeight < height) return "rising";

  return "rising";
}

function interpolateTideHeight(
  predictions: NoaaPrediction[],
  index: number,
  at?: { dateKey: string; hour: number; minute?: number }
): number {
  const current = predictions[index];
  const next = predictions[index + 1];
  if (!current) return 0;
  if (!next) return Number(current.v);

  const target = at
    ? {
        dateKey: at.dateKey,
        hour: at.hour,
        minute: at.minute ?? 0,
      }
    : getPacificNowParts();
  const start = parseNoaaPacificTime(current.t);
  const end = parseNoaaPacificTime(next.t);

  const startMinutes = start.hour * 60 + start.minute;
  const endMinutes = end.hour * 60 + end.minute;
  const nowMinutes = target.hour * 60 + target.minute;

  if (start.dateKey !== target.dateKey || end.dateKey !== target.dateKey) {
    return Number(current.v);
  }

  if (nowMinutes <= startMinutes) return Number(current.v);
  if (nowMinutes >= endMinutes) return Number(next.v);

  const span = endMinutes - startMinutes;
  if (span <= 0) return Number(current.v);

  const frac = (nowMinutes - startMinutes) / span;
  const startHeight = Number(current.v);
  const endHeight = Number(next.v);

  return startHeight + frac * (endHeight - startHeight);
}

async function fetchPredictions(
  stationId: string,
  dateKey?: string
): Promise<NoaaPrediction[] | null> {
  const key = (dateKey ?? getPacificNowParts().dateKey).replace(/-/g, "");
  const cacheKey = `${stationId}:${key}`;
  const cached = predictionCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < PREDICTION_CACHE_MS) {
    return cached.predictions;
  }

  // NOAA `date=` only accepts today/latest/recent — not yyyyMMdd.
  // Use begin_date + range for a specific Pacific calendar day.
  const params = new URLSearchParams({
    begin_date: key,
    range: "24",
    station: stationId,
    product: "predictions",
    datum: "MLLW",
    time_zone: "lst_ldt",
    interval: "h",
    units: "english",
    format: "json",
  });

  const url = `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?${params}`;
  const response = await fetch(url, {
    next: { revalidate: 1800 },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) return null;

  const data = (await response.json()) as NoaaPredictionsResponse;
  if (data.error?.message || !data.predictions?.length) return null;

  predictionCache.set(cacheKey, {
    predictions: data.predictions,
    fetchedAt: Date.now(),
  });
  return data.predictions;
}

function tideFromPredictions(
  predictions: NoaaPrediction[],
  station: MappedTideStation | NoaaStation,
  distanceKm: number,
  at?: { dateKey: string; hour: number; minute?: number }
): TideInfo {
  const idx = pickClosestPredictionIndex(
    predictions.map((p) => p.t),
    at
  );
  const heightFt =
    Math.round(interpolateTideHeight(predictions, idx, at) * 10) / 10;
  const trend = inferTideTrend(predictions, idx);

  return {
    heightFt,
    trend,
    stationName: station.name,
    stationDistanceKm: Math.round(distanceKm * 10) / 10,
  };
}

async function fetchTideForStation(
  spot: SurfSpot,
  station: MappedTideStation,
  at?: { dateKey: string; hour: number; minute?: number }
): Promise<TideInfo | null> {
  const predictions = await fetchPredictions(station.id, at?.dateKey);
  if (!predictions) return null;

  const distanceKm = haversineKm(
    spot.latitude,
    spot.longitude,
    station.lat,
    station.lng
  );

  return tideFromPredictions(predictions, station, distanceKm, at);
}

export async function fetchTideInfo(
  spot: SurfSpot,
  options?: { at?: { dateKey: string; hour: number; minute?: number } }
): Promise<TideInfo | null> {
  if (!isUsCoastalSpot(spot)) return null;
  const at = options?.at;

  try {
    const mapped = SPOT_TIDE_STATIONS[spot.id];
    if (mapped) {
      const tide = await fetchTideForStation(spot, mapped, at);
      if (tide) return tide;
    }

    const stations = await loadNoaaStations();
    const nearest = findNearestStations(spot, stations);
    if (!nearest.length) return null;

    for (const candidate of nearest) {
      const stationId = resolvePredictionStationId(candidate.station);
      const predictions = await fetchPredictions(stationId, at?.dateKey);
      if (!predictions) continue;

      return tideFromPredictions(
        predictions,
        candidate.station,
        candidate.distanceKm,
        at
      );
    }

    return null;
  } catch {
    return null;
  }
}
