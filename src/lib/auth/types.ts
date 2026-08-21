import type { SurfSpot } from "@/lib/types";

export type ExperienceLevel = "beginner" | "intermediate" | "advanced" | "pro";

export type StylePreference = "cruise" | "trim" | "carving";

export interface UserRecord {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  name: string;
  age: number;
  experienceLevel: ExperienceLevel;
  stylePreference: StylePreference;
  favoriteSpot?: SurfSpot;
  /** Up to 5 spots shown in the Sage top rail (by spot id). */
  favoriteSpotIds?: string[];
  emailVerified: boolean;
  verificationToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: string;
  createdAt: string;
}

/** Safe user object returned to the client (no password). */
export interface UserProfile {
  id: string;
  email: string;
  username: string;
  name: string;
  age: number;
  experienceLevel: ExperienceLevel;
  stylePreference: StylePreference;
  favoriteSpot?: SurfSpot;
  /** Up to 5 spots shown in the Sage top rail (by spot id). */
  favoriteSpotIds?: string[];
  emailVerified: boolean;
}

export interface RegisterInput {
  email: string;
  username: string;
  password: string;
  name: string;
  age: number;
  experienceLevel: ExperienceLevel;
  stylePreference: StylePreference;
}

export function toUserProfile(user: UserRecord): UserProfile {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    name: user.name,
    age: user.age,
    experienceLevel: user.experienceLevel,
    stylePreference: user.stylePreference,
    favoriteSpot: user.favoriteSpot,
    favoriteSpotIds: user.favoriteSpotIds,
    emailVerified: user.emailVerified,
  };
}

export const STYLE_LABELS: Record<StylePreference, string> = {
  cruise: "Cruise (longboard)",
  trim: "Trim and glide (fish)",
  carving: "Carving / vertical (shortboard)",
};

export const EXPERIENCE_LABELS: Record<ExperienceLevel, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
  pro: "Pro",
};
