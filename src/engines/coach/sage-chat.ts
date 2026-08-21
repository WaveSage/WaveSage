import type { ChatMessage, SurfConditions } from "@/lib/types";
import type { CoachPeriod } from "@/lib/coach-period";
import type { UserProfile } from "@/lib/auth/types";
import { estimateVolumeL } from "@/lib/board-dimensions";
import { buildSageSystemPrompt, buildShaperDesignSystemPrompt, buildRailDesignSystemPrompt } from "./sage-persona";
import { templateBoardDesignAnswer, templateBoardDesignFallback } from "./board-design-templates";
import { templateRailDesignAnswer } from "./rail-design-templates";
import {
  classifyKnowledgeTopic,
  findSpotKnowledge,
  recommendVolumeLiters,
  parseWeightFromMessage,
  parseFitnessFromMessage,
  parseExperienceFromMessage,
  formatVolumeCoachMessage,
  formatVolumeBoardFollowUp,
} from "@/lib/sage-knowledge";
import {
  buildSpotComparisonReport,
  parseSpotsForComparison,
} from "@/engines/coach/spot-comparison";
import { formatSpotConditionsReport, formatDetailedConditionsReport } from "./spot-conditions";
import {
  isBoardDesignFollowUp,
  isBoardDesignMenuRequest,
  isBoardDesignQuestion,
  isConditionsConnectionFollowUp,
  isDetailedConditionsRequest,
  isFinConversation,
  isGearConversationContinuation,
  isFutureConditionsQuestion,
  isRailDesignQuestion,
  isShaperDesignConversation,
  isSpotComparisonQuestion,
  isSpotConditionsQuestion,
  isSurfRelated,
  isVolumeBoardFollowUp,
  lastAssistantMessage,
  wantsFullBuildSheet,
} from "./topic-guard";
import {
  formatFutureConditionsReport,
  parseForecastDayRequest,
} from "./future-forecast";
import { fetchSpotForecast } from "@/engines/conditions/forecast";
import { matchSpotInMessage } from "@/lib/socal-spots";

const STYLE_SHORT = {
  cruise: "cruise / longboard",
  trim: "trim and glide",
  carving: "carving / shortboard",
} as const;

const EXPERIENCE_SHORT = {
  beginner: "beginner",
  intermediate: "intermediate",
  advanced: "advanced",
  pro: "pro",
} as const;

interface SageChatInput {
  userMessage: string;
  conditions: SurfConditions;
  profile: UserProfile;
  regionalConditions?: SurfConditions[];
  coachPeriod?: CoachPeriod;
  conversationHistory?: ChatMessage[];
}

