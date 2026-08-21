import type { SurfConditions } from "@/lib/types";
import type { ChatMessage } from "@/lib/types";
import type { CoachPeriod } from "@/lib/coach-period";
import { getTimeRangeLabel } from "@/lib/coach-period";
import type { ExperienceLevel, StylePreference, UserProfile } from "@/lib/auth/types";
import {
  EXPERIENCE_LABELS,
  STYLE_LABELS,
} from "@/lib/auth/types";
import { SAGE_PERSONA, buildSageSystemPrompt } from "./sage-persona";
import { buildSageKnowledgeContext } from "@/lib/sage-knowledge";

export interface StyleCoachResult {
  style_fit_score: number;
  one_line_verdict: string;
  conditions_for_style: string;
  style_specific_feedback: string;
  recommended_board_from_quiver: string | null;
  risk_and_difficulty_notes: string;
  simple_explanation: string;
}

export interface StyleCoachContext {
  surf_style: string;
  spot_name: string;
  time_range: string;
  wave_height_ft: number;
  swell_period_sec: number;
  swell_direction: string;
  wind_speed: number;
  wind_direction: string;
  tide_height: string;
  tide_trend: string;
  wave_shape_notes: string;
  quality: string;
  swell_fit: string;
  crowd_level: string;
  user_skill_level: string;
  user_boards_list: string | null;
}

export const STYLE_COACH_SYSTEM_PROMPT = `${SAGE_PERSONA}

--------------------------------------------------

STYLE OUTLOOK TASK

USER STYLE (very important): {surf_style}

INPUT YOU RECEIVE:
- Location: {spot_name}
- Time range: {time_range} (e.g. "6–9am")
- Wave height: {wave_height_ft} ft
- Swell period: {swell_period_sec} sec
- Swell direction: {swell_direction}
- Wind speed: {wind_speed} and direction: {wind_direction}
- Tide: {tide_height} and tide trend: {tide_trend} (rising/falling)
- Wave shape / notes (if any): {wave_shape_notes}
- Surf quality rating: {quality} (poor / fair / good / epic — reflects power, wind, and swell fit)
- Swell fit at this spot: {swell_fit}
- Crowd level estimate (if any): {crowd_level}
- User skill level (if available): {user_skill_level}
- User boards (if available): {user_boards_list}

YOUR GOAL:
1. Interpret these conditions specifically for the chosen style.
2. Give the user a quick, honest feel for:
   - "How good is this for my style?"
   - "Why?"
   - "What should I ride and how should I approach the waves?"

RESPONSE FORMAT:
Always respond as a single JSON object with these fields:

{
  "style_fit_score": 0-10 number (how good today is for THIS style),
  "one_line_verdict": "Short punchy sentence about today for this style.",
  "conditions_for_style": "2-4 sentences describing how the conditions interact with this style. Mention wave size, power, steepness, wind, and tide in plain language.",
  "style_specific_feedback": "Direct, friendly advice addressed to the user's chosen style. Example: what sections to look for, what maneuvers will feel best, what to avoid.",
  "recommended_board_from_quiver": "If user_boards_list is provided, pick ONE board that best matches today for this style and explain briefly why. If none, use null.",
  "risk_and_difficulty_notes": "If conditions are challenging for this style or skill level, say why in simple terms. If not challenging, a brief reassuring note is fine.",
  "simple_explanation": "A 1-2 sentence explanation a beginner could understand about why this style either works great today or will feel off."
}

RULES:
- Make the style_fit_score reflect the STYLE, not "surfing in general".
- Match maneuvers to actual wave power. Do NOT recommend snaps, carves, vertical turns, or pocket surfing when quality is poor, swell fit is marginal/poor, period is short (<9s), or spot-adjusted height is under ~2.5 ft.
- If conditions are bad for this style, be honest but encouraging. Offer one practical tip to still have fun.
- Write JSON field values in Sage's coaching voice: clear, warm, and specific — always explain WHY.
- Return ONLY valid JSON, no markdown.`;

