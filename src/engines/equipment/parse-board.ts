import type { BoardType, FinSetup, FinSet, Surfboard } from "@/lib/types";
import {
  BOARD_CATALOG,
  boardFromModel,
  findBoardModelByName,
  findBoardModelInText,
  type BoardModel,
} from "@/lib/board-catalog";
import { resolveFinFromSegment } from "./parse-fin";

const LENGTH_PATTERN = /(\d)\s*[''′″]\s*(\d{1,2})/i;
const LENGTH_FT_PATTERN = /(\d(?:\.\d)?)\s*(?:ft|foot|feet)\b/i;

function parseLengthFt(message: string): number | null {
  const apostropheMatch = message.match(LENGTH_PATTERN);
  if (apostropheMatch) {
    return Number(apostropheMatch[1]) + Number(apostropheMatch[2]) / 12;
  }

  const feetMatch = message.match(LENGTH_FT_PATTERN);
  if (feetMatch) return Number(feetMatch[1]);

  return null;
}

function parseVolume(message: string): number | null {
  const match = message.match(/(\d{2,3})\s*(?:l|liters?|litres?)\b/i);
  return match ? Number(match[1]) : null;
}

function formatLength(lengthFt: number): string {
  const feet = Math.floor(lengthFt);
  const inches = Math.round((lengthFt - feet) * 12);
  return `${feet}'${inches}`;
}

function buildBoardName(model: BoardModel | null, lengthFt: number | null): string {
  if (model) {
    return lengthFt
      ? `${formatLength(lengthFt)} ${model.label}`
      : model.label;
  }
  return lengthFt ? `${formatLength(lengthFt)} board` : "Custom board";
}

export function isSpecificBoardQuestion(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    parseLengthFt(message) !== null ||
    findBoardModelInText(message) !== null ||
    /\b(?:how\s+(?:will|would)|would\s+.+\s+work|fair|fare|handle)\b/i.test(
      lower
    )
  );
}

export function parseBoardFromMessage(message: string): Surfboard | null {
  const lengthFt = parseLengthFt(message);
  const explicitVolume = parseVolume(message);
  const model = findBoardModelInText(message);

  if (!model && !lengthFt) return null;

  const resolvedLength = lengthFt ?? model?.defaultLengthFt ?? 6.0;

  if (model) {
    const fromModel = boardFromModel(model, resolvedLength);
    return {
      id: "parsed-board",
      name: buildBoardName(model, lengthFt),
      type: fromModel.type,
      lengthFt: fromModel.lengthFt,
      volumeL: explicitVolume ?? fromModel.volumeL,
      finSetup: fromModel.finSetup,
      modelId: fromModel.modelId,
      shaper: fromModel.shaper,
    };
  }

  const resolvedVolume = explicitVolume ?? 26 + resolvedLength * 1.4;

  return {
    id: "parsed-board",
    name: buildBoardName(null, lengthFt),
    type: "hybrid" as BoardType,
    lengthFt: Math.round(resolvedLength * 100) / 100,
    volumeL: Math.round(resolvedVolume * 10) / 10,
    finSetup: "thruster" as FinSetup,
  };
}

export function matchFinFromMessage(
  message: string,
  fins: FinSet[]
): FinSet | undefined {
  return resolveFinFromSegment(message, fins) ?? undefined;
}

export function matchInventoryBoard(
  message: string,
  boards: Surfboard[]
): Surfboard | null {
  const lower = message.toLowerCase();

  const byName = boards.find((board) => {
    const name = board.name.toLowerCase();
    return lower.includes(name) || name.split(/\s+/).every((w) => lower.includes(w));
  });
  if (byName) return byName;

  const modelFromText = findBoardModelInText(message);
  if (modelFromText) {
    const byModel = boards.find(
      (board) =>
        board.modelId === modelFromText.id ||
        findBoardModelByName(board.name)?.id === modelFromText.id
    );
    if (byModel) return byModel;
  }

  const parsed = parseBoardFromMessage(message);
  if (!parsed) return null;

  return (
    boards.find(
      (board) =>
        (parsed.modelId && board.modelId === parsed.modelId) ||
        (Math.abs(board.lengthFt - parsed.lengthFt) < 0.2 &&
          board.type === parsed.type)
    ) ?? null
  );
}

export { BOARD_CATALOG };
