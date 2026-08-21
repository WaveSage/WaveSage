import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import {
  findUserById,
  updateUserFavoriteSpotIds,
  updateUserFavoriteSpot,
  updateUserProfile,
} from "@/lib/auth/users";
import {
  toUserProfile,
  type ExperienceLevel,
  type StylePreference,
} from "@/lib/auth/types";
import type { SurfSpot } from "@/lib/types";
import { getSpotById } from "@/lib/socal-spots";

const EXPERIENCE_LEVELS = new Set<ExperienceLevel>([
  "beginner",
  "intermediate",
  "advanced",
  "pro",
]);

const STYLE_PREFERENCES = new Set<StylePreference>([
  "cruise",
  "trim",
  "carving",
]);

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const user = await findUserById(userId);
  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  return NextResponse.json({ user: toUserProfile(user) });
}

export async function PATCH(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = (await request.json()) as {
    favoriteSpot?: SurfSpot;
    favoriteSpotIds?: string[];
    name?: string;
    age?: number;
    experienceLevel?: ExperienceLevel;
    stylePreference?: StylePreference;
  };

  if (Array.isArray(body.favoriteSpotIds)) {
    const raw = body.favoriteSpotIds.filter((x) => typeof x === "string");
    if (raw.length < 1 || raw.length > 5) {
      return NextResponse.json(
        { error: "favoriteSpotIds must contain 1–5 spot ids." },
        { status: 400 }
      );
    }

    // Validate ids exist.
    const unique: string[] = [];
    for (const id of raw) {
      if (!unique.includes(id) && getSpotById(id)) unique.push(id);
    }
    if (unique.length < 1 || unique.length > 5) {
      return NextResponse.json(
        { error: "favoriteSpotIds contains invalid spot ids." },
        { status: 400 }
      );
    }

    const user = await updateUserFavoriteSpotIds(userId, unique);
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    return NextResponse.json({ user: toUserProfile(user) });
  }

  if (body.favoriteSpot?.id) {
    const user = await updateUserFavoriteSpot(userId, body.favoriteSpot);
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    return NextResponse.json({ user: toUserProfile(user) });
  }

  const name =
    typeof body.name === "string" ? body.name.trim() : undefined;
  const age =
    typeof body.age === "number" && Number.isFinite(body.age)
      ? Math.round(body.age)
      : undefined;

  if (name !== undefined && (name.length < 1 || name.length > 80)) {
    return NextResponse.json(
      { error: "Name must be between 1 and 80 characters." },
      { status: 400 }
    );
  }
  if (age !== undefined && (age < 13 || age > 120)) {
    return NextResponse.json(
      { error: "Age must be between 13 and 120." },
      { status: 400 }
    );
  }
  if (
    body.experienceLevel !== undefined &&
    !EXPERIENCE_LEVELS.has(body.experienceLevel)
  ) {
    return NextResponse.json(
      { error: "Invalid experience level." },
      { status: 400 }
    );
  }
  if (
    body.stylePreference !== undefined &&
    !STYLE_PREFERENCES.has(body.stylePreference)
  ) {
    return NextResponse.json(
      { error: "Invalid style preference." },
      { status: 400 }
    );
  }

  if (
    name === undefined &&
    age === undefined &&
    body.experienceLevel === undefined &&
    body.stylePreference === undefined
  ) {
    return NextResponse.json(
      { error: "No profile fields to update." },
      { status: 400 }
    );
  }

  const user = await updateUserProfile(userId, {
    name,
    age,
    experienceLevel: body.experienceLevel,
    stylePreference: body.stylePreference,
  });
  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  return NextResponse.json({ user: toUserProfile(user) });
}
