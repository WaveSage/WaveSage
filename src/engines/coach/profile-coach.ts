import type { ChatMessage, CoachResponse, SurfConditions } from "@/lib/types";
import type { CoachPeriod } from "@/lib/coach-period";
import type { UserProfile } from "@/lib/auth/types";
import { isRegionalQuestion, matchSpotInMessage, getSpotById } from "@/lib/socal-spots";
import {
  generateStyleCoachFollowUp,
  generateStyleCoachOutlook,
} from "./style-coach";
import { generateSageCoachChat } from "./sage-chat";
import { generateSpotConditionsOutlook, formatDetailedConditionsReport } from "./spot-conditions";
import {
  formatFutureConditionsReport,
  parseForecastDayRequest,
} from "./future-forecast";
import { fetchSpotForecast } from "@/engines/conditions/forecast";
import {
  generateHourlySpotOutlook,
  generateRegionalAtTimeOutlook,
} from "./hourly-outlook";
import {
  isHourlyConditionsQuestion,
  isRegionalAtTimeQuestion,
  parseRegionFilter,
  parseSessionTimeRequest,
} from "./session-time";
import {
  isConditionsConnectionFollowUp,
  isDetailedConditionsRequest,
  isBoardDesignMenuRequest,
  isBoardDesignQuestion,
  isFollowUpQuestion,
  isFutureConditionsQuestion,
  isGearConversationContinuation,
  isRailDesignQuestion,
  isShaperDesignConversation,
  isSpotComparisonQuestion,
  isSpotConditionsQuestion,
  isSurfCoachingContext,
  isVolumeBoardFollowUp,
  lastAssistantMessage,
  shouldIncludeOutlook,
} from "./topic-guard";
import { formatVolumeBoardFollowUp } from "@/lib/sage-knowledge/volume";
import {
  buildSpotComparisonReport,
  parseSpotsForComparison,
} from "@/engines/coach/spot-comparison";

interface ProfileCoachInput {
  userMessage: string;
  conditions: SurfConditions;
  profile: UserProfile;
  regionalConditions?: SurfConditions[];
  coachPeriod?: CoachPeriod;
  conversationHistory?: ChatMessage[];
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
  return `Southern California rundown:

${lines.join("\n")}

Best bet today looks like ${best.spot.name} — ${best.summary}

Tap a beach in the Spots tab for a forecast.`;
}

function wantsStyleWithConditions(
  message: string,
  history?: ChatMessage[]
): boolean {
  if (/\b(style|my style)\b/i.test(message)) return true;

  if (isConditionsConnectionFollowUp(message, history)) {
    const last = lastAssistantMessage(history).toLowerCase();
    return /\bor your\b/.test(last) && /\bstyle\b/.test(last);
  }

  return false;
}

