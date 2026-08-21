import type { ChatMessage, EquipmentRecommendation, SurfConditions } from "@/lib/types";
import { getBoardModelById } from "@/lib/board-catalog";

function lastAssistantMessage(history?: ChatMessage[]): string {
  if (!history?.length) return "";
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role === "assistant") return history[i].content;
  }
  return "";
}

function explainStiffUnderspeeded(
  top: EquipmentRecommendation | undefined,
  conditions: SurfConditions
): string {
  const boardName = top?.board.name ?? "that board";
  const model = top?.board.modelId
    ? getBoardModelById(top.board.modelId)
    : null;
  const waveRange = model?.waveRange;

  let rangeNote = "";
  if (waveRange && conditions.waveHeightFt < waveRange.idealMinFt) {
    rangeNote = model
      ? ` ${model.shaper} designed the ${model.model} for roughly ${waveRange.idealMinFt}–${waveRange.idealMaxFt} ft surf, and today is below that.`
      : ` Today's ${conditions.waveHeightFt} ft surf at ${conditions.spot.name} is smaller than what this shape is tuned for.`;
  }

  return `Stiff means the board feels rigid in the water — it won't flex and release easily in weaker surf. Under-speeded means you can't generate enough momentum without extra pumping because the waves don't have enough push.

With ${conditions.waveHeightFt} ft @ ${conditions.wavePeriodSec}s at ${conditions.spot.name}, your ${boardName} wants more energy than what's on offer.${rangeNote}

You'd likely feel more flow on something with more grovel and paddle from your quiver, or wait for a pushier tide or swell window.`;
}

export function templateFollowUpResponse(
  message: string,
  conditions: SurfConditions,
  recommendations: EquipmentRecommendation[],
  history?: ChatMessage[]
): string | null {
  const lower = message.toLowerCase();
  const top = recommendations[0];
  const lastReply = lastAssistantMessage(history).toLowerCase();

  const asksStiff =
    /\bstiff\b/.test(lower) ||
    /\bunder-?speed/.test(lower) ||
    /\bbog\b/.test(lower) ||
    (/\bwhat do you mean\b/.test(lower) &&
      (/\bstiff\b/.test(lastReply) || /\bunder-?speed/.test(lastReply)));

  if (asksStiff) {
    return explainStiffUnderspeeded(top, conditions);
  }

  if (
    /\bwhat do you mean\b/.test(lower) ||
    /\bexplain\b/.test(lower) ||
    /\bclarify\b/.test(lower) ||
    /\bwhy\b/.test(lower)
  ) {
    if (top) {
      const tradeoff = top.tradeoffs[0];
      return `I was talking about your ${top.board.name}. ${top.howItWouldFeel}${
        tradeoff ? ` ${tradeoff}` : ""
      }

Want a different board from your quiver for today's ${conditions.waveHeightFt} ft surf at ${conditions.spot.name}? Just ask.`;
    }
  }

  if (/\bwhy (?:that|this) board\b/.test(lower) && top) {
    return `I picked your ${top.board.name} because it scored best for today's ${conditions.waveHeightFt} ft surf at ${conditions.spot.name} — ${top.fit} fit. ${top.howItWouldFeel}`;
  }

  if (top) {
    return `Happy to clarify. For your ${top.board.name} today: ${top.howItWouldFeel} Ask me about a specific word or another board in your quiver.`;
  }

  return "Happy to clarify — what part of the recommendation should I unpack?";
}
