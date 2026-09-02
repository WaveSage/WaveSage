import type { DailyForecastDay, SpotForecast, SurfSpot } from "@/lib/types";
import { getPacificNowParts } from "@/engines/conditions/pacific-time";
import { findSpotKnowledge, findSpotKnowledgeByCatalogId } from "@/lib/sage-knowledge";

export type ForecastDayRequest =
  | { kind: "tomorrow"; label: string }
  | { kind: "day_after_tomorrow"; label: string }
  | { kind: "offset"; days: number; label: string }
  | { kind: "weekday"; weekday: number; label: string }
  | { kind: "weekend"; label: string };

const WEEKDAY_NAMES = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function formatDateKey(year: number, month: number, day: number): string {
  const m = String(month).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

function parseDateKey(dateKey: string): { y: number; m: number; d: number } {
  const [y, m, d] = dateKey.split("-").map(Number);
  return { y, m, d };
}

export function pacificDateKeyPlusDays(days: number): string {
  const { dateKey } = getPacificNowParts();
  const { y, m, d } = parseDateKey(dateKey);
  const date = new Date(y, m - 1, d + days);
  return formatDateKey(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

function nextWeekdayDateKey(targetWeekday: number): string {
  const { dateKey } = getPacificNowParts();
  const { y, m, d } = parseDateKey(dateKey);
  const current = new Date(y, m - 1, d);
  const delta = (targetWeekday - current.getDay() + 7) % 7;
  current.setDate(current.getDate() + delta);
  return formatDateKey(
    current.getFullYear(),
    current.getMonth() + 1,
    current.getDate()
  );
}

function friendlyDateLabel(dateKey: string): string {
  const { y, m, d } = parseDateKey(dateKey);
  const date = new Date(y, m - 1, d);
  const month = date.toLocaleString("en-US", { month: "short" });
  return `${WEEKDAY_SHORT[date.getDay()]} ${month} ${d}`;
}

/**
 * Parse relative / named day references for forecast questions.
 * Returns null when the message is about current / today conditions.
 */
export function parseForecastDayRequest(
  message: string
): ForecastDayRequest | null {
  const lower = message.toLowerCase();

  if (/\btoday\b/.test(lower) && !/\btomorrow\b/.test(lower)) {
    return null;
  }

  if (/\bday after tomorrow\b/.test(lower)) {
    return { kind: "day_after_tomorrow", label: "the day after tomorrow" };
  }
  if (/\btomorrow\b/.test(lower)) {
    return { kind: "tomorrow", label: "tomorrow" };
  }
  if (/\bthis weekend\b|\bover the weekend\b|\bweekend\b/.test(lower)) {
    return { kind: "weekend", label: "this weekend" };
  }

  const inDays = lower.match(/\bin\s+(\d+)\s+days?\b/);
  if (inDays) {
    const days = Number(inDays[1]);
    if (days >= 1 && days <= 7) {
      return {
        kind: "offset",
        days,
        label: days === 1 ? "tomorrow" : `in ${days} days`,
      };
    }
  }

  for (let i = 0; i < WEEKDAY_NAMES.length; i++) {
    const name = WEEKDAY_NAMES[i];
    if (new RegExp(`\\b${name}\\b`).test(lower)) {
      return {
        kind: "weekday",
        weekday: i,
        label: name.charAt(0).toUpperCase() + name.slice(1),
      };
    }
  }

  return null;
}

export function resolveForecastDateKeys(
  request: ForecastDayRequest
): string[] {
  switch (request.kind) {
    case "tomorrow":
      return [pacificDateKeyPlusDays(1)];
    case "day_after_tomorrow":
      return [pacificDateKeyPlusDays(2)];
    case "offset":
      return [pacificDateKeyPlusDays(request.days)];
    case "weekday":
      return [nextWeekdayDateKey(request.weekday)];
    case "weekend": {
      const sat = nextWeekdayDateKey(6);
      const sun = nextWeekdayDateKey(0);
      // If today is Sunday, nextWeekdayDateKey(0) is today — still useful.
      // Prefer upcoming Sat then Sun in chronological order.
      return sat <= sun ? [sat, sun] : [sun, sat];
    }
  }
}

function windPhrase(period: {
  windType: DailyForecastDay["windType"];
  windDirectionLabel: string;
  windSpeedMph: number;
}): string {
  if (period.windSpeedMph < 8) return "calm wind";
  const type = period.windType !== "unknown" ? `${period.windType} ` : "";
  return `${type}${period.windDirectionLabel} ${period.windSpeedMph} mph`;
}

function qualityTone(quality: DailyForecastDay["quality"]): string {
  switch (quality) {
    case "epic":
      return "looking excellent";
    case "good":
      return "looking solid";
    case "fair":
      return "looking workable";
    default:
      return "looking weak";
  }
}

function formatPeriodLine(period: NonNullable<DailyForecastDay["periods"]>[number]): string {
  const tide =
    period.tideHeightFt != null
      ? ` · tide ${period.tideHeightFt} ft ${period.tideTrend ?? ""}`.trimEnd()
      : "";
  return `${period.label}: ~${period.waveHeightFt} ft @ ${period.wavePeriodSec}s · ${period.swellDirectionLabel} · ${windPhrase(period)}${tide} — ${period.quality}`;
}

function formatOneDay(
  spot: SurfSpot,
  day: DailyForecastDay,
  dayLabel: string
): string {
  const knowledge =
    findSpotKnowledge(spot.name) ?? findSpotKnowledgeByCatalogId(spot.id);

  const lines = [
    `${spot.name} ${dayLabel} (${friendlyDateLabel(day.date)}) — morning / afternoon / evening:`,
    "",
  ];

  if (day.periods?.length) {
    for (const period of day.periods) {
      lines.push(formatPeriodLine(period));
    }
  } else {
    lines.push(
      `~${day.waveHeightFt} ft @ ${day.wavePeriodSec}s · ${day.swellDirectionLabel} swell @ ${day.swellPeriodSec}s · ${windPhrase(day)}.`,
      `Overall: ${day.quality} — ${qualityTone(day.quality)} for a session.`
    );
  }

  if (day.swellFit) {
    lines.push(`Swell fit at this break (afternoon): ${day.swellFit}.`);
  }

  if (knowledge) {
    lines.push(
      "",
      `Best swell for this spot: ${knowledge.bestSwellDirection.split(".")[0]}. Cleanest wind: ${knowledge.cleanWindDirection.split(".")[0]}.`
    );
  }

  lines.push(
    "",
    "Conditions shift with tide and wind through the day — morning glass often differs from the afternoon seabreeze.",
    "",
    "Want today's live check, or another day in the 5-day window?"
  );

  return lines.join("\n").trim();
}

export function formatFutureConditionsReport(
  forecast: SpotForecast,
  request: ForecastDayRequest
): string {
  const dateKeys = resolveForecastDateKeys(request);
  const matched = dateKeys
    .map((key) => forecast.days.find((d) => d.date === key))
    .filter((d): d is DailyForecastDay => Boolean(d));

  if (!matched.length) {
    const available = forecast.days
      .map((d) => `${d.label} ${friendlyDateLabel(d.date)}`)
      .join(", ");
    return `I don't have a solid forecast day locked for ${request.label} at ${forecast.spot.name} yet. Here's what I do have in the 5-day window: ${available || "nothing loaded"}. Ask again for one of those days.`;
  }

  if (request.kind === "weekend" && matched.length >= 2) {
    const [a, b] = matched;
    const summarize = (day: DailyForecastDay) => {
      if (day.periods?.length) {
        return day.periods
          .map(
            (p) =>
              `${p.label.toLowerCase()} ${p.quality} (~${p.waveHeightFt} ft)`
          )
          .join(", ");
      }
      return `~${day.waveHeightFt} ft @ ${day.wavePeriodSec}s, ${day.swellDirectionLabel} swell, ${windPhrase(day)} — ${day.quality}`;
    };
    return [
      `${forecast.spot.name} this weekend — morning / afternoon / evening outlook:`,
      "",
      `Saturday (${friendlyDateLabel(a.date)}): ${summarize(a)}.`,
      `Sunday (${friendlyDateLabel(b.date)}): ${summarize(b)}.`,
      "",
      `Better day on paper: ${a.quality === "poor" && b.quality !== "poor" ? "Sunday" : b.quality === "poor" && a.quality !== "poor" ? "Saturday" : a.waveHeightFt >= b.waveHeightFt ? "Saturday" : "Sunday"}.`,
      "",
      "Tide and wind still flip sessions — compare the morning glass vs afternoon seabreeze before you commit.",
    ].join("\n");
  }

  const day = matched[0];
  return formatOneDay(forecast.spot, day, request.label);
}
