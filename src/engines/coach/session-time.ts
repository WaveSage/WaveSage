import type { CoachPeriod } from "@/lib/coach-period";
import { getPacificNowParts } from "@/engines/conditions/pacific-time";
import {
  parseForecastDayRequest,
  resolveForecastDateKeys,
} from "./future-forecast";

export type SessionTimeRequest = {
  /** Pacific hour 0–23 */
  hour: number;
  minute: number;
  /** Human label e.g. "9am", "dawn patrol", "afternoon" */
  label: string;
  /** e.g. "tomorrow", "Saturday" — empty when the ask is for today */
  dayLabel: string;
  dateKey: string;
  coachPeriod: CoachPeriod;
};

export type RegionFilter = "north-county" | "orange-county" | "socal";

function hourToCoachPeriod(hour: number): CoachPeriod {
  if (hour >= 11 && hour < 16) return "afternoon";
  if (hour >= 16) return "evening";
  return "morning";
}

function formatClockLabel(hour: number, minute = 0): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const suffix = hour < 12 ? "am" : "pm";
  if (minute === 0) return `${h12}${suffix}`;
  return `${h12}:${String(minute).padStart(2, "0")}${suffix}`;
}

function resolveSessionDay(message: string): {
  dateKey: string;
  dayLabel: string;
} {
  const today = getPacificNowParts().dateKey;
  const dayRequest = parseForecastDayRequest(message);
  if (!dayRequest) {
    return { dateKey: today, dayLabel: "" };
  }

  const keys = resolveForecastDateKeys(dayRequest);
  const dateKey = keys[0] ?? today;
  if (dateKey === today) {
    return { dateKey: today, dayLabel: "" };
  }

  const dayLabel =
    dayRequest.kind === "weekend" ? "Saturday" : dayRequest.label;
  return { dateKey, dayLabel };
}

function buildSession(
  hour: number,
  minute: number,
  label: string,
  day: { dateKey: string; dayLabel: string }
): SessionTimeRequest {
  return {
    hour,
    minute,
    label,
    dayLabel: day.dayLabel,
    dateKey: day.dateKey,
    coachPeriod: hourToCoachPeriod(hour),
  };
}

/** Display label e.g. "dawn patrol tomorrow", "9am". */
export function formatSessionWhenLabel(session: SessionTimeRequest): string {
  return session.dayLabel
    ? `${session.label} ${session.dayLabel}`
    : session.label;
}

/**
 * Parse dawn patrol / late morning / afternoon / evening / "9am" / "2:30 pm".
 * Pairs with tomorrow / weekday / weekend when present (e.g. dawn patrol tomorrow → 6am tomorrow).
 * Day-only asks without a session time stay on the multi-day midday forecast path.
 */
export function parseSessionTimeRequest(
  message: string
): SessionTimeRequest | null {
  const lower = message.toLowerCase();
  const day = resolveSessionDay(message);

  // Explicit clock time wins.
  const clock = lower.match(
    /\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)\b/i
  );
  if (clock) {
    let hour = Number(clock[1]);
    const minute = clock[2] ? Number(clock[2]) : 0;
    const meridiem = clock[3].replace(/\./g, "").toLowerCase();
    if (hour === 12) hour = meridiem.startsWith("a") ? 0 : 12;
    else if (meridiem.startsWith("p")) hour += 12;
    if (hour < 0 || hour > 23 || minute > 59) return null;
    return buildSession(hour, minute, formatClockLabel(hour, minute), day);
  }

  // 24h style "at 14:00" / "at 14"
  const h24 = lower.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\b/);
  if (h24 && !/\b(am|pm)\b/.test(lower)) {
    const hour = Number(h24[1]);
    const minute = h24[2] ? Number(h24[2]) : 0;
    if (hour >= 0 && hour <= 23 && minute <= 59) {
      return buildSession(hour, minute, formatClockLabel(hour, minute), day);
    }
  }

  const named: { pattern: RegExp; hour: number; label: string }[] = [
    { pattern: /\bdawn\s*patrol\b|\bat\s+dawn\b|\bdawn\b/, hour: 6, label: "dawn patrol" },
    { pattern: /\bearly\s+morning\b/, hour: 7, label: "early morning" },
    { pattern: /\blate\s+morning\b/, hour: 10, label: "late morning" },
    { pattern: /\bmid[-\s]?morning\b/, hour: 9, label: "mid-morning" },
    { pattern: /\bmorning\s+session\b|\bthis\s+morning\b/, hour: 8, label: "morning" },
    { pattern: /\blunch\s*time\b|\bmidday\b|\bnoon\b/, hour: 12, label: "midday" },
    { pattern: /\bearly\s+afternoon\b/, hour: 13, label: "early afternoon" },
    { pattern: /\blate\s+afternoon\b/, hour: 15, label: "late afternoon" },
    { pattern: /\bafternoon\b/, hour: 14, label: "afternoon" },
    { pattern: /\bsunset\b|\bevening\s+session\b|\bthis\s+evening\b|\bevening\b/, hour: 17, label: "evening" },
  ];

  for (const entry of named) {
    if (entry.pattern.test(lower)) {
      return buildSession(entry.hour, 0, entry.label, day);
    }
  }

  return null;
}

export function isHourlyConditionsQuestion(message: string): boolean {
  const session = parseSessionTimeRequest(message);
  if (!session) return false;

  const lower = message.toLowerCase();
  return (
    /\b(surf|waves?|swell|wind|tide|condition|conditions|forecast|outlook|session)\b/.test(
      lower
    ) ||
    /\bhow\b/.test(lower) ||
    /\bwhat(?:'s| is| are)\b/.test(lower) ||
    /\bat\s+\d/.test(lower) ||
    /\bdawn\b/.test(lower)
  );
}

export function parseRegionFilter(message: string): RegionFilter | null {
  const lower = message.toLowerCase();
  if (
    /\bnorth\s*county\b/.test(lower) ||
    /\bnorth\s+san\s+diego\b/.test(lower) ||
    /\bnsd\b/.test(lower)
  ) {
    return "north-county";
  }
  if (
    /\borange\s*county\b/.test(lower) ||
    /\b\boc\b/.test(lower)
  ) {
    return "orange-county";
  }
  if (
    /\bsocal\b/.test(lower) ||
    /\bsouthern\s+california\b/.test(lower) ||
    /\bwhere(?:'s| is) (?:the )?best\b/.test(lower)
  ) {
    return "socal";
  }
  return null;
}

export function isRegionalAtTimeQuestion(message: string): boolean {
  const session = parseSessionTimeRequest(message);
  if (!session) return false;
  const region = parseRegionFilter(message);
  if (!region) return false;
  return (
    /\b(best|where|which|compare)\b/i.test(message) ||
    /\bsurf\b/i.test(message)
  );
}
