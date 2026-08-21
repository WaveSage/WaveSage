import type {
  CoachResponse,
  ChatMessage,
  EquipmentRecommendation,
  FinSet,
  Inventory,
  SurfConditions,
  Surfboard,
} from "@/lib/types";
import {
  evaluateBoard,
} from "@/engines/equipment";
import {
  resolveHypotheticalSetup,
  evaluateHypotheticalSetup,
  type HypotheticalSetupEvaluation,
} from "@/engines/equipment/setup-evaluation";
import {
  compareFinsOnBoard,
  suggestFinComparisonSet,
  type FinEvaluation,
} from "@/engines/equipment/fin-evaluation";
import {
  isFinComparisonQuestion,
  resolveFinsFromMessage,
} from "@/engines/equipment/parse-fin";
import {
  isSpecificBoardQuestion,
  matchFinFromMessage,
  matchInventoryBoard,
  parseBoardFromMessage,
} from "@/engines/equipment/parse-board";
import type { CoachPeriod } from "@/lib/coach-period";
import { isRegionalQuestion } from "@/lib/socal-spots";
import {
  formatNaturalBoardPick,
  formatNaturalConditions,
} from "./natural-language";
import { getBoardModelById } from "@/lib/board-catalog";
import { templateFollowUpResponse } from "./follow-up";
import {
  isFollowUpQuestion,
  isSurfRelated,
  OFF_TOPIC_MESSAGE,
  shouldIncludeOutlook,
} from "./topic-guard";

interface CoachInput {
  userMessage: string;
  conditions: SurfConditions;
  recommendations: EquipmentRecommendation[];
  inventory: Inventory;
  regionalConditions?: SurfConditions[];
  coachPeriod?: CoachPeriod;
  explicitHypothetical?: { board: Surfboard; fin: FinSet };
  conversationHistory?: ChatMessage[];
}

function formatRecommendation(rec: EquipmentRecommendation, rank: number): string {
  const fin = rec.finSet ? ` with ${rec.finSet.name}` : "";
  return `${rank}. ${rec.board.name}${fin} (${rec.fit}) — ${rec.howItWouldFeel}`;
}

function formatConditionsBlock(
  conditions: SurfConditions,
  coachPeriod?: CoachPeriod
): string {
  return formatNaturalConditions(conditions, coachPeriod);
}

function outlookPrefix(input: CoachInput, includeOutlook: boolean): string {
  if (!includeOutlook) return "";
  return `${formatConditionsBlock(input.conditions, input.coachPeriod)}\n\n`;
}

function resolveAskedBoard(input: CoachInput): EquipmentRecommendation | null {
  const { userMessage, inventory, conditions } = input;

  const inventoryMatch = matchInventoryBoard(userMessage, inventory.boards);
  const parsed = parseBoardFromMessage(userMessage);
  const board = inventoryMatch ?? parsed;
  if (!board) return null;

  const preferredFin = matchFinFromMessage(userMessage, inventory.fins);
  return evaluateBoard(board, inventory, conditions, preferredFin);
}

function resolveBoardForFinQuestion(input: CoachInput) {
  const { userMessage, inventory, recommendations } = input;
  const inventoryMatch = matchInventoryBoard(userMessage, inventory.boards);
  if (inventoryMatch) return inventoryMatch;

  const parsed = parseBoardFromMessage(userMessage);
  if (parsed) return parsed;

  const lower = userMessage.toLowerCase();
  if (/\bmy\b/.test(lower)) {
    if (/\bshortboard\b/.test(lower)) {
      return inventory.boards.find((b) => b.type === "shortboard") ?? null;
    }
    if (/\bfish\b/.test(lower)) {
      return inventory.boards.find((b) => b.type === "fish") ?? null;
    }
    if (/\bboard\b/.test(lower)) {
      return inventory.boards[0] ?? null;
    }
  }

  return recommendations[0]?.board ?? inventory.boards[0] ?? null;
}

function resolveFinComparison(
  input: CoachInput
): { board: Surfboard; evaluations: FinEvaluation[] } | null {
  if (!isFinComparisonQuestion(input.userMessage)) return null;

  const board = resolveBoardForFinQuestion(input);
  if (!board) return null;

  const requested = resolveFinsFromMessage(
    input.userMessage,
    input.inventory.fins
  );
  const fins = suggestFinComparisonSet(board, requested);
  if (fins.length === 0) return null;

  return {
    board,
    evaluations: compareFinsOnBoard(
      board,
      fins,
      input.inventory,
      input.conditions
    ),
  };
}

