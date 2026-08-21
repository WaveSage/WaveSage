import type { ChatMessage } from "@/lib/types";
import type { ExperienceLevel } from "@/lib/auth/types";
import { STYLE_LABELS, type StylePreference } from "@/lib/auth/types";
import type { FitnessLevel, VolumeRecommendation } from "./types";
import type { SurfConditions } from "@/lib/types";
/** Weight in pounds */
const EXPERIENCE_VOLUME_FACTOR: Record<ExperienceLevel, number> = {
  beginner: 0.42,
  intermediate: 0.38,
  advanced: 0.35,
  pro: 0.33,
};

const FITNESS_ADJUSTMENT_L: Record<FitnessLevel, number> = {
  low: 4,
  average: 0,
  high: -3,
};

export const VOLUME_KNOWLEDGE = `SURFER VOLUME GUIDANCE

Volume (liters) is how much float a board has. The right volume depends on weight, experience, fitness, and the waves you ride.

EXPERIENCE (paddle efficiency & wave count)
- Beginners: need more volume to paddle easily, catch waves early, and stabilize. Typically ride ~38–45% of body weight in liters (shortboard range) or more on longboards.
- Intermediate: can reduce volume as paddling and timing improve. ~35–40% of body weight is a common shortboard range.
- Advanced: efficient paddling allows lower volume for performance. ~33–38%.
- Pro: often rides well below average volume for their weight when conditions suit.

FITNESS & PADDLE POWER
- Lower fitness or less time in the water: add 3–5 liters for easier sessions and more wave count.
- Average fitness: use the baseline recommendation.
- High fitness / strong paddler: can subtract 2–4 liters and still catch waves.

HOW TO USE VOLUME
- Too much volume: feels corky, hard to sink the rail, can bounce in steep surf.
- Too little volume: sinks when paddling, misses waves, fights to stay in the lineup.
- Match volume to the smallest waves you'll ride regularly — you can always step down on good days.

Always recommend a range, not a single number, and explain why for this surfer's weight, skill, and fitness.`;

export function recommendVolumeLiters(
  weightLbs: number,
  experienceLevel: ExperienceLevel,
  fitness: FitnessLevel = "average"
): VolumeRecommendation {
  const weightKg = weightLbs / 2.205;
  const factor = EXPERIENCE_VOLUME_FACTOR[experienceLevel];
  const base = weightKg * factor + FITNESS_ADJUSTMENT_L[fitness];
  const recommended = Math.round(base * 10) / 10;
  const rangeLow = Math.round((base - 3) * 10) / 10;
  const rangeHigh = Math.round((base + 3) * 10) / 10;

  const fitnessNote =
    fitness === "low"
      ? "Added volume for easier paddling and more wave count."
      : fitness === "high"
        ? "Slightly reduced volume — strong paddlers can ride leaner."
        : "Standard fitness adjustment.";

  const experienceNote: Record<ExperienceLevel, string> = {
    beginner:
      "Beginners benefit from extra float to catch waves early and build confidence.",
    intermediate:
      "Intermediate surfers can ride moderate volume while working toward performance shapes.",
    advanced:
      "Advanced surfers often prefer lower volume for rail sensitivity and fit in the pocket.",
    pro: "High-level surfers may ride well below average volume when waves have push.",
  };

  return {
    recommendedLiters: recommended,
    rangeLiters: [rangeLow, rangeHigh],
    explanation: `For ${weightLbs} lbs at ${experienceLevel} level: roughly ${rangeLow}–${rangeHigh}L, targeting ~${recommended}L. ${experienceNote[experienceLevel]} ${fitnessNote}`,
  };
}

/** Try to extract weight in lbs from a message like "180 lbs" or "I weigh 75 kg" */
export function parseWeightFromMessage(message: string): number | null {
  const lbs = message.match(/\b(\d{2,3})\s*(?:lbs?|pounds?)\b/i);
  if (lbs) {
    const n = Number(lbs[1]);
    if (n >= 80 && n <= 350) return n;
  }

  const kg = message.match(/\b(\d{2,3})\s*kg\b/i);
  if (kg) {
    const n = Number(kg[1]);
    if (n >= 35 && n <= 160) return Math.round(n * 2.205);
  }

  return null;
}