export async function generateProfileCoachResponse(
  input: ProfileCoachInput
): Promise<CoachResponse> {
  const sessionTime = parseSessionTimeRequest(input.userMessage);

  // Regional + clock/session time (e.g. "best in North County at 2pm")
  if (
    sessionTime &&
    isRegionalAtTimeQuestion(input.userMessage)
  ) {
    const filter = parseRegionFilter(input.userMessage) ?? "socal";
    const outlook = await generateRegionalAtTimeOutlook(
      filter,
      input.profile,
      sessionTime
    );
    return {
      message: outlook.message,
      conditions: outlook.conditions,
      source: outlook.source,
    };
  }

  // Spot / favorite hourly (e.g. "How will the surf be at 9am?")
  if (sessionTime && isHourlyConditionsQuestion(input.userMessage)) {
    const spot =
      matchSpotInMessage(input.userMessage) ??
      getSpotById(input.conditions.spot.id) ??
      input.conditions.spot;
    const outlook = await generateHourlySpotOutlook(
      spot,
      input.profile,
      sessionTime
    );
    return {
      message: outlook.message,
      conditions: outlook.conditions,
      source: outlook.source,
    };
  }

  if (isRegionalQuestion(input.userMessage) && input.regionalConditions?.length) {
    return {
      message: templateRegionalResponse(input.regionalConditions),
      conditions: input.conditions,
      source: "template",
    };
  }

  if (
    isBoardDesignMenuRequest(input.userMessage) ||
    isBoardDesignQuestion(input.userMessage) ||
    isRailDesignQuestion(input.userMessage) ||
    isShaperDesignConversation(input.userMessage, input.conversationHistory)
  ) {
    const chat = await generateSageCoachChat({
      userMessage: input.userMessage,
      conditions: input.conditions,
      profile: input.profile,
      regionalConditions: input.regionalConditions,
      coachPeriod: input.coachPeriod,
      conversationHistory: input.conversationHistory,
    });
    return {
      message: chat.message,
      conditions: input.conditions,
      source: chat.source,
    };
  }

  if (isVolumeBoardFollowUp(input.userMessage, input.conversationHistory)) {
    return {
      message: formatVolumeBoardFollowUp(
        input.profile,
        input.conditions,
        input.conversationHistory
      ),
      conditions: input.conditions,
      source: "template",
    };
  }

  if (
    isSpotComparisonQuestion(input.userMessage) &&
    input.regionalConditions?.length
  ) {
    const spots = parseSpotsForComparison(input.userMessage);
    const report = buildSpotComparisonReport(spots, input.regionalConditions);
    if (report) {
      return {
        message: report,
        conditions: input.conditions,
        source: "template",
      };
    }
  }

  const spotConditionsRequest =
    isSpotConditionsQuestion(input.userMessage) ||
    isConditionsConnectionFollowUp(
      input.userMessage,
      input.conversationHistory
    );

  if (spotConditionsRequest) {
    if (isFutureConditionsQuestion(input.userMessage)) {
      const dayRequest = parseForecastDayRequest(input.userMessage);
      if (dayRequest) {
        const mentioned =
          matchSpotInMessage(input.userMessage) ??
          getSpotById(input.conditions.spot.id) ??
          input.conditions.spot;
        try {
          const forecast = await fetchSpotForecast(mentioned);
          return {
            message: formatFutureConditionsReport(forecast, dayRequest),
            conditions: input.conditions,
            source: "template",
          };
        } catch {
          return {
            message: `I couldn't pull the multi-day forecast for ${mentioned.name} just now. Try again in a minute, or open the Spots tab and tap the pin for the 5-day view.`,
            conditions: input.conditions,
            source: "template",
          };
        }
      }
    }

    if (isDetailedConditionsRequest(input.userMessage)) {
      return {
        message: formatDetailedConditionsReport(input.conditions),
        conditions: input.conditions,
        source: "template",
      };
    }

    const outlook = await generateSpotConditionsOutlook(
      input.conditions,
      input.profile,
      input.coachPeriod ?? "morning",
      {
        includeStyle: wantsStyleWithConditions(
          input.userMessage,
          input.conversationHistory
        ),
      }
    );
    return {
      message: outlook.message,
      conditions: input.conditions,
      source: outlook.source,
    };
  }

  if (
    isFollowUpQuestion(input.userMessage, input.conversationHistory) &&
    isSurfCoachingContext(input.conversationHistory) &&
    !isGearConversationContinuation(input.userMessage, input.conversationHistory)
  ) {
    const followUp = await generateStyleCoachFollowUp({
      userMessage: input.userMessage,
      conditions: input.conditions,
      profile: input.profile,
      coachPeriod: input.coachPeriod ?? "morning",
      conversationHistory: input.conversationHistory,
    });
    return {
      message: followUp.message,
      conditions: input.conditions,
      source: followUp.source,
    };
  }

  const wantsOutlook =
    shouldIncludeOutlook(input.userMessage, input.conversationHistory) ||
    /\b(style|my style|how good)\b/i.test(input.userMessage);

  if (!wantsOutlook) {
    const chat = await generateSageCoachChat({
      userMessage: input.userMessage,
      conditions: input.conditions,
      profile: input.profile,
      regionalConditions: input.regionalConditions,
      coachPeriod: input.coachPeriod,
      conversationHistory: input.conversationHistory,
    });
    return {
      message: chat.message,
      conditions: input.conditions,
      source: chat.source,
    };
  }

  const outlook = await generateStyleCoachOutlook(
    input.conditions,
    input.profile,
    input.coachPeriod ?? "morning"
  );

  return {
    message: outlook.message,
    conditions: input.conditions,
    source: outlook.source,
  };
}
