import type {
  EquipmentRecommendation,
  FinSet,
  Inventory,
  SkillLevel,
  SurfConditions,
  Surfboard,
} from "@/lib/types";
import { defaultFinAlternatives } from "./parse-fin";

interface ScoreContext {
  conditions: SurfConditions;
  skillLevel: SkillLevel;
}

export interface FinEvaluation {
  fin: FinSet;
  board: Surfboard;
  score: number;
  fit: EquipmentRecommendation["fit"];
  compatible: boolean;
  howItWouldFeel: string;
  tradeoffs: string[];
}

function fitFromScore(score: number): EquipmentRecommendation["fit"] {
  if (score >= 85) return "ideal";
  if (score >= 70) return "good";
  if (score >= 55) return "workable";
  return "stretch";
}

function isCompatible(board: Surfboard, fin: FinSet): boolean {
  if (fin.setup === board.finSetup) return true;
  if (
    (board.finSetup === "thruster" && fin.setup === "quad") ||
    (board.finSetup === "quad" && fin.setup === "thruster")
  ) {
    return true;
  }
  if (board.finSetup === "2+1" && (fin.setup === "single" || fin.setup === "twin")) {
    return true;
  }
  return false;
}

export function scoreFinSet(
  fin: FinSet,
  board: Surfboard,
  ctx: ScoreContext
): number {
  let score = 60;

  if (fin.setup === board.finSetup) score += 20;
  else if (
    (board.finSetup === "thruster" && fin.setup === "quad") ||
    (board.finSetup === "quad" && fin.setup === "thruster")
  ) {
    score += 8;
  } else {
    score -= 15;
  }

  if (ctx.conditions.wavePeriodSec >= 11 && fin.template === "drive") score += 10;
  if (ctx.conditions.waveHeightFt < 3 && fin.template === "pivot") score += 10;
  if (ctx.conditions.windSpeedMph > 12 && fin.template === "neutral") score += 8;
  if (ctx.conditions.wavePeriodSec >= 10 && fin.template === "performance") {
    score += 6;
  }
  if (ctx.conditions.windType === "onshore" && fin.template === "neutral") {
    score += 5;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

function describeFinFeel(
  fin: FinSet,
  board: Surfboard,
  ctx: ScoreContext
): string {
  const { conditions } = ctx;

  if (fin.setup === "quad" && fin.template === "pivot") {
    if (fin.name.toLowerCase().includes("evil")) {
      return "Releasey quad feel with extra pivot off the tail — great for tight Black's sections when you want to stay loose.";
    }
    return "Looser off the top with quick release — great for generating speed in softer sections.";
  }
  if (fin.setup === "thruster" && fin.template === "performance") {
    return conditions.wavePeriodSec >= 10
      ? "Tighter, more predictable arcs with solid drive off the bottom."
      : "Snappy and controlled; helps hold a line when the wave gets punchy.";
  }
  if (fin.setup === "thruster" && fin.template === "drive") {
    return "Extra hold and projection on rail — suits bigger faces and longer turns.";
  }
  if (fin.setup === "twin" && fin.template === "drive") {
    return "Smooth, drawn-out lines with plenty of down-the-line speed.";
  }
  if (fin.setup === "twin" && fin.template === "pivot") {
    return "Skaty and responsive — easy to swivel the tail in weaker surf.";
  }
  if (fin.setup === "quad" && fin.template === "neutral") {
    return "Balanced quad feel — drive without feeling too stiff or too loose.";
  }
  if (fin.setup === "single") {
    return "Classic trim and glide; smooth, flowing lines with less pivot.";
  }
  if (fin.setup === "2+1") {
    return "Stable nose riding potential with enough fin grip to turn off the tail.";
  }

  return `A ${fin.setup} setup that complements the ${board.type}'s outline for today's shape.`;
}

function buildFinTradeoffs(
  fin: FinSet,
  board: Surfboard,
  ctx: ScoreContext
): string[] {
  const tradeoffs: string[] = [];
  const compatible = isCompatible(board, fin);

  if (!compatible) {
    tradeoffs.push(
      `${fin.name} is a ${fin.setup} set on a ${board.finSetup} board — you'll need compatible plugs or a different board.`
    );
  } else if (fin.setup !== board.finSetup) {
    tradeoffs.push(
      `Works as an alternative ${fin.setup} setup on this ${board.finSetup} board with the right fin box config.`
    );
  }

  if (fin.template === "pivot" && ctx.conditions.wavePeriodSec >= 12) {
    tradeoffs.push("May feel a bit loose on long, powerful walls — less drive than a performance set.");
  }
  if (fin.template === "drive" && ctx.conditions.waveHeightFt < 2.5) {
    tradeoffs.push("Extra drive can feel sticky when the wave is weak.");
  }
  if (fin.template === "performance" && ctx.conditions.windSpeedMph > 12) {
    tradeoffs.push("Performance template prefers cleaner faces — chop may feel jittery.");
  }

  if (tradeoffs.length === 0) {
    tradeoffs.push("Good match for today's conditions on this board.");
  }

  return tradeoffs;
}

export function evaluateFinOnBoard(
  board: Surfboard,
  fin: FinSet,
  inventory: Inventory,
  conditions: SurfConditions
): FinEvaluation {
  const ctx: ScoreContext = {
    conditions,
    skillLevel: inventory.skillLevel,
  };

  const score = scoreFinSet(fin, board, ctx);
  const compatible = isCompatible(board, fin);

  return {
    fin,
    board,
    score,
    fit: fitFromScore(score),
    compatible,
    howItWouldFeel: describeFinFeel(fin, board, ctx),
    tradeoffs: buildFinTradeoffs(fin, board, ctx),
  };
}

export function compareFinsOnBoard(
  board: Surfboard,
  fins: FinSet[],
  inventory: Inventory,
  conditions: SurfConditions
): FinEvaluation[] {
  return [...fins]
    .map((fin) => evaluateFinOnBoard(board, fin, inventory, conditions))
    .sort((a, b) => b.score - a.score);
}

export function suggestFinComparisonSet(
  board: Surfboard,
  requestedFins: FinSet[]
): FinSet[] {
  if (requestedFins.length >= 2) return requestedFins;

  const defaults = defaultFinAlternatives(board.finSetup);
  const merged = [...requestedFins];

  for (const fin of defaults) {
    if (!merged.some((f) => f.setup === fin.setup && f.template === fin.template)) {
      merged.push(fin);
    }
  }

  return merged.slice(0, 3);
}
