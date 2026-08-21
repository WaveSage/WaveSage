import type {
  EquipmentRecommendation,
  FinSet,
  Inventory,
  SkillLevel,
  SurfConditions,
  Surfboard,
} from "@/lib/types";
import { scoreFinSet } from "./fin-evaluation";
import {
  describeModelFeel,
  modelTradeoffs,
  resolveBoardModel,
  scoreBoardWithModel,
} from "./board-model";

interface ScoreContext {
  conditions: SurfConditions;
  skillLevel: SkillLevel;
}

function idealBoardType(
  waveHeightFt: number,
  wavePeriodSec: number,
  skillLevel: SkillLevel
): Surfboard["type"][] {
  if (skillLevel === "beginner") {
    if (waveHeightFt < 3) return ["softboard", "funboard", "longboard"];
    return ["longboard", "funboard", "softboard"];
  }

  if (waveHeightFt < 2) {
    return ["fish", "groveler", "midlength", "funboard", "longboard"];
  }
  if (waveHeightFt < 4 && wavePeriodSec >= 10) {
    return ["shortboard", "hybrid", "fish", "groveler"];
  }
  if (waveHeightFt < 5) {
    return ["hybrid", "fish", "groveler", "shortboard"];
  }
  if (waveHeightFt < 7) return ["shortboard", "gun", "hybrid"];
  return ["gun", "shortboard"];
}

