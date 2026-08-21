import type {
  EquipmentRecommendation,
  FinSet,
  Inventory,
  SurfConditions,
  Surfboard,
} from "@/lib/types";
import { evaluateBoard } from "./index";
import { evaluateFinOnBoard, type FinEvaluation } from "./fin-evaluation";
import {
  isHypotheticalSetupQuestion,
  resolveHypotheticalFin,
} from "./parse-setup";
import { parseBoardFromMessage } from "./parse-board";

export interface HypotheticalSetupEvaluation {
  board: EquipmentRecommendation;
  fin: FinEvaluation;
  combinedScore: number;
  combinedFit: EquipmentRecommendation["fit"];
}

function fitFromScore(score: number): EquipmentRecommendation["fit"] {
  if (score >= 85) return "ideal";
  if (score >= 70) return "good";
  if (score >= 55) return "workable";
  return "stretch";
}

export function evaluateHypotheticalSetup(
  board: Surfboard,
  fin: FinSet,
  inventory: Inventory,
  conditions: SurfConditions
): HypotheticalSetupEvaluation {
  const boardEval = evaluateBoard(board, inventory, conditions, fin);
  const finEval = evaluateFinOnBoard(board, fin, inventory, conditions);
  const combinedScore = Math.round(boardEval.score * 0.55 + finEval.score * 0.45);

  return {
    board: boardEval,
    fin: finEval,
    combinedScore,
    combinedFit: fitFromScore(combinedScore),
  };
}

export function resolveHypotheticalSetup(
  message: string,
  inventory: Inventory,
  conditions: SurfConditions
): HypotheticalSetupEvaluation | null {
  if (!isHypotheticalSetupQuestion(message)) return null;

  const board = parseBoardFromMessage(message);
  if (!board) return null;

  const fin = resolveHypotheticalFin(message, inventory.fins);
  if (!fin) return null;

  return evaluateHypotheticalSetup(board, fin, inventory, conditions);
}

export { isHypotheticalSetupQuestion };
