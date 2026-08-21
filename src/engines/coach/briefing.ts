import type { StyleOutlook, SurfConditions } from "@/lib/types";
import type { CoachPeriod } from "@/lib/coach-period";
import type { UserProfile } from "@/lib/auth/types";
import { generateStyleCoachOutlook } from "./style-coach";

export async function generateOpeningBriefing(
  conditions: SurfConditions,
  coachPeriod: CoachPeriod,
  profile: Pick<UserProfile, "stylePreference" | "experienceLevel">
): Promise<{
  message: string;
  styleOutlook: StyleOutlook;
  source: "ai" | "template";
}> {
  const outlook = await generateStyleCoachOutlook(
    conditions,
    profile,
    coachPeriod
  );
  return {
    message: outlook.message,
    styleOutlook: outlook.result,
    source: outlook.source,
  };
}
