import type { ExperienceLevel } from "@/lib/auth/types";
import type { SurfConditions } from "@/lib/types";
import { BOARD_DESIGN_KNOWLEDGE } from "./boards";
import { RAIL_DESIGN_KNOWLEDGE } from "./rails";
import { FIN_KNOWLEDGE } from "./fins";
import {
  findSpotKnowledge,
  findSpotKnowledgeByCatalogId,
  formatSpotKnowledge,
  SAGE_SPOT_KNOWLEDGE,
} from "./spots";
import {
  parseFitnessFromMessage,
  parseWeightFromMessage,
  parseExperienceFromMessage,
  formatVolumeCoachMessage,
  formatVolumeBoardFollowUp,
  findVolumeContextFromHistory,
  recommendVolumeLiters,
  VOLUME_KNOWLEDGE,
} from "./volume";

const BOARD_KEYWORDS =
  /\b(concave|rail|rails|rocker|outline|foil|tail|squash|swallow|pin tail|nose|bottom contour|planing|shape|glass|laminate|stringer|cant|toe-in|shaper|build spec)\b/i;

const FIN_KEYWORDS =
  /\b(fin|fins|thruster|quad|twin|template|rake|side bite|2\+1|single fin)\b/i;

const VOLUME_KEYWORDS =
  /\b(volume|liters?|litres?|float|paddle|how many liters|board size|what size board)\b/i;

const SPOT_KEYWORDS =
  /\b(spot|break|beach|reef|jetty|pier|harbor|how does .+ break|how's .+ break|how is .+ break)\b/i;

export type SageKnowledgeTopic =
  | "spot"
  | "board"
  | "fin"
  | "volume"
  | "general";

export function classifyKnowledgeTopic(message: string): SageKnowledgeTopic[] {
  const topics: SageKnowledgeTopic[] = [];
  const mentionedSpot = findSpotKnowledge(message);

  if (mentionedSpot || SPOT_KEYWORDS.test(message)) {
    topics.push("spot");
  }
  if (BOARD_KEYWORDS.test(message)) topics.push("board");
  if (FIN_KEYWORDS.test(message)) topics.push("fin");
  if (VOLUME_KEYWORDS.test(message) || parseWeightFromMessage(message)) {
    topics.push("volume");
  }
  if (topics.length === 0) topics.push("general");
  return topics;
}

export function isEquipmentOrConceptQuestion(message: string): boolean {
  const topics = classifyKnowledgeTopic(message);
  return topics.some((t) => t === "board" || t === "fin" || t === "volume");
}

export function buildSageKnowledgeContext(
  message: string,
  options?: {
    activeSpotName?: string;
    experienceLevel?: ExperienceLevel;
    includeActiveSpot?: boolean;
  }
): string {
  const sections: string[] = [];
  const topics = classifyKnowledgeTopic(message);
  const mentionedSpot = findSpotKnowledge(message);
  const equipmentQuestion = isEquipmentOrConceptQuestion(message);

  if (mentionedSpot) {
    sections.push(formatSpotKnowledge(mentionedSpot));
  } else if (topics.includes("spot") && !equipmentQuestion) {
    const spotNames = SAGE_SPOT_KNOWLEDGE.map((s) => s.name).join(", ");
    sections.push(
      `Sage knows these breaks in detail: ${spotNames}. Use spot-specific knowledge when answering.`
    );
  } else if (
    options?.includeActiveSpot !== false &&
    options?.activeSpotName &&
    !equipmentQuestion &&
    topics.includes("general")
  ) {
    const spot = findSpotKnowledge(options.activeSpotName);
    if (spot) sections.push(formatSpotKnowledge(spot));
  }

  if (topics.includes("board")) {
    sections.push(BOARD_DESIGN_KNOWLEDGE);
  }

  if (/\b(rail|rails)\b/i.test(message)) {
    sections.push(RAIL_DESIGN_KNOWLEDGE);
  }

  if (topics.includes("fin")) {
    sections.push(FIN_KNOWLEDGE);
  }

  if (topics.includes("volume")) {
    sections.push(VOLUME_KNOWLEDGE);

    const weight = parseWeightFromMessage(message);
    if (weight && options?.experienceLevel) {
      const fitness = parseFitnessFromMessage(message) ?? "average";
      const rec = recommendVolumeLiters(weight, options.experienceLevel, fitness);
      sections.push(
        `CALCULATED VOLUME (${weight} lbs, ${options.experienceLevel}, ${fitness} fitness): ${rec.explanation}`
      );
    }
  }

  if (sections.length === 0) {
    return "";
  }

  const focusNote = equipmentQuestion
    ? "IMPORTANT: The user asked an equipment/concept question. Answer that directly. Do not discuss surf spots unless they asked about one."
    : "Use when relevant — teach with specifics, explain why.";

  return `SAGE KNOWLEDGE BASE (${focusNote}):\n\n${sections.join("\n\n---\n\n")}`;
}

export function matchKnowledgeSpotInMessage(
  message: string
): ReturnType<typeof findSpotKnowledge> {
  return findSpotKnowledge(message);
}

export {
  BOARD_DESIGN_KNOWLEDGE,
  RAIL_DESIGN_KNOWLEDGE,
  FIN_KNOWLEDGE,
  VOLUME_KNOWLEDGE,
  SAGE_SPOT_KNOWLEDGE,
  findSpotKnowledge,
  findSpotKnowledgeByCatalogId,
  formatSpotKnowledge,
  recommendVolumeLiters,
  parseWeightFromMessage,
  parseFitnessFromMessage,
  parseExperienceFromMessage,
  formatVolumeCoachMessage,
  formatVolumeBoardFollowUp,
  findVolumeContextFromHistory,
};