function formatFinEvaluation(evalResult: FinEvaluation, rank: number): string {
  const compat = evalResult.compatible ? "" : " (needs compatible plugs)";
  return `${rank}. ${evalResult.fin.name} (${evalResult.fit})${compat} — ${evalResult.howItWouldFeel}`;
}

function templateHypotheticalSetupResponse(
  input: CoachInput,
  setup: HypotheticalSetupEvaluation,
  includeOutlook: boolean
): string {
  const { conditions, recommendations } = input;
  const { board, fin, combinedScore, combinedFit } = setup;
  const topQuiver = recommendations[0];

  let quiverNote = "";
  if (topQuiver && topQuiver.board.id !== board.board.id) {
    const delta = combinedScore - topQuiver.score;
    if (delta > 5) {
      quiverNote = `\n\nThis setup would edge out your ${topQuiver.board.name} from the quiver today.`;
    } else if (delta < -5) {
      quiverNote = `\n\nYour ${topQuiver.board.name} still looks like the better call for these conditions.`;
    }
  }

  const verdict =
    combinedFit === "ideal" || combinedFit === "good"
      ? "Overall, this is a strong hypothetical setup for today."
      : combinedFit === "workable"
        ? "It would work, but not the ideal board and fin combo for these conditions."
        : "Probably a mismatch today — you'd be fighting for speed or hold.";

  const model = board.board.modelId
    ? getBoardModelById(board.board.modelId)
    : null;
  const shaperContext = model
    ? `\n\n${model.shaper} on the ${model.model}: ${model.shaperNotes}`
    : board.board.shaper
      ? ""
      : "\n\nI don't have shaper specs for this model yet — this is a general read from size and conditions.";

  return `${outlookPrefix(input, includeOutlook)}At ${conditions.spot.name} today, your ${board.board.name} with ${fin.fin.name} looks like a ${combinedFit} fit.

${board.howItWouldFeel}

${fin.howItWouldFeel}${shaperContext}

${verdict}${quiverNote}`;
}

function templateFinComparisonResponse(
  input: CoachInput,
  comparison: { board: Surfboard; evaluations: FinEvaluation[] },
  includeOutlook: boolean
): string {
  const { board, evaluations } = comparison;
  const top = evaluations[0];
  const runnerUp = evaluations[1];

  let diff = "";
  if (runnerUp) {
    diff = `\n\nI'd go with ${top.fin.name} today — ${top.howItWouldFeel.split(".")[0]}.`;
  }

  return `${outlookPrefix(input, includeOutlook)}Fin comparison on your ${board.name}:

${evaluations.map((e, i) => formatFinEvaluation(e, i + 1)).join("\n\n")}${diff}`;
}

function templateSpecificBoardResponse(
  input: CoachInput,
  asked: EquipmentRecommendation,
  includeOutlook: boolean
): string {
  const { recommendations } = input;
  const fin = asked.finSet ? ` with ${asked.finSet.name}` : "";
  const topQuiver = recommendations[0];

  let comparison = "";
  if (topQuiver && topQuiver.board.id !== asked.board.id) {
    const delta = asked.score - topQuiver.score;
    if (delta > 5) {
      comparison = `\n\nCompared to your ${topQuiver.board.name}, this setup actually looks better today.`;
    } else if (delta < -5) {
      comparison = `\n\nYour ${topQuiver.board.name} is probably the smarter call today — more volume or length for these conditions.`;
    } else {
      comparison = `\n\nSimilar fit to your ${topQuiver.board.name} — either would work.`;
    }
  }

  const verdict =
    asked.fit === "ideal" || asked.fit === "good"
      ? "Solid call for today."
      : asked.fit === "workable"
        ? "Rideable, but not the ideal shape for these conditions."
        : "Probably a stretch today — you'd be fighting the board.";

  return `${outlookPrefix(input, includeOutlook)}Your ${asked.board.name}${fin} would be a ${asked.fit} fit today.

${asked.howItWouldFeel}

${verdict}${comparison}`;
}