export function buildStyleCoachContext(
  conditions: SurfConditions,
  profile: Pick<UserProfile, "stylePreference" | "experienceLevel">,
  coachPeriod: CoachPeriod,
  userBoardsList?: string[] | null
): StyleCoachContext {
  const windDirection =
    conditions.windType !== "unknown"
      ? `${conditions.windType} ${conditions.windDirectionLabel}`
      : conditions.windDirectionLabel;

  return {
    surf_style: STYLE_LABELS[profile.stylePreference],
    spot_name: conditions.spot.name,
    time_range: getTimeRangeLabel(coachPeriod),
    wave_height_ft: conditions.waveHeightFt,
    swell_period_sec: conditions.wavePeriodSec,
    swell_direction: conditions.swellDirectionLabel,
    wind_speed: conditions.windSpeedMph,
    wind_direction: windDirection,
    tide_height: conditions.tide
      ? `${conditions.tide.heightFt} ft`
      : "unknown",
    tide_trend: conditions.tide?.trend ?? "unknown",
    wave_shape_notes: conditions.summary,
    quality: conditions.quality,
    swell_fit: conditions.spotTransform?.swellFit ?? "unknown",
    crowd_level: "not available",
    user_skill_level: EXPERIENCE_LABELS[profile.experienceLevel],
    user_boards_list: userBoardsList?.length
      ? userBoardsList.join(", ")
      : null,
  };
}

function fillPromptTemplate(
  template: string,
  context: StyleCoachContext
): string {
  return template
    .replaceAll("{surf_style}", context.surf_style)
    .replaceAll("{spot_name}", context.spot_name)
    .replaceAll("{time_range}", context.time_range)
    .replaceAll("{wave_height_ft}", String(context.wave_height_ft))
    .replaceAll("{swell_period_sec}", String(context.swell_period_sec))
    .replaceAll("{swell_direction}", context.swell_direction)
    .replaceAll("{wind_speed}", String(context.wind_speed))
    .replaceAll("{wind_direction}", context.wind_direction)
    .replaceAll("{tide_height}", context.tide_height)
    .replaceAll("{tide_trend}", context.tide_trend)
    .replaceAll("{wave_shape_notes}", context.wave_shape_notes)
    .replaceAll("{quality}", context.quality)
    .replaceAll("{swell_fit}", context.swell_fit)
    .replaceAll("{crowd_level}", context.crowd_level)
    .replaceAll("{user_skill_level}", context.user_skill_level)
    .replaceAll(
      "{user_boards_list}",
      context.user_boards_list ?? "none provided"
    );
}

/** Spot-adjusted height at the break — not the offshore model reading. */
function effectiveWaveHeightFt(conditions: SurfConditions): number {
  return conditions.waveHeightFt;
}

function effectivePeriodSec(conditions: SurfConditions): number {
  return Math.max(
    conditions.wavePeriodSec,
    conditions.swellPeriodSec ?? 0
  );
}

function isWeakSurf(conditions: SurfConditions): boolean {
  const h = effectiveWaveHeightFt(conditions);
  const period = effectivePeriodSec(conditions);
  const swellFit = conditions.spotTransform?.swellFit;

  // Fun-sized long-period days with a workable angle are not "weak."
  if (h >= 2.5 && period >= 12 && swellFit !== "poor") return false;
  if (h >= 3 && period >= 10 && (swellFit === "good" || swellFit === "excellent")) {
    return false;
  }

  if (swellFit === "poor" && (h < 3 || period < 10)) return true;
  if (h < 2) return true;
  if (period < 8) return true;

  if (conditions.quality === "poor") {
    return h < 2.5 || period < 10;
  }

  if (conditions.quality === "fair") {
    if (h < 2.5 && period < 10) return true;
    if (
      conditions.windType === "onshore" &&
      conditions.windSpeedMph > 10 &&
      h < 3
    ) {
      return true;
    }
  }

  if (swellFit === "marginal" && h < 2.5 && period < 10) return true;

  return false;
}

