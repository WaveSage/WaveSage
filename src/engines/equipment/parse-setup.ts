import type { FinSet } from "@/lib/types";
import { parseBoardFromMessage } from "./parse-board";
import {
  matchInventoryFin,
  parseFinFromSegment,
} from "./parse-fin";

const NAMED_BOARD_HINT =
  /\b(?:slater|lost|mayhem|channel islands|\bci\b|firewire|pyzel|hayden|js\s|sharp\s*eye|almerrick|mini\s*driver|puddle\s*fish|boss\s*model|s\s*boss|cymatic|rocket|seaside|gamma)\b/i;

const SETUP_QUESTION =
  /\b(?:how\s+(?:would|will)|would\s+.+\s+(?:work|ride)|work\s+with|ride\s+(?:today|at)|fare\s+(?:today|at|in))\b/i;

export function isNamedHypotheticalGear(message: string): boolean {
  return (
    NAMED_BOARD_HINT.test(message) ||
    /\bmayhem\b/i.test(message) ||
    parseBoardFromMessage(message) !== null
  );
}

export function isHypotheticalSetupQuestion(message: string): boolean {
  if (!SETUP_QUESTION.test(message)) return false;

  const board = parseBoardFromMessage(message);
  if (!board) return false;

  const fin = parseFinFromSegment(message);
  return isNamedHypotheticalGear(message) || fin !== null;
}

export function resolveHypotheticalFin(
  message: string,
  inventoryFins: FinSet[]
): FinSet | null {
  return (
    parseFinFromSegment(message) ??
    matchInventoryFin(message, inventoryFins) ??
    null
  );
}
