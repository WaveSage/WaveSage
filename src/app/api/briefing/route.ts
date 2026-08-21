import { NextResponse } from "next/server";
import { generateOpeningBriefing } from "@/engines/coach/briefing";
import { fetchSurfConditions, getDefaultSpot } from "@/engines/conditions";
import { getGuestProfile, GUEST_SPOT_ID } from "@/lib/auth/guest";
import { getSessionUserId } from "@/lib/auth/session";
import { findUserById } from "@/lib/auth/users";
import { toUserProfile } from "@/lib/auth/types";
import type { CoachPeriod } from "@/lib/coach-period";
import type { SurfConditions } from "@/lib/types";
import { getSpotById } from "@/lib/socal-spots";

export async function POST(request: Request) {
  try {
    const userId = await getSessionUserId();
    const body = (await request.json()) as {
      spotId?: string;
      regionalConditions?: SurfConditions[];
      coachPeriod?: CoachPeriod;
    };

    let profile = getGuestProfile();
    let spot = getSpotById(GUEST_SPOT_ID) ?? getDefaultSpot();

    if (userId) {
      const user = await findUserById(userId);
      if (!user) {
        return NextResponse.json({ error: "User not found." }, { status: 404 });
      }
      profile = toUserProfile(user);
      spot =
        (body.spotId ? getSpotById(body.spotId) : null) ??
        user.favoriteSpot ??
        getDefaultSpot();
    } else {
      // Guests may only preview Lower Trestles.
      if (body.spotId && body.spotId !== GUEST_SPOT_ID) {
        return NextResponse.json(
          { error: "Sign in to view other spots." },
          { status: 401 }
        );
      }
      spot = getSpotById(GUEST_SPOT_ID) ?? spot;
    }

    const conditions =
      body.regionalConditions?.find((c) => c.spot.id === spot.id) ??
      (await fetchSurfConditions(spot));

    const coachPeriod = body.coachPeriod ?? "morning";

    const briefing = await generateOpeningBriefing(
      conditions,
      coachPeriod,
      profile
    );

    return NextResponse.json({
      message: briefing.message,
      conditions,
      styleOutlook: briefing.styleOutlook,
      source: briefing.source,
      guest: !userId,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Briefing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