function waveBucket(conditions: SurfConditions): "heavy" | "fun" | "small" {
  if (isWeakSurf(conditions)) return "small";

  const h = effectiveWaveHeightFt(conditions);
  const period = effectivePeriodSec(conditions);
  const powerful =
    period >= 11 &&
    (conditions.quality === "good" || conditions.quality === "epic");

  if (h >= 5 || (h >= 4 && powerful)) return "heavy";
  if (h < 2.5 && period < 9) return "small";
  return "fun";
}

function templateStyleCoach(
  conditions: SurfConditions,
  style: StylePreference,
  skill: ExperienceLevel
): StyleCoachResult {
  const bucket = waveBucket(conditions);
  const windNote =
    conditions.windType === "onshore" && conditions.windSpeedMph > 8
      ? "Bumpy onshore wind will add chop."
      : conditions.windType === "offshore"
        ? "Offshore wind should help hold the face open."
        : "Wind is manageable for most approaches.";

  const tideNote = conditions.tide
    ? `Tide is ${conditions.tide.heightFt} ft and ${conditions.tide.trend}.`
    : "";

  const profiles: Record<
    StylePreference,
    Record<typeof bucket, Omit<StyleCoachResult, "recommended_board_from_quiver">>
  > = {
    cruise: {
      heavy: {
        style_fit_score: 4,
        one_line_verdict:
          "Powerful surf today — your log will feel fast but out of place in the pocket.",
        conditions_for_style: `${conditions.waveHeightFt} ft surf with ${conditions.swellPeriodSec}s period is steep and pushy for a cruise style. ${windNote} ${tideNote}`.trim(),
        style_specific_feedback:
          "Look for open shoulders and race down the line instead of hunting tight pockets. Take off early and set your line before it gets steep.",
        risk_and_difficulty_notes:
          skill === "beginner"
            ? "Late drops and duck dives will be tough — stay in mellower shoulders."
            : "Paddle out timing matters — wait for lulls and avoid the main impact zone.",
        simple_explanation:
          "Big, powerful waves want a smaller, more maneuverable board. A longboard is happiest when you can glide, not when you have to fit a steep drop.",
      },
      fun: {
        style_fit_score: 8,
        one_line_verdict: "Fun-sized surf — a great day to cruise and connect sections.",
        conditions_for_style: `${conditions.waveHeightFt} ft @ ${conditions.swellPeriodSec}s is in the sweet spot for gliding. ${windNote} ${tideNote}`.trim(),
        style_specific_feedback:
          "Catch waves early, trim high, and link the shoulder. Soft top turns and nose rides are on the menu if the tide cooperates.",
        risk_and_difficulty_notes:
          "Should feel comfortable for your skill level if you pick forgiving peaks.",
        simple_explanation:
          "Medium surf with enough push lets a longboard do what it does best — paddle early and glide.",
      },
      small: {
        style_fit_score: 9,
        one_line_verdict: "Small surf — your style owns days like this.",
        conditions_for_style: `Weak ${conditions.waveHeightFt} ft surf needs extra paddle power. ${windNote} ${tideNote}`.trim(),
        style_specific_feedback:
          "Sit a little deeper than shortboarders and catch anything that moves. Keep speed through flat sections with smooth trimming.",
        risk_and_difficulty_notes: "Low risk — focus on having fun and catching lots of waves.",
        simple_explanation:
          "When it's small, a longboard catches waves others miss. That's your advantage today.",
      },
    },
    trim: {
      heavy: {
        style_fit_score: 5,
        one_line_verdict:
          "Plenty of power — fast and fun on open faces, tricky in the critical stuff.",
        conditions_for_style: `Steep ${conditions.waveHeightFt} ft surf with ${conditions.swellPeriodSec}s period pushes a fish outline. ${windNote} ${tideNote}`.trim(),
        style_specific_feedback:
          "Hunt down-the-line speed on open faces. Avoid late drops on wide boards — set your line early and pump through flatter sections.",
        risk_and_difficulty_notes:
          "Wide nose and tail can feel sketchy on steep, hollow drops.",
        simple_explanation:
          "A fish loves speed on open walls but doesn't fit tight, steep pockets as well as a shortboard.",
      },
      fun: {
        style_fit_score: 8,
        one_line_verdict: "Fun-sized surf — trim and glide heaven.",
        conditions_for_style: `${conditions.waveHeightFt} ft surf with decent period is ideal fish territory. ${windNote} ${tideNote}`.trim(),
        style_specific_feedback:
          "Generate speed off the takeoff and stay high on the shoulder. Quick pumps and subtle carves beat trying to jam vertical turns.",
        risk_and_difficulty_notes: "A solid day for your style at your skill level.",
        simple_explanation:
          "Medium surf gives a fish enough push to get going without overpowering the board.",
      },
      small: {
        style_fit_score: 7,
        one_line_verdict: "Smaller surf — still workable if you find a pushy peak.",
        conditions_for_style: `Light ${conditions.waveHeightFt} ft surf can feel gutless for a fish. ${windNote} ${tideNote}`.trim(),
        style_specific_feedback:
          "Look for the best sandbar push and stay on the most energetic peaks. Keep your board moving — don't stall in weak sections.",
        risk_and_difficulty_notes:
          "You may need more effort to catch waves than on a bigger day.",
        simple_explanation:
          "A fish needs a little push to really shine. Find the spot with the most energy.",
      },
    },
    carving: {
      heavy: {
        style_fit_score: 9,
        one_line_verdict: "Powerful surf — your style is built for this.",
        conditions_for_style: `Steep, punchy ${conditions.waveHeightFt} ft surf @ ${conditions.swellPeriodSec}s suits performance lines. ${windNote} ${tideNote}`.trim(),
        style_specific_feedback:
          "Sit deeper, wait for the set waves, and attack the pocket. Vertical turns and late drops are on the table if you're warmed up.",
        risk_and_difficulty_notes:
          skill === "beginner"
            ? "Today's power may outpace beginner timing — start on smaller set waves."
            : "Respect hold-downs and give yourself a clean paddle path back out.",
        simple_explanation:
          "When waves are steep and powerful, a shortboard fits the pocket better than longer boards.",
      },
      fun: {
        style_fit_score: 7,
        one_line_verdict:
          "Fun-sized with some push — workable for carves when you find a steep peak.",
        conditions_for_style: `${conditions.waveHeightFt} ft with ${conditions.swellPeriodSec}s period and ${conditions.quality} quality offers enough energy for performance turns on the right bump. ${windNote} ${tideNote}`.trim(),
        style_specific_feedback:
          "Hunt the pushiest peaks and generate speed early. Carves and cutbacks work when the shoulder has shape — save vertical snaps for the rare steep section.",
        risk_and_difficulty_notes:
          "You'll work a bit harder to catch waves than on a fish or log.",
        simple_explanation:
          "Medium surf with decent power can still work for a shortboard if you pick your peaks.",
      },
      small: {
        style_fit_score: 4,
        one_line_verdict:
          "Weak surf today — not a snaps-and-carves day unless you find a rare pushy bump.",
        conditions_for_style: `${conditions.quality} quality, ${conditions.waveHeightFt} ft @ ${conditions.swellPeriodSec}s — gutless for performance shortboarding. ${conditions.spotTransform ? `Swell fit: ${conditions.spotTransform.swellFit}. ` : ""}${windNote} ${tideNote}`.trim(),
        style_specific_feedback:
          "Skip the vertical game today. Focus on speed generation, small cutbacks, and making the most of whatever push you can find — or grab a groveler / fish if you have one.",
        risk_and_difficulty_notes:
          "Expect frustration if you force pocket surfing in mush. A longer or wider board will feel more alive.",
        simple_explanation:
          "Shortboards need push for snaps and carves. Weak, small surf favors glide and trim over performance turns.",
      },
    },
  };

  const base = profiles[style][bucket];
  return {
    ...base,
    recommended_board_from_quiver: null,
  };
}