function templateRegionalResponse(regional: SurfConditions[]): string {
  const top = regional.slice(0, 6);

  const lines = top.map((c, i) => {
    const wind =
      c.windType !== "unknown"
        ? `${c.windType} ${c.windDirectionLabel}`
        : c.windDirectionLabel;
    return `${i + 1}. ${c.spot.name} (${c.spot.region}) — ${c.quality}, ${c.waveHeightFt} ft @ ${c.wavePeriodSec}s, ${wind} ${c.windSpeedMph} mph`;
  });

  const best = top[0];
  const slow = regional.filter((c) => c.quality === "poor").slice(0, 3);

  let slowNote = "";
  if (slow.length > 0) {
    slowNote = `\n\nSlower options: ${slow.map((c) => c.spot.name).join(", ")}.`;
  }

  return `Southern California rundown:

${lines.join("\n")}

Best bet today looks like ${best.spot.name} — ${best.summary}${slowNote}

Tap a beach in the Spots tab for a forecast and gear advice.`;
}

function templateCoachResponse(
  input: CoachInput,
  evaluatedHypothetical?: HypotheticalSetupEvaluation | null,
  includeOutlook = false
): string {
  const { conditions, recommendations, userMessage, regionalConditions } =
    input;
  const lower = userMessage.toLowerCase();

  if (isRegionalQuestion(userMessage) && regionalConditions?.length) {
    return templateRegionalResponse(regionalConditions);
  }

  const hypothetical =
    evaluatedHypothetical ??
    resolveHypotheticalSetup(userMessage, input.inventory, conditions);
  if (hypothetical) {
    return templateHypotheticalSetupResponse(input, hypothetical, includeOutlook);
  }

  const finComparison = resolveFinComparison(input);
  if (finComparison) {
    return templateFinComparisonResponse(input, finComparison, includeOutlook);
  }

  if (isSpecificBoardQuestion(userMessage)) {
    const asked = resolveAskedBoard(input);
    if (asked) return templateSpecificBoardResponse(input, asked, includeOutlook);
  }

  const isConditionsQuestion =
    lower.includes("condition") ||
    lower.includes("wave") ||
    lower.includes("morning") ||
    lower.includes("afternoon") ||
    lower.includes("evening") ||
    lower.includes("today") ||
    lower.includes("surf");

  const isGearQuestion =
    lower.includes("board") ||
    lower.includes("fin") ||
    lower.includes("equipment") ||
    lower.includes("quiver") ||
    lower.includes("ride") ||
    lower.includes("best") ||
    lower.includes("fair") ||
    lower.includes("fare") ||
    lower.includes("driver") ||
    lower.includes("quad");

  const conditionsBlock = includeOutlook
    ? `${formatConditionsBlock(conditions, input.coachPeriod)}\n\n`
    : "";

  const gearBlock =
    recommendations.length > 0
      ? `From your quiver:\n\n${recommendations
          .map((r, i) => formatRecommendation(r, i + 1))
          .join("\n\n")}`
      : "Add boards and fins to your inventory for personalized recommendations.";

  if (isConditionsQuestion && isGearQuestion) {
    const top = recommendations[0];
    const hasBoards = input.inventory.boards.length > 0;
    const pick = top
      ? formatNaturalBoardPick(top, hasBoards)
      : "I'd reach for your most versatile board.";
    return `${conditionsBlock}${gearBlock}\n\n${pick}`;
  }

  if (isGearQuestion) {
    const top = recommendations[0];
    if (!top) return gearBlock;
    return `${gearBlock}\n\n${formatNaturalBoardPick(top, input.inventory.boards.length > 0)}`;
  }

  if (includeOutlook) {
    return `${conditionsBlock}Want gear advice too? Ask what board or fins to ride, or name a specific board.`;
  }

  return "Ask me about today's conditions, a spot, or which board from your quiver would work best.";
}

