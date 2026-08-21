import type { UserProfile } from "@/lib/auth/types";
import { getSpotById } from "@/lib/socal-spots";

/** Fixed preview spot for visitors who are not signed in. */
export const GUEST_SPOT_ID = "trestles";

export function getGuestSpot() {
  const spot = getSpotById(GUEST_SPOT_ID);
  if (!spot) {
    throw new Error("Guest spot (Lower Trestles) is missing from the catalog.");
  }
  return spot;
}

/** Synthetic profile used only for guest briefings / style scoring. */
export function getGuestProfile(): UserProfile {
  const spot = getGuestSpot();
  return {
    id: "guest",
    email: "",
    username: "guest",
    name: "Guest",
    age: 25,
    experienceLevel: "intermediate",
    stylePreference: "carving",
    favoriteSpot: spot,
    favoriteSpotIds: [spot.id],
    emailVerified: false,
  };
}
