import { NextResponse } from "next/server";
import { fetchSurfConditions } from "@/engines/conditions";
import { getPacificNowParts } from "@/engines/conditions/pacific-time";
import { pacificDateKeyPlusDays } from "@/engines/coach/future-forecast";
import { getTemplateStyleCoachResult } from "@/engines/coach/style-coach";
import { getSessionUserId } from "@/lib/auth/session";
import { findUserById } from "@/lib/auth/users";
import { toUserProfile } from "@/lib/auth/types";
import { getSpotById } from "@/lib/socal-spots";
import type { HourlySurfPoint } from "@/lib/types";

function formatHourLabel(hour: number): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const suffix = hour < 12 ? "AM" : "PM";
  return `${h12} ${suffix}`;
}

export async function GET(request: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }

    const user = await findUserById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    const profile = toUserProfile(user);

    const { searchParams } = new URL(request.url);
    const spotId =
      searchParams.get("spotId") ??
      user.favoriteSpot?.id ??
      "tamarack";
    const count = Math.min(
      12,
      Math.max(4, Number(searchParams.get("hours") ?? 8) || 8)
    );

    const spot = getSpotById(spotId) ?? user.favoriteSpot;
    if (!spot) {
      return NextResponse.json({ error: "Spot not found." }, { status: 404 });
    }

    const now = getPacificNowParts();
    const targets: { dateKey: string; hour: number }[] = [];
    for (let i = 0; i < count; i++) {
      let hour = now.hour + i;
      let dateKey = now.dateKey;
      if (hour > 23) {
        hour -= 24;
        dateKey = pacificDateKeyPlusDays(1);
      }
      targets.push({ dateKey, hour });
    }

    const points: HourlySurfPoint[] = [];
    const batchSize = 4;
    for (let i = 0; i < targets.length; i += batchSize) {
      const batch = targets.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map(async (target) => {
          const conditions = await fetchSurfConditions(spot, {
            at: { dateKey: target.dateKey, hour: target.hour, minute: 0 },
            includeTide: true,
          });
          const style = getTemplateStyleCoachResult(conditions, profile);
          return {
            hour: target.hour,
            minute: 0,
            label: formatHourLabel(target.hour),
            dateKey: target.dateKey,
            waveHeightFt: conditions.waveHeightFt,
            wavePeriodSec: conditions.wavePeriodSec,
            windSpeedMph: conditions.windSpeedMph,
            windDirectionLabel: conditions.windDirectionLabel,
            windType: conditions.windType,
            swellHeightFt: conditions.swellHeightFt,
            swellPeriodSec: conditions.swellPeriodSec,
            swellDirectionLabel: conditions.swellDirectionLabel,
            swellDirectionDeg: conditions.swellDirectionDeg,
            tideHeightFt: conditions.tide?.heightFt ?? null,
            tideTrend: conditions.tide?.trend ?? null,
            quality: conditions.quality,
            styleFitScore: style.style_fit_score,
          } satisfies HourlySurfPoint;
        })
      );
      points.push(...results);
    }

    return NextResponse.json({
      spot,
      fetchedAt: new Date().toISOString(),
      points,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Hourly forecast failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