async function aiCoachResponse(
  input: CoachInput,
  askedBoard?: EquipmentRecommendation | null,
  finComparison?: { board: Surfboard; evaluations: FinEvaluation[] } | null,
  hypothetical?: HypotheticalSetupEvaluation | null,
  includeOutlook = false
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const baseUrl = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  const systemPrompt = `You are the Sage — a friendly surf guide for Southern California. You ONLY answer questions about surf conditions, waves, tides, wind, spots, and surfboard or fin recommendations.

If the user asks about anything else, politely decline and redirect them to surf conditions or board advice.

Write in plain natural language only. Never use markdown, asterisks, bold, italics, or section headers.

Do NOT repeat the full surf outlook or conditions report unless the user explicitly asks about conditions, waves, swell, wind, or tide. For follow-up questions, answer only what they asked — explain your prior recommendation in plain language.

Skill level: ${input.inventory.skillLevel}. Keep responses under 250 words unless they ask for detail.`;

  const askedBlock = askedBoard
    ? `\nSpecific board evaluation:\n${JSON.stringify(askedBoard, null, 2)}`
    : "";

  const hypotheticalBlock = hypothetical
    ? `\nHypothetical setup evaluation:\n${JSON.stringify(hypothetical, null, 2)}`
    : "";

  const finBlock = finComparison
    ? `\nFin comparison on ${finComparison.board.name}:\n${JSON.stringify(finComparison.evaluations, null, 2)}`
    : "";

  const regionalBlock = input.regionalConditions?.length
    ? `\nRegional conditions:\n${JSON.stringify(input.regionalConditions.slice(0, 8), null, 2)}`
    : "";

  const contextNote = includeOutlook
    ? "The user asked about conditions — you may summarize current surf."
    : "Do not include a full conditions outlook in this reply unless essential to answer.";

  const contextBlock = `${contextNote}

Active spot conditions:
${JSON.stringify(input.conditions, null, 2)}
${regionalBlock}

Top equipment recommendations:
${JSON.stringify(input.recommendations, null, 2)}
${askedBlock}${hypotheticalBlock}${finBlock}

Inventory:
${JSON.stringify({ boards: input.inventory.boards, fins: input.inventory.fins }, null, 2)}`;

  const historyMessages = (input.conversationHistory ?? [])
    .slice(-10)
    .map((message) => ({
      role: message.role as "user" | "assistant",
      content: message.content,
    }));

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: `${systemPrompt}\n\n${contextBlock}` },
        ...historyMessages,
        { role: "user", content: input.userMessage },
      ],
      temperature: 0.7,
      max_tokens: 600,
    }),
  });

  if (!response.ok) return null;

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };

  return data.choices?.[0]?.message?.content ?? null;
}

export async function generateCoachResponse(
  input: CoachInput
): Promise<CoachResponse> {
  if (!isSurfRelated(input.userMessage, input.conversationHistory)) {
    return {
      message: OFF_TOPIC_MESSAGE,
      conditions: input.conditions,
      recommendations: input.recommendations,
      source: "template",
    };
  }

  if (isFollowUpQuestion(input.userMessage, input.conversationHistory)) {
    const followUp =
      templateFollowUpResponse(
        input.userMessage,
        input.conditions,
        input.recommendations,
        input.conversationHistory
      ) ?? "Happy to clarify — what part of the recommendation should I unpack?";

    return {
      message: followUp,
      conditions: input.conditions,
      recommendations: input.recommendations,
      source: "template",
    };
  }

  const includeOutlook = shouldIncludeOutlook(
    input.userMessage,
    input.conversationHistory,
    {
      isRegional: isRegionalQuestion(input.userMessage),
    }
  );

  const hypothetical = input.explicitHypothetical
    ? evaluateHypotheticalSetup(
        input.explicitHypothetical.board,
        input.explicitHypothetical.fin,
        input.inventory,
        input.conditions
      )
    : resolveHypotheticalSetup(
        input.userMessage,
        input.inventory,
        input.conditions
      );
  const finComparison = hypothetical ? null : resolveFinComparison(input);
  const askedBoard =
    !hypothetical && !finComparison && isSpecificBoardQuestion(input.userMessage)
      ? resolveAskedBoard(input)
      : null;

  const aiMessage = await aiCoachResponse(
    input,
    askedBoard,
    finComparison,
    hypothetical,
    includeOutlook
  );

  const setupRec = hypothetical
    ? {
        ...hypothetical.board,
        score: hypothetical.combinedScore,
        fit: hypothetical.combinedFit,
        finSet: hypothetical.fin.fin,
      }
    : null;

  if (aiMessage) {
    return {
      message: aiMessage,
      conditions: input.conditions,
      recommendations: setupRec
        ? [setupRec, ...input.recommendations].slice(0, 3)
        : askedBoard
          ? [askedBoard, ...input.recommendations.filter((r) => r.board.id !== askedBoard.board.id)].slice(0, 3)
          : input.recommendations,
      source: "ai",
    };
  }

  return {
    message: templateCoachResponse(input, hypothetical, includeOutlook),
    conditions: input.conditions,
    recommendations: setupRec
      ? [setupRec, ...input.recommendations].slice(0, 3)
      : askedBoard
        ? [askedBoard, ...input.recommendations.filter((r) => r.board.id !== askedBoard.board.id)].slice(0, 3)
        : input.recommendations,
    source: "template",
  };
}
