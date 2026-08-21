import type { SkillLevel, Surfboard, SurfConditions } from "@/lib/types";
import {
  findBoardModelByName,
  getBoardModelById,
  type BoardModel,
} from "@/lib/board-catalog";

interface ModelScoreContext {
  conditions: SurfConditions;
  skillLevel: SkillLevel;
}

export function resolveBoardModel(board: Surfboard): BoardModel | null {
  if (board.modelId) {
    return getBoardModelById(board.modelId);
  }
  return findBoardModelByName(board.name);
}

export function scoreBoardWithModel(
  board: Surfboard,
  model: BoardModel,
  ctx: ModelScoreContext
): number {
  const { conditions, skillLevel } = ctx;
  const { waveHeightFt, wavePeriodSec, windType, windSpeedMph } = conditions;
  const { traits, waveRange } = model;

  let score = 55;

  if (waveHeightFt >= waveRange.idealMinFt && waveHeightFt <= waveRange.idealMaxFt) {
    score += 28;
  } else if (waveHeightFt >= waveRange.minFt && waveHeightFt <= waveRange.maxFt) {
    score += 12;
  } else {
    score -= 18;
    if (waveHeightFt < waveRange.minFt) {
      score += traits.grovel * 1.2;
    }
    if (waveHeightFt > waveRange.maxFt) {
      score -= traits.grovel * 1.5;
      score += traits.hold * 0.5;
    }
  }

  if (wavePeriodSec >= 11) {
    score += traits.hold * 1.8 + traits.rail * 1.4 + traits.drive * 1.2;
    score -= traits.grovel * 1.2;
  } else if (wavePeriodSec < 8) {
    score += traits.grovel * 2 + traits.speed * 1.5 + traits.pivot * 1;
    score -= traits.hold * 0.8;
  } else {
    score += traits.speed * 1 + traits.drive * 1 + traits.pivot * 0.8;
  }

  if (waveHeightFt < 2.5) {
    score += traits.grovel * 2.2 + traits.paddle * 1.2 + traits.speed * 1;
  }

  if (waveHeightFt > 5) {
    score += traits.hold * 2.5 + traits.drive * 1.5 + traits.rail * 1;
    score -= traits.grovel * 2;
  }

  if (windType === "onshore" && windSpeedMph > 8) {
    score += traits.paddle * 1.5 + traits.grovel * 1.2;
    score -= traits.hold * 0.6;
  }

  if (windType === "offshore") {
    score += traits.hold * 1.2 + traits.rail * 1 + traits.drive * 0.8;
  }

  const targetVolume =
    skillLevel === "beginner" ? 45 : skillLevel === "intermediate" ? 32 : 28;
  const volumeDiff = Math.abs(board.volumeL - targetVolume);
  score -= Math.min(volumeDiff * 0.8, 15);

  if (board.type === model.type) score += 5;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function describeModelFeel(
  model: BoardModel,
  conditions: SurfConditions
): string {
  const { waveHeightFt, wavePeriodSec } = conditions;
  const { waveRange } = model;

  if (waveHeightFt < waveRange.idealMinFt) {
    if (model.traits.grovel >= 8) {
      return `${model.feelSummary} Shaper intent: built for exactly these weaker days.`;
    }
    return `${model.feelSummary} Note: ${model.shaper} designed this above ${waveRange.idealMinFt} ft — it'll feel stiff and under-speeded today.`;
  }

  if (waveHeightFt > waveRange.idealMaxFt) {
    if (model.traits.hold >= 7) {
      return `${model.feelSummary} Enough hold for this size per ${model.shaper}'s design.`;
    }
    return `${model.feelSummary} ${model.shaper} rates this best under ${waveRange.idealMaxFt} ft — expect less control at this size.`;
  }

  if (wavePeriodSec >= 11 && model.traits.rail >= 7) {
    return `${model.feelSummary} Clean period lets the rails engage the way ${model.shaper} intended.`;
  }

  if (wavePeriodSec < 8 && model.traits.grovel >= 7) {
    return `${model.feelSummary} Short-period chop plays to this board's grovel strengths.`;
  }

  return `${model.feelSummary} (${model.shaperNotes})`;
}

export function modelTradeoffs(
  model: BoardModel,
  conditions: SurfConditions
): string[] {
  const tradeoffs: string[] = [];
  const { waveHeightFt, wavePeriodSec } = conditions;
  const { waveRange, shaper } = model;

  if (waveHeightFt < waveRange.idealMinFt) {
    tradeoffs.push(
      `${shaper} specs the ${model.model} from ${waveRange.idealMinFt}–${waveRange.idealMaxFt} ft — today is on the small side.`
    );
  } else if (waveHeightFt > waveRange.idealMaxFt) {
    tradeoffs.push(
      `${shaper} designed the ${model.model} for surf under ${waveRange.idealMaxFt} ft — today is bigger than its sweet spot.`
    );
  }

  if (wavePeriodSec < 8 && model.traits.hold >= 7) {
    tradeoffs.push(
      "Short-period wind swell — this board wants more push than today's period delivers."
    );
  }

  if (wavePeriodSec >= 12 && model.traits.grovel >= 8) {
    tradeoffs.push(
      "Long-period power — a grovel-oriented shape may feel too loose on open faces."
    );
  }

  if (tradeoffs.length === 0) {
    tradeoffs.push(
      `Within ${shaper}'s intended range for the ${model.model} today.`
    );
  }

  return tradeoffs;
}
