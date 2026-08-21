import type { ChatMessage, SurfSpot } from "@/lib/types";
import { findBoardModelInText } from "@/lib/board-catalog";
import { matchSpotInMessage } from "@/lib/socal-spots";
import { parseSpotsForComparison as parseComparisonSpots } from "@/engines/coach/spot-comparison";

const SURF_KEYWORDS = [
  "surf",
  "wave",
  "swell",
  "tide",
  "wind",
  "board",
  "fin",
  "fins",
  "quiver",
  "condition",
  "conditions",
  "ride",
  "riding",
  "paddle",
  "grovel",
  "period",
  "offshore",
  "onshore",
  "cross-shore",
  "cross shore",
  "spot",
  "beach",
  "break",
  "shortboard",
  "fish",
  "hybrid",
  "thruster",
  "quad",
  "twin",
  "volume",
  "length",
  "recommend",
  "setup",
  "equipment",
  "overhead",
  "mush",
  "chop",
  "outlook",
  "forecast",
  "sage",
  "shaper",
  "stiff",
  "underspeed",
  "under-speed",
  "bog",
  "speed",
  "rail",
  "pocket",
  "turn",
  "carve",
  "cutback",
  "bottom",
  "lip",
  "duck",
  "popup",
  "pop-up",
  "stance",
  "trimming",
  "generate",
  "barrel",
  "closeout",
  "section",
  "line",
  "mean",
  "means",
  "teach",
  "learn",
  "tip",
  "tips",
  "approach",
  "session",
  "concave",
  "rocker",
  "outline",
  "thruster",
  "quad",
  "liters",
  "liter",
  "jetty",
  "reef",
  "pier",
  "harbor",
  "uppers",
  "lowers",
  "middles",
  "tamarack",
  "ponto",
  "scripps",
  "swell direction",
];

const FOLLOW_UP_PATTERNS = [
  /\bwhat do you mean\b/,
  /\bwhat does that mean\b/,
  /\bwhat did you mean\b/,
  /\bexplain\b/,
  /\bclarify\b/,
  /\btell me more\b/,
  /\bwhy (?:did|do|would) you\b/,
  /\bhow come\b/,
  /\bwhat(?:'s| is) that mean\b/,
  /\bcan you elaborate\b/,
  /\bwhat about that\b/,
  /\bwhy (?:stiff|under)/,
  /\bstiff and\b/,
  /\bunder-?speed/,
];

const BOARD_DESCRIPTION_PATTERN =
  /\b(\d\s*[''′]\s*\d|\d+(\.\d+)?\s*[x×]\s*\d|groveler|fish|shortboard|longboard|mid-?length|hybrid|funboard|step-?up)\b/i;

const BOARD_SHAPE_PATTERN =
  /\b(rocker|tail|crown|swallow|squash|pin|outline|concave|rail|foil|wide|narrow)\b/i;

export function lastAssistantMessage(history?: ChatMessage[]): string {
  if (!history?.length) return "";
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role === "assistant") return history[i].content;
  }
  return "";
}

export function describesBoardOrSetup(message: string): boolean {
  return BOARD_DESCRIPTION_PATTERN.test(message) || BOARD_SHAPE_PATTERN.test(message);
}

export function assistantAskedGearQuestion(history?: ChatMessage[]): boolean {
  const last = lastAssistantMessage(history).toLowerCase();
  return /\b(what board|which board|board are you|running right now|what are you riding|your board|fin setup|what fins|which fins|what kind of waves|what are you running)\b/.test(
    last
  );
}

export function isGearConversationContinuation(
  message: string,
  history?: ChatMessage[]
): boolean {
  if (!history?.some((m) => m.role === "assistant")) return false;

  const lastAssistant = lastAssistantMessage(history).toLowerCase();
  const gearThread =
    /\b(fin|fins|quad|thruster|twin|board|setup|volume|rocker|tail|groveler|mushy|mush)\b/i.test(
      lastAssistant
    );

  if (!gearThread) return false;

  return describesBoardOrSetup(message) || assistantAskedGearQuestion(history);
}

export function isFinConversation(history?: ChatMessage[]): boolean {
  const recent = (history ?? [])
    .filter((m) => m.role === "assistant")
    .slice(-2)
    .map((m) => m.content.toLowerCase())
    .join(" ");
  return /\b(quad|thruster|fin setup|fins)\b/.test(recent);
}

export const OFF_TOPIC_MESSAGE =
  "I'm Sage — your surf coach. I help with waves, conditions, technique, and gear decisions. Ask me about today's surf, what something means, or how to approach a session.";