/** Sync template style fit — used for hourly / regional-at-time ranking. */
export function getTemplateStyleCoachResult(
  conditions: SurfConditions,
  profile: Pick<UserProfile, "stylePreference" | "experienceLevel">
): StyleCoachResult {
  return templateStyleCoach(
    conditions,
    profile.stylePreference,
    profile.experienceLevel
  );
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(10, Math.round(score)));
}

function parseStyleCoachJson(raw: string): StyleCoachResult | null {
  try {
    const parsed = JSON.parse(raw) as Partial<StyleCoachResult>;
    if (
      typeof parsed.one_line_verdict !== "string" ||
      typeof parsed.conditions_for_style !== "string"
    ) {
      return null;
    }
    return {
      style_fit_score: clampScore(Number(parsed.style_fit_score ?? 5)),
      one_line_verdict: parsed.one_line_verdict,
      conditions_for_style: parsed.conditions_for_style,
      style_specific_feedback: parsed.style_specific_feedback ?? "",
      recommended_board_from_quiver:
        parsed.recommended_board_from_quiver ?? null,
      risk_and_difficulty_notes: parsed.risk_and_difficulty_notes ?? "",
      simple_explanation: parsed.simple_explanation ?? "",
    };
  } catch {
    return null;
  }
}

export function formatStyleCoachMessage(result: StyleCoachResult): string {
  const lines = [
    result.one_line_verdict,
    "",
    `Style fit today: ${result.style_fit_score}/10`,
    "",
    result.conditions_for_style,
    "",
    result.style_specific_feedback,
  ];

  if (result.recommended_board_from_quiver) {
    lines.push("", `Board pick: ${result.recommended_board_from_quiver}`);
  }

  if (result.risk_and_difficulty_notes) {
    lines.push("", result.risk_and_difficulty_notes);
  }

  if (result.simple_explanation) {
    lines.push("", result.simple_explanation);
  }

  return lines.join("\n").trim();
}

