import { NextResponse } from "next/server";
import { generateProfileCoachResponse } from "@/engines/coach/profile-coach";
import { fetchSurfConditions, getDefaultSpot } from "@/engines/conditions";
import { fetchRegionalConditions } from "@/engines/conditions/regional";
import { getSessionUserId } from "@/lib/auth/session";
import { findUserById } from "@/lib/auth/users";
import { toUserProfile } from "@/lib/auth/types";
import type { SurfConditions, ChatMessage } from "@/lib/types";
import { getSpotById, matchSpotInMessage } from "@/lib/socal-spots";
import { resolveSpotFromConversation, isDetailedConditionsRequest } from "@/engines/coach/topic-guard";

function resolveActiveConditions(
  message: string,
  activeSpotId: string | undefined,
  favoriteSpotId: string | undefined,
  regional: SurfConditions[],
  history?: ChatMessage[]
): SurfConditions | null {
  const fromMessage = matchSpotInMessage(message);
  if (fromMessage) {
    return regional.find((c) => c.spot.id === fromMessage.id) ?? null;
  }

  if (activeSpotId && isDetailedConditionsRequest(message)) {
    const fromActive = regional.find((c) => c.spot.id === activeSpotId);
    if (fromActive) return fromActive;
    return null;
  }

  const fromHistory = resolveSpotFromConversation(message, history);
  if (fromHistory) {
    return regional.find((c) => c.spot.id === fromHistory.id) ?? null;
  }

  if (activeSpotId) {
    const fromActive = regional.find((c) => c.spot.id === activeSpotId);
    if (fromActive) return fromActive;
  }

  if (favoriteSpotId) {
    const fromDefault = regional.find((c) => c.spot.id === favoriteSpotId);
    if (fromDefault) return fromDefault;
  }

  return regional[0] ?? null;
}

export async function POST(request: Request) {
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

    const body = (await request.json()) as {
      message?: string;
      spotId?: string;
      regionalConditions?: SurfConditions[];
      coachPeriod?: "morning" | "afternoon" | "evening";
      conversationHistory?: ChatMessage[];
    };

    const message = body.message?.trim();
    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const regional =
      body.regionalConditions?.length
        ? body.regionalConditions
        : (await fetchRegionalConditions()).conditions;

    let conditions = resolveActiveConditions(
      message,
      body.spotId,
      profile.favoriteSpot?.id,
      regional,
      body.conversationHistory
    );

    if (!conditions) {
      const spot =
        matchSpotInMessage(message) ??
        (body.spotId && isDetailedConditionsRequest(message)
          ? getSpotById(body.spotId)
          : null) ??
        resolveSpotFromConversation(message, body.conversationHistory) ??
        (body.spotId ? getSpotById(body.spotId) : null) ??
        (profile.favoriteSpot?.id
          ? getSpotById(profile.favoriteSpot.id) ?? profile.favoriteSpot
          : null) ??
        getDefaultSpot();
      conditions = await fetchSurfConditions(spot);
    }

    const coach = await generateProfileCoachResponse({
      userMessage: message,
      conditions,
      profile,
      regionalConditions: regional,
      coachPeriod: body.coachPeriod,
      conversationHistory: body.conversationHistory,
    });

    return NextResponse.json(coach);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Coach request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