export function isFollowUpQuestion(
  message: string,
  history?: ChatMessage[]
): boolean {
  if (!history?.some((m) => m.role === "assistant")) return false;

  const lower = message.toLowerCase().trim();
  if (FOLLOW_UP_PATTERNS.some((pattern) => pattern.test(lower))) return true;

  const words = lower.split(/\s+/).length;
  const referencesPrior =
    /\b(that|this|it|those|your (?:pick|recommendation|call))\b/.test(lower);
  const asksWhyOrHow =
    /\b(why|how|what|mean|explain)\b/.test(lower) && words <= 14;

  return referencesPrior && asksWhyOrHow && !matchSpotInMessage(message);
}

export function isSurfCoachingContext(history?: ChatMessage[]): boolean {
  if (!history?.some((m) => m.role === "assistant")) return false;

  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role !== "assistant") continue;
    const content = history[i].content;
    if (content.includes("Style fit today")) return true;
    if (
      /\b(surf|wave|swell|tide|wind|board|fin|pocket|paddle|break|spot)\b/i.test(
        content
      )
    ) {
      return true;
    }
    break;
  }

  return false;
}

export function isAffirmativeReply(message: string): boolean {
  const lower = message.toLowerCase().trim();
  return /^(yes|yeah|yep|yup|sure|please|ok|okay|do it|go ahead|absolutely|definitely)[\s!.?]*$/i.test(
    lower
  );
}

export function assistantOfferedVolumeBoardFollowUp(
  history?: ChatMessage[]
): boolean {
  const last = lastAssistantMessage(history).toLowerCase();
  return (
    /\bmatching that to a board type\b/.test(last) ||
    /\btarget around [\d.]+l\b/.test(last) ||
    (/\b\d+–\d+l\b/.test(last) && /\b(beginner|intermediate|advanced|volume|liters?)\b/.test(last))
  );
}

export function isVolumeBoardFollowUp(
  message: string,
  history?: ChatMessage[]
): boolean {
  if (!history?.some((m) => m.role === "assistant")) return false;
  return (
    isAffirmativeReply(message) && assistantOfferedVolumeBoardFollowUp(history)
  );
}

export function assistantOfferedConditionsLink(history?: ChatMessage[]): boolean {
  const last = lastAssistantMessage(history).toLowerCase();
  if (assistantOfferedVolumeBoardFollowUp(history)) return false;
  return (
    /\bconnect.+(?:today|conditions|surf)\b/.test(last) ||
    /\btoday.+conditions\b/.test(last) ||
    /\bwant me to connect\b/.test(last) ||
    /\bhow it fits your\b/.test(last) ||
    /\b(want|would you like).*(?:today|conditions|forecast|surf)\b/.test(last) ||
    /\b(pull|check|look at|get).*(?:today'?s?|current).*(?:conditions|surf|forecast)\b/.test(
      last
    ) ||
    (/\?/.test(last) &&
      /\b(today|conditions|forecast|surf)\b/.test(last) &&
      /\b(want|like|should)\b/.test(last) &&
      !/\bboard type\b/.test(last))
  );
}

export function isConditionsConnectionFollowUp(
  message: string,
  history?: ChatMessage[]
): boolean {
  if (!history?.some((m) => m.role === "assistant")) return false;
  return isAffirmativeReply(message) && assistantOfferedConditionsLink(history);
}

export function resolveSpotFromConversation(
  message: string,
  history?: ChatMessage[]
): SurfSpot | null {
  const fromMessage = matchSpotInMessage(message);
  if (fromMessage) return fromMessage;

  if (!history?.length) return null;

  for (let i = history.length - 1; i >= 0; i--) {
    const spot = matchSpotInMessage(history[i].content);
    if (spot) return spot;
  }

  return null;
}