export function parseFitnessFromMessage(message: string): FitnessLevel | null {
  const lower = message.toLowerCase();
  if (/\b(low fitness|out of shape|weak paddle|don't paddle much)\b/.test(lower)) {
    return "low";
  }
  if (/\b(strong paddle|very fit|high fitness|athletic|paddle a lot)\b/.test(lower)) {
    return "high";
  }
  return null;
}

export function parseExperienceFromMessage(message: string): ExperienceLevel | null {
  const lower = message.toLowerCase();
  if (/\bbeginner\b/.test(lower)) return "beginner";
  if (/\bintermediate\b/.test(lower)) return "intermediate";
  if (/\badvanced\b/.test(lower)) return "advanced";
  if (/\bpro\b/.test(lower)) return "pro";
  return null;
}

export function formatVolumeCoachMessage(rec: VolumeRecommendation): string {
  return `${rec.explanation}

Target around ${rec.recommendedLiters}L for a performance shortboard-style shape. Longboards and fish often run higher; step-downs can go lower on good days.

Want help matching that to shortboard, fish, or longboard?`;
}

export function findVolumeContextFromHistory(
  history?: ChatMessage[]
): { weightLbs: number; experienceLevel: ExperienceLevel } | null {
  if (!history?.length) return null;

  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role !== "user") continue;
    const weightLbs = parseWeightFromMessage(history[i].content);
    if (!weightLbs) continue;
    return {
      weightLbs,
      experienceLevel:
        parseExperienceFromMessage(history[i].content) ?? "intermediate",
    };
  }

  return null;
}

function boardTypeVolumeNote(
  targetL: number,
  boardType: "shortboard" | "fish" | "longboard",
  waveHeightFt: number
): string {
  if (boardType === "shortboard") {
    return `Shortboard: ~${targetL}L — your baseline for ${waveHeightFt} ft surf; enough paddle without feeling corky.`;
  }
  if (boardType === "fish") {
    const fishL = Math.round((targetL + 6) * 10) / 10;
    return `Fish / hybrid: ~${fishL}L (+4–8L over shortboard) — more glide and speed in ${waveHeightFt} ft, softer surf.`;
  }
  const logL = Math.round((targetL + 18) * 10) / 10;
  return `Longboard: ~${logL}L (+15–25L over shortboard) — trim and noseride; usually not the same target as a performance shortboard.`;
}

export function formatVolumeBoardFollowUp(
  profile: {
    stylePreference: StylePreference;
    experienceLevel: ExperienceLevel;
  },
  conditions: SurfConditions,
  history?: ChatMessage[]
): string {
  const context = findVolumeContextFromHistory(history);
  const fitness: FitnessLevel = "average";
  const level = context?.experienceLevel ?? profile.experienceLevel;
  const weightLbs = context?.weightLbs;
  const rec = weightLbs
    ? recommendVolumeLiters(weightLbs, level, fitness)
    : null;
  const targetL = rec?.recommendedLiters ?? null;
  const styleLabel = STYLE_LABELS[profile.stylePreference].toLowerCase();

  const lines = [
    "Happy to narrow it down.",
    "",
    targetL
      ? `Using your ${weightLbs} lbs / ${level} baseline (~${targetL}L shortboard target):`
      : `For your ${styleLabel} style:`,
    "",
  ];

  if (targetL) {
    lines.push(
      boardTypeVolumeNote(targetL, "shortboard", conditions.waveHeightFt),
      boardTypeVolumeNote(targetL, "fish", conditions.waveHeightFt),
      boardTypeVolumeNote(targetL, "longboard", conditions.waveHeightFt)
    );
  } else {
    lines.push(
      "Shortboard: use the volume range from my last note as your baseline.",
      "Fish / hybrid: add roughly 4–8L for glide in weaker surf.",
      "Longboard: well above shortboard volume — built for trim, not vertical surfing."
    );
  }

  lines.push(
    "",
    `Today's ${conditions.waveHeightFt} ft @ ${conditions.wavePeriodSec}s at ${conditions.spot.name}: ${conditions.summary}`,
    "",
    "Which board type do you want to dial in — shortboard, fish, or longboard?"
  );

  return lines.join("\n");
}