function parseBoardDimensions(message: string): {
  lengthFt: number;
  widthIn: number;
  thicknessIn: number;
} | null {
  const match = message.match(
    /(\d)\s*[''′]\s*(\d)?\s*[x×]\s*(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/i
  );
  if (!match) return null;

  const feet = Number(match[1]);
  const inches = match[2] ? Number(match[2]) : 0;
  const widthIn = Number(match[3]);
  const thicknessIn = Number(match[4]);

  if (![feet, inches, widthIn, thicknessIn].every(Number.isFinite)) return null;

  return {
    lengthFt: Math.round((feet + inches / 12) * 100) / 100,
    widthIn,
    thicknessIn,
  };
}

function templateFinAnswer(message: string): string | null {
  const lower = message.toLowerCase();
  const mushy = /\b(mush|mushy|weak|gutless|small|soft)\b/.test(lower);
  const asksQuadThruster =
    /\b(quad|thruster)\b/.test(lower) &&
    (/\b(difference|vs|versus|compare|or)\b/.test(lower) ||
      /\bquad\b.*\bthruster\b/.test(lower) ||
      /\bthruster\b.*\bquad\b/.test(lower));

  if (!asksQuadThruster) return null;

  if (mushy) {
    return `In mushy, weak surf, a quad usually wins on speed and drive.

A thruster has a center fin that adds hold and control, but also drag — in gutless waves that drag can make the board feel slow and hard to keep moving through flat sections.

A quad spreads the fin area to the rails without a center fin, so you get more planing area and quicker acceleration off weak bumps. The tradeoff is less pivot in the pocket and less hold when waves get steep and hollow.

Coaching tip: on mushy days, think speed first — smaller quad fins or a quad setup on a fish or groveler often feels way more alive than a standard thruster. What board are you running right now?`;
  }

  return `Thruster vs quad comes down to hold vs speed.

A thruster (three fins) gives you a center fin for control and predictable release — great when waves have shape and you want to hit the lip or fit tight pockets.

A quad (four fins) drives off the rails with less center-fin drag — faster through flat sections, looser off the top, but can feel skatey when waves get steep.

Coaching tip: match the setup to the wave — thruster for punchy, shaped peaks; quad when you need to generate speed in weaker surf. What kind of waves are you surfing most?`;
}

function templateGearContinuation(
  message: string,
  history: ChatMessage[] | undefined
): string | null {
  if (!isGearConversationContinuation(message, history)) return null;

  const lower = message.toLowerCase();
  const dims = parseBoardDimensions(message);
  const volumeNote = dims
    ? ` Rough volume on that shape is about ${estimateVolumeL(dims.lengthFt, dims.widthIn, dims.thicknessIn)}L.`
    : "";

  const isGroveler = /\bgroveler\b/.test(lower);
  const mushyThread =
    /\b(mush|mushy|weak|gutless)\b/i.test(lastAssistantMessage(history)) ||
    isFinConversation(history);

  if (mushyThread && (isGroveler || isFinConversation(history))) {
    const tailNote = /\bcrown\b/.test(lower)
      ? " That crown tail gives you a bit of release off the top without feeling as skatey as a wide squash tail."
      : "";

    return `That groveler is a strong match for mushy surf — especially with low rocker.${volumeNote}

Low rocker helps you plane early and keep speed through flat sections, which is exactly what weak waves demand. At 5'2" × 20.5" you're on a nimble groveler with plenty of width to paddle and get into soft waves.${tailNote}

For fins, I'd run a quad on this board in mush — medium-sized quad fins (or slightly smaller if you're light on your feet). The wide tail and low rocker already generate speed; quads add drive without the center-fin drag that makes thrusters bog in gutless surf.

If you only have a thruster setup, use smaller side fins and accept that you'll pump more through dead sections.

Want help dialing fin size for your weight, or talking about when to switch back to thruster on a punchier day?`;
  }

  if (dims || /\b(board|rocker|tail|fin)\b/i.test(message)) {
    return `Got it — that helps.${volumeNote}

Based on what you described, tell me if you're trying to optimize for small mushy days, punchy beach breaks, or something in between — I'll tie the shape and fin setup to that.`;
  }

  return null;
}

const BOARD_DESIGN_MENU_REPLY = `What would you like to know? I can walk through tail shapes, rails, bottom contours, rocker, outline, volume, fin setups, glass schedules, and how each changes how a board surfs — or design a custom board from your weight, style, and typical waves.

Try: "How does a squash tail compare to a swallow tail?" or "Design a 6'0 board for punchy beach breaks with more drive."`;

function templateShaperDesignPrompt(
  message: string,
  profile: UserProfile,
  conditions: SurfConditions
): string | null {
  const lower = message.toLowerCase();
  const asksDesign =
    /\bdesign a\b/.test(lower) ||
    /\bshaper notes?\b/.test(lower) ||
    wantsFullBuildSheet(message);

  if (!asksDesign) return null;

  const weight = parseWeightFromMessage(message);
  const weightNote = weight ? ` around ${weight} lbs` : "";

  return `I'd start with your ${STYLE_SHORT[profile.stylePreference]} intent${weightNote} and the ${conditions.waveHeightFt} ft surf you're usually chasing.

Before I lock a full spec, what's your weight and typical wave — mushy beach break, punchy peaks, or hollow reef? One line on that and I'll give you length, liters, rocker, tail, rails, bottom, and a fin setup with build notes.

Want the full build spec after that?`;
}

function templateSageChat(
  message: string,
  conditions: SurfConditions,
  profile: UserProfile,
  history?: ChatMessage[],
  regional?: SurfConditions[]
): string {
  const lower = message.toLowerCase();
  const topics = classifyKnowledgeTopic(message);

  if (isVolumeBoardFollowUp(message, history)) {
    return formatVolumeBoardFollowUp(profile, conditions, history);
  }

  if (isSpotComparisonQuestion(message) && regional?.length) {
    const spots = parseSpotsForComparison(message);
    const report = buildSpotComparisonReport(spots, regional);
    if (report) return report;
  }

  if (isBoardDesignMenuRequest(message)) {
    return BOARD_DESIGN_MENU_REPLY;
  }

  if (isRailDesignQuestion(message)) {
    return templateRailDesignAnswer(message, conditions, profile);
  }

  if (
    isBoardDesignFollowUp(message, history) ||
    isBoardDesignQuestion(message)
  ) {
    const designAnswer = templateBoardDesignAnswer(message, conditions);
    if (designAnswer) return designAnswer;
    return templateBoardDesignFallback(message, conditions);
  }

  const shaperPrompt = templateShaperDesignPrompt(message, profile, conditions);
  if (shaperPrompt) return shaperPrompt;

  const gearContinuation = templateGearContinuation(message, history);
  if (gearContinuation) return gearContinuation;

  if (isVolumeBoardFollowUp(message, history)) {
    return formatVolumeBoardFollowUp(profile, conditions, history);
  }

  if (
    isConditionsConnectionFollowUp(message, history) ||
    (isSpotConditionsQuestion(message) && !isFutureConditionsQuestion(message))
  ) {
    if (isDetailedConditionsRequest(message)) {
      return formatDetailedConditionsReport(conditions);
    }
    return formatSpotConditionsReport(conditions);
  }

  if (!isSurfRelated(message, history)) {
    return `Happy to chat about that. I'm Sage — surf coach first, but I'm not only useful when there's swell in the water.

What's on your mind? If you want to tie it back to the ocean, just say the word.`;
  }

  const finAnswer = templateFinAnswer(message);
  if (finAnswer) return finAnswer;

  const mentionedSpot = findSpotKnowledge(message);
  const asksTodayAtSpot =
    mentionedSpot &&
    (/\b(today|how['']?s|how is)\b/i.test(lower) ||
      /\b(surf|waves)\s+today\b/i.test(lower));

  if (asksTodayAtSpot && !isFutureConditionsQuestion(message)) {
    return formatSpotConditionsReport(conditions);
  }

  // Future-day surf questions are handled asynchronously in generateSageCoachChat /
  // profile-coach — don't answer with a static break overview.
  if (isFutureConditionsQuestion(message)) {
    return `Pulling forecast data… If you still see this, ask again for tomorrow or a named day at a spot.`;
  }

  if (mentionedSpot && topics.includes("spot")) {
    return `${mentionedSpot.name} — quick local read:

${mentionedSpot.howItBreaks}

Best swell: ${mentionedSpot.bestSwellDirection.split(".")[0]}.
Cleanest wind: ${mentionedSpot.cleanWindDirection.split(".")[0]}.

${mentionedSpot.localTips}

Want me to connect that to today's ${conditions.waveHeightFt} ft conditions, tomorrow's forecast, or your ${STYLE_SHORT[profile.stylePreference]} style?`;
  }

  const weight = parseWeightFromMessage(message);
  if (weight) {
    const fitness = parseFitnessFromMessage(message) ?? "average";
    const level = parseExperienceFromMessage(message) ?? profile.experienceLevel;
    const rec = recommendVolumeLiters(weight, level, fitness);
    return formatVolumeCoachMessage(rec);
  }

  if (/\bpocket\b/.test(lower)) {
    return `The pocket is the steepest, most powerful section of the wave — right where the energy is concentrated, just ahead of the breaking lip. Think of it like the engine of the wave.

Staying loose there means bent knees, relaxed shoulders, and your weight centered so you can react as the wave shifts. It matters because the pocket moves fast; stiff bodies lose speed and timing.

Coaching tip: look where you want to go, not down at your feet. What part of the pocket are you trying to improve — getting in, staying in, or coming off the top?`;
  }

  if (/\bwhy\b/.test(lower) && history?.length) {
    return `Good question — let me connect the dots.

${lastAssistantMessage(history).split("\n").slice(0, 3).join(" ")}

Tell me which part you want unpacked and I'll go deeper.`;
  }

  if (topics.includes("fin")) {
    return templateFinAnswer("quad vs thruster in mushy surf")!;
  }

  if (history?.length) {
    return `I'm still with you on this — could you say a bit more about what you're trying to figure out? Gear, technique, or how to ride today's ${conditions.waveHeightFt} ft surf?`;
  }

  return `Ask me about fins, board shape, volume, a spot, or how today fits your ${EXPERIENCE_SHORT[profile.experienceLevel]} ${STYLE_SHORT[profile.stylePreference]} style.`;
}

export async function generateSageCoachChat(
  input: SageChatInput
): Promise<{ message: string; source: "ai" | "template" }> {
  if (
    isSpotComparisonQuestion(input.userMessage) &&
    input.regionalConditions?.length
  ) {
    const spots = parseSpotsForComparison(input.userMessage);
    const report = buildSpotComparisonReport(
      spots,
      input.regionalConditions
    );
    if (report) {
      return { message: report, source: "template" };
    }
  }

  if (isVolumeBoardFollowUp(input.userMessage, input.conversationHistory)) {
    return {
      message: formatVolumeBoardFollowUp(
        input.profile,
        input.conditions,
        input.conversationHistory
      ),
      source: "template",
    };
  }

  if (
    isConditionsConnectionFollowUp(
      input.userMessage,
      input.conversationHistory
    ) ||
    isSpotConditionsQuestion(input.userMessage)
  ) {
    if (isFutureConditionsQuestion(input.userMessage)) {
      const dayRequest = parseForecastDayRequest(input.userMessage);
      if (dayRequest) {
        const mentioned =
          matchSpotInMessage(input.userMessage) ?? input.conditions.spot;
        try {
          const forecast = await fetchSpotForecast(mentioned);
          return {
            message: formatFutureConditionsReport(forecast, dayRequest),
            source: "template",
          };
        } catch {
          return {
            message: `I couldn't pull the multi-day forecast for ${mentioned.name} just now. Try again in a minute, or open the Spots tab and tap the pin for the 5-day view.`,
            source: "template",
          };
        }
      }
    }

    const message = isDetailedConditionsRequest(input.userMessage)
      ? formatDetailedConditionsReport(input.conditions)
      : formatSpotConditionsReport(input.conditions);
    return { message, source: "template" };
  }

  if (isBoardDesignMenuRequest(input.userMessage)) {
    return { message: BOARD_DESIGN_MENU_REPLY, source: "template" };
  }

  const weightLbs = parseWeightFromMessage(input.userMessage);
  if (weightLbs) {
    const fitness = parseFitnessFromMessage(input.userMessage) ?? "average";
    const level =
      parseExperienceFromMessage(input.userMessage) ?? input.profile.experienceLevel;
    const rec = recommendVolumeLiters(weightLbs, level, fitness);
    return { message: formatVolumeCoachMessage(rec), source: "template" };
  }

  if (
    isBoardDesignFollowUp(input.userMessage, input.conversationHistory) ||
    isBoardDesignQuestion(input.userMessage)
  ) {
    const designAnswer = templateBoardDesignAnswer(
      input.userMessage,
      input.conditions
    );
    if (designAnswer) {
      return { message: designAnswer, source: "template" };
    }
  }

  const railDesign = isRailDesignQuestion(input.userMessage);
  const shaperDesign =
    !railDesign &&
    isShaperDesignConversation(
      input.userMessage,
      input.conversationHistory
    );
  const fullBuildSheet = wantsFullBuildSheet(input.userMessage);

  const systemPrompt = railDesign
    ? buildRailDesignSystemPrompt(
        input.profile,
        input.conditions,
        input.userMessage,
        input.coachPeriod
      )
    : shaperDesign
      ? buildShaperDesignSystemPrompt(
          input.profile,
          input.conditions,
          input.userMessage,
          input.coachPeriod
        )
      : buildSageSystemPrompt(
          input.profile,
          input.conditions,
          input.userMessage,
          input.coachPeriod
        );

  const designMode = railDesign || shaperDesign;

  const historyMessages = (input.conversationHistory ?? [])
    .slice(-10)
    .map((message) => ({
      role: message.role as "user" | "assistant",
      content: message.content,
    }));

  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey) {
    const baseUrl = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
    const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content: railDesign
                ? `${systemPrompt}

You are in WaveSage rail design mode. Follow the default rail response structure from the rail persona. Answer the user's exact question first — rail types, comparisons, placement, tuning fixes, or shaper measurements.

Do not discuss surf spots or forecasts unless they asked to tie rail choice to a break or today's conditions.

Use the knowledge base; explain bite vs release and expected feel. Do not fabricate proprietary brand IP.

${fullBuildSheet ? "The user asked for a full build sheet — you may exceed 180 words with taper zones, mm targets, bevel specs, and rail transition notes." : "Keep responses under ~180 words unless they asked for a full build sheet or shaper notes."}

Write in plain natural language without markdown headers or asterisks.`
                : shaperDesign
                ? `${systemPrompt}

You are in WaveSage shaper and fin design mode. Follow the default design response structure from the shaper persona. Answer the user's exact question first — hypothetical designs, fin comparisons, tail/rail/contour questions, or shaper build notes.

Do not discuss surf spots or forecasts unless they asked to tie the design to a break or today's conditions.

Use the knowledge base; explain physics and expected feel. Do not fabricate proprietary brand IP.

${fullBuildSheet ? "The user asked for a full build sheet — you may exceed 180 words with detailed measurements, foil curves, rail percentages, glass schedule, and fin template specs." : "Keep responses under ~180 words unless they asked for a full build sheet."}

Write in plain natural language without markdown headers or asterisks.`
                : `${systemPrompt}

Answer the user's exact question first. Continue the conversation naturally — if they are replying with board specs or gear details, respond to that directly.

Do not discuss surf spots, conditions, or forecasts unless they asked about those.

For surf equipment and technique questions, use the knowledge base and explain why — do not pivot to spot guides or generic greetings.

Keep responses under 280 words unless the user asks for detail. Write in plain natural language.`,
            },
            ...historyMessages,
            { role: "user", content: input.userMessage },
          ],
          temperature: 0.7,
          max_tokens:
            designMode && fullBuildSheet ? 900 : designMode ? 500 : 500,
        }),
      });

      if (response.ok) {
        const data = (await response.json()) as {
          choices?: { message?: { content?: string } }[];
        };
        const content = data.choices?.[0]?.message?.content?.trim();
        if (content) {
          return { message: content, source: "ai" };
        }
      }
    } catch {
      // fall through
    }
  }

  if (railDesign) {
    return {
      message: templateRailDesignAnswer(
        input.userMessage,
        input.conditions,
        input.profile
      ),
      source: "template",
    };
  }

  if (shaperDesign || isBoardDesignQuestion(input.userMessage)) {
    return {
      message: templateBoardDesignFallback(
        input.userMessage,
        input.conditions
      ),
      source: "template",
    };
  }

  return {
    message: templateSageChat(
      input.userMessage,
      input.conditions,
      input.profile,
      input.conversationHistory,
      input.regionalConditions
    ),
    source: "template",
  };
}