/** True when the user asks about surf on a future day (tomorrow, weekend, Monday…). */
export function isFutureConditionsQuestion(message: string): boolean {
  const lower = message.toLowerCase();
  const hasFutureRef =
    /\btomorrow\b/.test(lower) ||
    /\bday after tomorrow\b/.test(lower) ||
    /\b(this\s+)?weekend\b/.test(lower) ||
    /\bin\s+\d+\s+days?\b/.test(lower) ||
    /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/.test(
      lower
    );

  if (!hasFutureRef) return false;
  if (/\btoday\b/.test(lower) && !/\btomorrow\b/.test(lower)) return false;

  const hasSurfAsk =
    /\b(surf|waves?|swell|condition|conditions|forecast|outlook)\b/.test(
      lower
    ) ||
    /\bhow(?:'s|\s+will|\s+is|\s+are)\b/.test(lower) ||
    /\bwhat(?:'s| is| are)\b/.test(lower);

  return hasSurfAsk || Boolean(matchSpotInMessage(message));
}

export function isSpotConditionsQuestion(message: string): boolean {
  if (isDetailedConditionsRequest(message)) return true;
  if (isFutureConditionsQuestion(message)) return true;

  const lower = message.toLowerCase();
  const hasSpot = Boolean(matchSpotInMessage(message));

  // Clock / session-time asks (9am, dawn patrol, afternoon…)
  if (
    /\b(?:at\s+)?\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)\b/i.test(lower) ||
    /\b(dawn\s*patrol|late\s+morning|early\s+morning|mid[-\s]?morning|afternoon|evening|sunset|midday|noon)\b/.test(
      lower
    )
  ) {
    if (
      /\b(surf|waves?|swell|condition|conditions|forecast|outlook|how|what)\b/.test(
        lower
      )
    ) {
      return true;
    }
  }

  if (
    /\b(how['']?s|how is|how will|how're|how are)\s+(the\s+)?(surf|waves)\b/i.test(
      lower
    )
  ) {
    return true;
  }
  if (/\b(surf|waves)\s+(today|tomorrow)\b/i.test(lower)) return true;
  if (/\btoday\b/.test(lower) && hasSpot) return true;
  if (/\btomorrow\b/.test(lower) && hasSpot) return true;
  if (
    hasSpot &&
    /\b(condition|conditions|forecast|outlook|report)\b/i.test(lower)
  ) {
    return true;
  }

  return false;
}

export const SAGE_DEETS_PROMPT = "Show me the deets";

export const VOLUME_QUICK_PROMPT = "What volume board should I ride?";

export const VOLUME_EXPERIENCE_OPTIONS = [
  "beginner",
  "intermediate",
  "advanced",
] as const;

export type VolumeFormExperience = (typeof VOLUME_EXPERIENCE_OPTIONS)[number];

export function isDetailedConditionsRequest(message: string): boolean {
  const lower = message.toLowerCase().trim();
  if (lower === SAGE_DEETS_PROMPT.toLowerCase()) return true;
  if (lower === "show me today's swell, wind, and tide") return true;
  if (/\b(detailed|current)\b/.test(lower) && /\b(swell|wind|tide|condition)/.test(lower)) {
    return true;
  }
  if (/\bshow me\b/.test(lower) && /\b(swell|wind|tide)\b/.test(lower)) {
    return true;
  }
  return false;
}

export const BOARD_DESIGN_MENU_PROMPT = "Ask me about board and fin design";

export function isBoardDesignQuestion(message: string): boolean {
  const lower = message.toLowerCase();

  if (parseComparisonSpots(message).length >= 2) return false;

  if (/\b(tail|tails)\b/.test(lower) && /\b(squash|round|swallow|pin|square)\b/.test(lower)) {
    if (
      /\b(vs|versus|compare|compared|difference|how does|how do|work|works|what is|explain|when to use)\b/.test(
        lower
      )
    ) {
      return true;
    }
    if (
      /\b(longboard|shortboard|fish|groveler|hybrid|mid-?length|funboard)\b/.test(
        lower
      )
    ) {
      return true;
    }
  }

  const designTopic =
    /\b(tail|rail|rails|rocker|concave|outline|foil|volume|glass|bottom contour|fin template|fin setup|fin placement)\b/.test(
      lower
    );
  const designAsk =
    /\b(how does|how do|compare|vs|versus|difference|what is|explain|design|shape|types?|tell me|about)\b/.test(
      lower
    );

  return designTopic && designAsk;
}

export function isRailDesignQuestion(message: string): boolean {
  const lower = message.toLowerCase();
  if (!/\b(rail|rails)\b/.test(lower)) return false;

  if (/\b(vs|versus|compare)\b/.test(lower) && /\b(full|soft|hard|down|50|60|70)\b/.test(lower)) {
    return true;
  }

  return (
    /\b(type|types|profile|profiles|50\/50|60\/40|70\/30|bevel|chamfer|boxy)\b/.test(lower) ||
    /\b(hard|soft|full|down)\b/.test(lower) ||
    /\b(hooky|hook|bite|release|engage|turn|carv|noseride|tun(e|ing))\b/.test(lower) ||
    /\b(what|explain|how|which|tell me|about|describe|difference)\b/.test(lower) ||
    /\brail\b/.test(lower)
  );
}

export function isSpotComparisonQuestion(message: string): boolean {
  const lower = message.toLowerCase();
  const spots = parseComparisonSpots(message);
  if (spots.length < 2) return false;

  if (isBoardDesignQuestion(message)) return false;

  return (
    /\b(compare|compared|vs\.?|versus)\b/.test(lower) ||
    /\bhow does\b/.test(lower) ||
    /\bwhich (?:is |would be |works )?better\b/.test(lower) ||
    (/\b(between|or)\b/.test(lower) && /\btoday\b/.test(lower))
  );
}

export function isBoardDesignMenuRequest(message: string): boolean {
  return message.trim().toLowerCase() === BOARD_DESIGN_MENU_PROMPT.toLowerCase();
}

export function assistantOfferedBoardDesignMenu(history?: ChatMessage[]): boolean {
  const last = lastAssistantMessage(history).toLowerCase();
  return (
    /\bwhat would you like to know\b/.test(last) &&
    /\b(tail shapes|rails|bottom contours|fin design)\b/.test(last)
  );
}

export function isBoardDesignFollowUp(
  message: string,
  history?: ChatMessage[]
): boolean {
  if (!history?.some((m) => m.role === "assistant")) return false;
  if (!assistantOfferedBoardDesignMenu(history)) return false;

  const lower = message.toLowerCase();
  return (
    /\b(tail|rail|rocker|concave|fin|volume|outline|squash|round|swallow|pin|thruster|quad|foil|contour|glass|stringer|laminate|cant|toe)\b/.test(
      lower
    ) || /\b(how does|compare|vs|versus|difference|design)\b/.test(lower)
  );
}

export function wantsFullBuildSheet(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    /\b(full build|build sheet|cad-ready|complete spec|detailed measurements|alternate conservative|alternate aggressive)\b/.test(
      lower
    ) || /\bwrite shaper notes\b/.test(lower)
  );
}

