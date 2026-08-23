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
const REGIONAL_BATCH_SIZE = 4;
const REGIONAL_DEADLINE_MS = 22_000;

let regionalCache: { forecast: RegionalForecast; fetchedAt: number } | null =
  null;
let regionalFetchInFlight: Promise<RegionalForecast> | null = null;

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
  const collected: SurfConditions[] = [];
  const deadline = Date.now() + REGIONAL_DEADLINE_MS;

  for (let i = 0; i < spots.length; i += REGIONAL_BATCH_SIZE) {
    if (Date.now() > deadline && collected.length > 0) break;

    const batch = spots.slice(i, i + REGIONAL_BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (spot) => {
        try {
          return await fetchSurfConditions(spot, { includeTide: true });
        } catch {
          return null;
        }
      })
    );

    for (const item of batchResults) {
      if (item) collected.push(item);
    }
  }

  return {
    region: SOCAL_REGION,
    fetchedAt: new Date().toISOString(),
    conditions: sortConditions(collected),
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