export async function generateStyleCoachOutlook(
  conditions: SurfConditions,
  profile: Pick<UserProfile, "stylePreference" | "experienceLevel">,
  coachPeriod: CoachPeriod,
  userBoardsList?: string[] | null
): Promise<{ message: string; result: StyleCoachResult; source: "ai" | "template" }> {
  const context = buildStyleCoachContext(
    conditions,
    profile,
    coachPeriod,
    userBoardsList
  );
  const systemPrompt = fillPromptTemplate(STYLE_COACH_SYSTEM_PROMPT, context);
  const spotKnowledge = buildSageKnowledgeContext(context.spot_name, {
    activeSpotName: context.spot_name,
    experienceLevel: profile.experienceLevel,
    includeActiveSpot: true,
  });
  const fullSystemPrompt = spotKnowledge
    ? `${systemPrompt}\n\n${spotKnowledge}`
    : systemPrompt;
  const userPayload = JSON.stringify(context, null, 2);

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
            { role: "system", content: fullSystemPrompt },
            {
              role: "user",
              content: `Analyze today's surf for my style. Input:\n${userPayload}`,
            },
          ],
          temperature: 0.6,
          max_tokens: 700,
          response_format: { type: "json_object" },
        }),
      });

      if (response.ok) {
        const data = (await response.json()) as {
          choices?: { message?: { content?: string } }[];
        };
        const content = data.choices?.[0]?.message?.content;
        const parsed = content ? parseStyleCoachJson(content) : null;
        if (parsed) {
          return {
            message: formatStyleCoachMessage(parsed),
            result: parsed,
            source: "ai",
          };
        }
      }
    } catch {
      // fall through to template
    }
  }

  const result = templateStyleCoach(
    conditions,
    profile.stylePreference,
    profile.experienceLevel
  );
  return {
    message: formatStyleCoachMessage(result),
    result,
    source: "template",
  };
}