export function isShaperDesignConversation(
  message: string,
  history?: ChatMessage[]
): boolean {
  if (isBoardDesignMenuRequest(message)) return true;
  if (isBoardDesignQuestion(message)) return true;
  if (isRailDesignQuestion(message)) return true;
  if (isBoardDesignFollowUp(message, history)) return true;
  if (isGearConversationContinuation(message, history)) return true;

  const lower = message.toLowerCase();

  if (/\bdesign a\b/.test(lower) && /\b(board|shortboard|fish|hybrid|groveler|longboard|step-up)\b/.test(lower)) {
    return true;
  }
  if (/\bshaper notes?\b/.test(lower)) return true;
  if (/\b(full )?build (spec|sheet|notes)\b/.test(lower)) return true;
  if (/\bfin setups?\b/.test(lower) && /\b(conservative|aggressive|compare|two|alternate)\b/.test(lower)) {
    return true;
  }
  if (
    /\b(tail shape|rail profile|bottom contour|rocker profile|glass schedule|fin template|fin placement|stringer|laminate|foil curve|cant|toe-in)\b/i.test(
      message
    )
  ) {
    return true;
  }

  if (assistantOfferedBoardDesignMenu(history)) {
    if (
      /\b(tail|rail|rocker|concave|fin|volume|outline|squash|round|swallow|pin|thruster|quad|design|foil|contour|shape|template)\b/i.test(
        lower
      )
    ) {
      return true;
    }
  }

  return false;
}

export function isSurfRelated(
  message: string,
  history?: ChatMessage[]
): boolean {
  const lower = message.toLowerCase().trim();
  if (!lower) return false;

  if (isFollowUpQuestion(message, history)) return true;
  if (isGearConversationContinuation(message, history)) return true;
  if (isShaperDesignConversation(message, history)) return true;
  if (isSpotComparisonQuestion(message)) return true;
  if (isConditionsConnectionFollowUp(message, history)) return true;

  if (SURF_KEYWORDS.some((keyword) => lower.includes(keyword))) return true;
  if (findBoardModelInText(message)) return true;
  if (matchSpotInMessage(message)) return true;

  return false;
}

export function shouldIncludeOutlook(
  message: string,
  history?: ChatMessage[],
  options?: { isRegional?: boolean }
): boolean {
  if (options?.isRegional) return false;
  if (isConditionsConnectionFollowUp(message, history)) return true;
  if (isDetailedConditionsRequest(message)) return true;
  if (isSpotConditionsQuestion(message)) return true;
  if (isFollowUpQuestion(message, history)) return false;

  const lower = message.toLowerCase();
  if (
    /\b(condition|conditions|outlook|forecast|waves today|how are the waves|swell|wind|tide)\b/.test(
      lower
    )
  ) {
    return true;
  }

  if (/\b(how['']?s|how is)\s+(the\s+)?(surf|waves)\b/i.test(lower)) {
    return true;
  }

  const isGearOnly =
    /\b(board|fin|quiver|ride|setup|recommend|best|pick)\b/.test(lower) &&
    !/\b(condition|wave|swell|wind|tide|outlook|surf today)\b/.test(lower);

  if (isGearOnly) return false;

  return false;
}
