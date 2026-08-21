import type { EquipmentRecommendation, SurfConditions, SwellFit } from "@/lib/types";
import type { CoachPeriod } from "@/lib/coach-period";
import { getBoardModelById } from "@/lib/board-catalog";

function compassToNatural(label: string): string {
  const map: Record<string, string> = {
    N: "north",
    NNE: "north-northeast",
    NE: "northeast",
    ENE: "east-northeast",
    E: "east",
    ESE: "east-southeast",
    SE: "southeast",
    SSE: "south-southeast",
    S: "south",
    SSW: "south-southwest",
    SW: "southwest",
    WSW: "west-southwest",
    W: "west",
    WNW: "west-northwest",
    NW: "northwest",
    NNW: "north-northwest",
  };
  return map[label] ?? label.toLowerCase();
}

function periodGreeting(coachPeriod?: CoachPeriod): string {
  if (coachPeriod === "afternoon") return "Good afternoon,";
  if (coachPeriod === "evening") return "Good evening,";
  return "Good morning,";
}

function periodPhrase(
  wavePeriodSec: number,
  quality: SurfConditions["quality"],
  swellFit?: SwellFit
): string {
  if (wavePeriodSec < 8) return "short-period chop";

  if (swellFit === "poor") {
    return wavePeriodSec >= 11
      ? "long-period swell that's poorly aligned for this break"
      : "swell that's poorly aligned for this break";
  }
  if (swellFit === "marginal") {
    return "swell only partially lining up";
  }
  if (quality === "poor") {
    return wavePeriodSec >= 11
      ? "long-period swell on paper"
      : "modest energy on paper";
  }
  if (wavePeriodSec < 11) return "decent period and energy";
  return "clean, longer-period swell";
}

function overallPhrase(quality: SurfConditions["quality"]): string {
  switch (quality) {
    case "epic":
      return "Epic conditions";
    case "good":
      return "Fun conditions";
    case "fair":
      return "Bumpy / workable conditions";
    default:
      return "Poor conditions";
  }
}

export function conditionFlag(quality: SurfConditions["quality"]): string {
  switch (quality) {
    case "poor":
      return "🔴";
    case "fair":
      return "🟡";
    default:
      return "🟢";
  }
}

function openingSizePhrase(waveHeightFt: number): string {
  if (waveHeightFt < 2) return `small surf (${waveHeightFt}ft)`;
  if (waveHeightFt < 4) return `fun-sized surf (${waveHeightFt}ft)`;
  if (waveHeightFt < 6) return `solid surf (${waveHeightFt}ft)`;
  return `overhead surf (${waveHeightFt}ft)`;
}

function windTypeNatural(windType: string): string {
  if (windType === "cross-shore") return "cross shore";
  if (windType === "offshore") return "offshore";
  if (windType === "onshore") return "onshore";
  return windType;
}

export function formatNaturalConditions(
  conditions: SurfConditions,
  coachPeriod?: CoachPeriod
): string {
  const greeting = periodGreeting(coachPeriod);
  const swellPhrase = periodPhrase(
    conditions.wavePeriodSec,
    conditions.quality,
    conditions.spotTransform?.swellFit
  );
  const overall = overallPhrase(conditions.quality);
  const flag = conditionFlag(conditions.quality);
  const windDir = compassToNatural(conditions.windDirectionLabel);

  const windSentence =
    conditions.windType !== "unknown"
      ? `Winds are ${windTypeNatural(conditions.windType)} ${windDir} at ${conditions.windSpeedMph} mph.`
      : `Winds are ${windDir} at ${conditions.windSpeedMph} mph.`;

  const tideSentence = conditions.tide
    ? `Tide is ${conditions.tide.heightFt}ft.`
    : "";

  const fitBit =
    conditions.spotTransform?.swellFit === "poor"
      ? ` ${conditions.swellDirectionLabel} swell is a weak match here.`
      : conditions.spotTransform?.swellFit === "marginal"
        ? ` ${conditions.swellDirectionLabel} swell is only a partial match.`
        : conditions.spotTransform &&
            (conditions.spotTransform.swellFit === "good" ||
              conditions.spotTransform.swellFit === "excellent")
          ? ` ${conditions.swellDirectionLabel} swell fits this break.`
          : "";

  const opening = `${greeting} ${openingSizePhrase(conditions.waveHeightFt)} with ${swellPhrase}. ${windSentence}${tideSentence ? ` ${tideSentence}` : ""}${fitBit} Overall: ${overall} ${flag} — ${conditions.waveHeightFt} ft @ ${conditions.wavePeriodSec}s`;

  const windBullet =
    conditions.windType !== "unknown"
      ? `${conditions.windType} ${conditions.windDirectionLabel} ${conditions.windSpeedMph} mph`
      : `${conditions.windDirectionLabel} ${conditions.windSpeedMph} mph`;

  const tideBullet = conditions.tide
    ? `\n- Tide: ${conditions.tide.heightFt} ft, ${conditions.tide.trend}`
    : "";

  return `${opening}
- Swell: ${conditions.swellHeightFt} ft @ ${conditions.swellPeriodSec}s from ${conditions.swellDirectionLabel}
- Wind: ${windBullet}
- Quality: ${conditions.quality}${tideBullet}`;
}

export function formatNaturalBoardPick(
  top: EquipmentRecommendation,
  hasCustomInventory: boolean
): string {
  if (!hasCustomInventory || top.board.id === "generic-shortboard") {
    return `A good option today would be a ${top.board.name}. ${top.howItWouldFeel}`;
  }

  const fin = top.finSet ? ` with ${top.finSet.name}` : "";
  const model = top.board.modelId
    ? getBoardModelById(top.board.modelId)
    : null;
  const shaperNote = model?.shaperNotes ?? null;

  let text = `Best board for today would be your ${top.board.name}${fin}. ${top.howItWouldFeel}`;
  if (shaperNote) {
    text += ` (${shaperNote})`;
  }
  return text;
}

export function formatNaturalInventoryNote(
  hasCustomInventory: boolean,
  isGeneric: boolean
): string {
  if (hasCustomInventory && !isGeneric) return "";
  return "Add boards to your quiver in the Inventory tab for picks from your actual boards.";
}