function lastAssistantMessage(history?: ChatMessage[]): string {
  if (!history?.length) return "";
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role === "assistant") return history[i].content;
  }
  return "";
}

function templateStyleCoachFollowUp(
  userMessage: string,
  history?: ChatMessage[]
): string {
  const prior = lastAssistantMessage(history);
  if (!prior) {
    return "Happy to go deeper — what part should I unpack? The score, the conditions, a technique tip, or how to approach today's waves?";
  }

  const lower = userMessage.toLowerCase();
  if (/\b(score|fit|\/10)\b/.test(lower)) {
    const scoreMatch = prior.match(/Style fit today:\s*(\d+)\/10/);
    if (scoreMatch) {
      return `That ${scoreMatch[1]}/10 is how well today's conditions match your riding style — not a grade on surf quality in general.

I weighed wave size, power, period, wind, and tide against what works best for how you like to surf. A 7 might mean fun waves that aren't perfect for your style; a 4 might still be surfable with the right approach.

Coaching tip: use the score to decide where to focus — catching waves, trimming, or hunting steeper sections. Which part of the outlook should I break down next?`;
    }
  }

  if (/\bpocket\b/.test(lower) || /\bloose\b/.test(lower)) {
    return `The pocket is the steepest, most powerful part of the wave — like the engine where most of the energy lives.

Staying loose means bent knees, relaxed shoulders, and centered weight so you can react as the wave shifts. Stiff bodies lose speed and timing, especially when the face moves quickly.

From my last note: ${prior.split("\n")[0]}. Try keeping your eyes up the line and your shoulders soft through the turn.

What part feels hardest — getting into the pocket or staying there?`;
  }

  if (/\bwhy\b/.test(lower) || /\bwhat do you mean\b/.test(lower) || /\bexplain\b/.test(lower)) {
    return `Here's the thinking behind my last note.

${prior.split("\n").filter(Boolean).slice(0, 4).join(" ")}

I connected today's conditions to how your style interacts with wave size, power, and wind — not just whether it's "good surf."

Tell me which piece you want unpacked: the conditions, the approach, or the style fit score.`;
  }

  return `Happy to go deeper on that. From my last note: "${prior.split("\n")[0]}"

What should I explain — the conditions, how to ride today, or a specific term?`;
}

interface StyleCoachFollowUpInput {
  userMessage: string;
  conditions: SurfConditions;
  profile: UserProfile;
  coachPeriod: CoachPeriod;
  conversationHistory?: ChatMessage[];
}

export async function generateStyleCoachFollowUp(
  input: StyleCoachFollowUpInput
): Promise<{ message: string; source: "ai" | "template" }> {
  const systemPrompt = buildSageSystemPrompt(
    input.profile,
    input.conditions,
    input.userMessage,
    input.coachPeriod
  );
  const apiKey = process.env.OPENAI_API_KEY;

  if (apiKey) {
    const baseUrl = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
    const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
    const historyMessages = (input.conversationHistory ?? [])
      .slice(-8)
      .map((message) => ({
        role: message.role as "user" | "assistant",
        content: message.content,
      }));

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
              content: `${systemPrompt}

The user is asking a follow-up about your prior coaching. Answer ONLY what they asked — do not repeat the full outlook.

When explaining a concept, use: definition → why it matters → when it applies → how to use it → tie to today's conditions → coaching tip.

Keep it under 200 words unless they asked for depth.`,
            },
            ...historyMessages,
            { role: "user", content: input.userMessage },
          ],
          temperature: 0.7,
          max_tokens: 400,
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

  return {
    message: templateStyleCoachFollowUp(
      input.userMessage,
      input.conversationHistory
    ),
    source: "template",
  };
}