function scoreBoard(board: Surfboard, ctx: ScoreContext): number {
  const model = resolveBoardModel(board);
  if (model) {
    return scoreBoardWithModel(board, model, ctx);
  }

  const { conditions, skillLevel } = ctx;
  const ideals = idealBoardType(
    conditions.waveHeightFt,
    conditions.wavePeriodSec,
    skillLevel
  );

  let score = 50;
  const typeRank = ideals.indexOf(board.type);
  if (typeRank === 0) score += 30;
  else if (typeRank === 1) score += 20;
  else if (typeRank === 2) score += 10;
  else score -= 10;

  const targetVolume =
    skillLevel === "beginner"
      ? 45
      : skillLevel === "intermediate"
        ? 32
        : 28;
  const volumeDiff = Math.abs(board.volumeL - targetVolume);
  score -= Math.min(volumeDiff, 20);

  if (conditions.waveHeightFt < 2 && board.lengthFt > 7) score += 8;
  if (conditions.waveHeightFt > 5 && board.lengthFt < 6.2) score += 5;
  if (conditions.windSpeedMph > 12 && board.type === "longboard") score -= 8;
  if (conditions.windType === "offshore") score += 5;
  if (conditions.windType === "onshore" && conditions.windSpeedMph > 8) score -= 10;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function fitFromScore(score: number): EquipmentRecommendation["fit"] {
  if (score >= 85) return "ideal";
  if (score >= 70) return "good";
  if (score >= 55) return "workable";
  return "stretch";
}

function describeFeel(board: Surfboard, ctx: ScoreContext): string {
  const model = resolveBoardModel(board);
  if (model) {
    return describeModelFeel(model, ctx.conditions);
  }

  const { conditions } = ctx;

  if (board.type === "longboard" || board.type === "softboard") {
    return "Easy paddling and stable trim — great for catching softer waves early.";
  }
  if (board.type === "fish") {
    return "Loose and fast down the line with extra glide in weaker sections.";
  }
  if (board.type === "groveler") {
    return "Wide and flat with easy paddle — built to generate speed in small, weak surf.";
  }
  if (board.type === "midlength") {
    return "Smooth glide and early entry with enough maneuverability for everyday SoCal beach breaks.";
  }
  if (board.type === "hybrid") {
    if (board.name.toLowerCase().includes("boss")) {
      return "Fast, skatey small-wave performance — pivots quickly and generates speed in weaker La Jolla sections.";
    }
    if (board.finSetup === "quad") {
      return "Plenty of planing speed and drive through mushy sections; quads release easily off the tail for quick pivots.";
    }
    return "Wide outline and extra volume keep you gliding when the wave is softer or less pushy.";
  }
  if (board.type === "gun") {
    return "Confident hold on bigger faces; you'll trade maneuverability for control.";
  }
  if (conditions.wavePeriodSec >= 11 && board.type === "shortboard") {
    return "Snappy turns and tight pockets on the shoulder.";
  }
  return "Balanced mix of paddle power and responsiveness for today's shape.";
}

function buildTradeoffs(
  board: Surfboard,
  fin: FinSet | undefined,
  ctx: ScoreContext
): string[] {
  const model = resolveBoardModel(board);
  if (model) {
    const tradeoffs = modelTradeoffs(model, ctx.conditions);
    if (fin && fin.setup !== board.finSetup) {
      tradeoffs.push(
        `${fin.name} is a ${fin.setup} set on a ${board.finSetup} board — workable but not plug-and-play.`
      );
    }
    return tradeoffs;
  }

  const tradeoffs: string[] = [];
  const ideals = idealBoardType(
    ctx.conditions.waveHeightFt,
    ctx.conditions.wavePeriodSec,
    ctx.skillLevel
  );

  if (!ideals.includes(board.type)) {
    tradeoffs.push(
      `${board.name} isn't the typical pick for ${ctx.conditions.waveHeightFt} ft surf — expect a different line than usual.`
    );
  }

  if (board.volumeL < 28 && ctx.skillLevel !== "advanced") {
    tradeoffs.push("Lower volume means less paddle speed — timing matters.");
  }

  if (fin && fin.setup !== board.finSetup) {
    tradeoffs.push(
      `${fin.name} is a ${fin.setup} set on a ${board.finSetup} board — workable but not plug-and-play.`
    );
  }

  if (ctx.conditions.windSpeedMph > 12 && board.lengthFt < 6.5) {
    tradeoffs.push("Breezy conditions may feel choppy on a shorter board.");
  }

  if (ctx.conditions.windType === "onshore" && ctx.conditions.windSpeedMph > 8) {
    tradeoffs.push("Onshore wind adds chop — a board with more volume helps.");
  }

  if (tradeoffs.length === 0) {
    tradeoffs.push("Solid match — no major compromises for today's conditions.");
  }

  return tradeoffs;
}

function pickBestFin(
  board: Surfboard,
  fins: FinSet[],
  ctx: ScoreContext
): FinSet | undefined {
  if (fins.length === 0) return undefined;

  return [...fins].sort(
    (a, b) => scoreFinSet(b, board, ctx) - scoreFinSet(a, board, ctx)
  )[0];
}

export function recommendEquipment(
  inventory: Inventory,
  conditions: SurfConditions
): EquipmentRecommendation[] {
  const ctx: ScoreContext = {
    conditions,
    skillLevel: inventory.skillLevel,
  };

  const ranked = inventory.boards
    .map((board) => {
      const score = scoreBoard(board, ctx);
      const finSet = pickBestFin(board, inventory.fins, ctx);

      return {
        board,
        finSet,
        score,
        fit: fitFromScore(score),
        tradeoffs: buildTradeoffs(board, finSet, ctx),
        howItWouldFeel: describeFeel(board, ctx),
      };
    })
    .sort((a, b) => b.score - a.score);

  return ranked.slice(0, 3);
}

export function evaluateBoard(
  board: Surfboard,
  inventory: Inventory,
  conditions: SurfConditions,
  preferredFin?: FinSet
): EquipmentRecommendation {
  const ctx: ScoreContext = {
    conditions,
    skillLevel: inventory.skillLevel,
  };

  const finSet =
    preferredFin ??
    pickBestFin(board, inventory.fins, ctx) ??
    (board.finSetup
      ? {
          id: "virtual-fin",
          name: `${board.finSetup} fins`,
          setup: board.finSetup,
          size: "M",
          template: board.finSetup === "quad" ? "pivot" : "performance",
        }
      : undefined);

  const score = scoreBoard(board, ctx);

  return {
    board,
    finSet,
    score,
    fit: fitFromScore(score),
    tradeoffs: buildTradeoffs(board, finSet, ctx),
    howItWouldFeel: describeFeel(board, ctx),
  };
}

export function recommendFromConditions(
  inventory: Inventory,
  conditions: SurfConditions
): EquipmentRecommendation[] {
  const recommendations = recommendEquipment(inventory, conditions);
  if (recommendations.length > 0) return recommendations;

  return [
    {
      board: {
        id: "generic-shortboard",
        name: "All-around shortboard (~6'2\")",
        type: "shortboard",
        lengthFt: 6.2,
        volumeL: 32,
        finSetup: "thruster",
      },
      score: 68,
      fit: "workable",
      tradeoffs: [
        "Add your boards to inventory for personalized picks.",
      ],
      howItWouldFeel:
        "A standard shortboard handles punchy faces and quick turns in today's conditions.",
    },
  ];
}
