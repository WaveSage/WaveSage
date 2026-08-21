import type { RegionalForecast, SurfConditions, SurfSpot } from "@/lib/types";
import { SOCAL_REGION, SOCAL_SPOTS } from "@/lib/socal-spots";
import { fetchSurfConditions } from "./index";

const QUALITY_RANK: Record<SurfConditions["quality"], number> = {
  epic: 4,
  good: 3,
  fair: 2,
  poor: 1,
};

const REGIONAL_CACHE_MS = 2 * 60 * 1000;
const REGIONAL_BATCH_SIZE = 3;

let regionalCache: { forecast: RegionalForecast; fetchedAt: number } | null =
  null;
let regionalFetchInFlight: Promise<RegionalForecast> | null = null;

async function runBatched<T, R>(
  items: T[],
  batchSize: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }

  return results;
}

function sortConditions(conditions: SurfConditions[]): SurfConditions[] {
  return [...conditions].sort((a, b) => {
    const qualityDiff = QUALITY_RANK[b.quality] - QUALITY_RANK[a.quality];
    if (qualityDiff !== 0) return qualityDiff;
    return b.waveHeightFt - a.waveHeightFt;
  });
}

async function fetchRegionalConditionsUncached(
  spots: SurfSpot[]
): Promise<RegionalForecast> {
  const settled = await runBatched(spots, REGIONAL_BATCH_SIZE, async (spot) => {
    try {
      return await fetchSurfConditions(spot, { includeTide: true });
    } catch {
      return null;
    }
  });

  const conditions = sortConditions(
    settled.filter((item): item is SurfConditions => item !== null)
  );

  return {
    region: SOCAL_REGION,
    fetchedAt: new Date().toISOString(),
    conditions,
  };
}

export async function fetchRegionalConditions(
  spots: SurfSpot[] = SOCAL_SPOTS
): Promise<RegionalForecast> {
  if (
    regionalCache &&
    Date.now() - regionalCache.fetchedAt < REGIONAL_CACHE_MS
  ) {
    return regionalCache.forecast;
  }

  if (regionalFetchInFlight) {
    return regionalFetchInFlight;
  }

  regionalFetchInFlight = fetchRegionalConditionsUncached(spots)
    .then((forecast) => {
      if (forecast.conditions.length > 0) {
        regionalCache = { forecast, fetchedAt: Date.now() };
      }
      return forecast;
    })
    .finally(() => {
      regionalFetchInFlight = null;
    });

  return regionalFetchInFlight;
}

export { SOCAL_SPOTS, SOCAL_REGION };
