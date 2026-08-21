const PACIFIC_TZ = "America/Los_Angeles";

export function getPacificNowParts(): {
  dateKey: string;
  hour: number;
  minute: number;
} {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PACIFIC_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";

  return {
    dateKey: `${get("year")}-${get("month")}-${get("day")}`,
    hour: Number(get("hour")),
    minute: Number(get("minute")),
  };
}

/** NOAA predictions use local Pacific wall time: "2026-07-06 09:00". */
export function parseNoaaPacificTime(value: string): {
  dateKey: string;
  hour: number;
  minute: number;
} {
  const [datePart, timePart = "00:00"] = value.trim().split(/\s+/);
  const [hour, minute = "0"] = timePart.split(":");
  return {
    dateKey: datePart,
    hour: Number(hour),
    minute: Number(minute),
  };
}

export function pickNoaaHourIndex(times: string[]): number {
  if (!times.length) return 0;

  const now = getPacificNowParts();
  let bestIndex = 0;
  let bestDiff = Number.POSITIVE_INFINITY;

  for (let i = 0; i < times.length; i++) {
    const parsed = parseNoaaPacificTime(times[i]);
    if (parsed.dateKey !== now.dateKey) continue;

    const diffMinutes =
      Math.abs(parsed.hour - now.hour) * 60 +
      Math.abs(parsed.minute - now.minute);

    if (diffMinutes < bestDiff) {
      bestDiff = diffMinutes;
      bestIndex = i;
    }
  }

  return bestIndex;
}

/**
 * Index of the forecast hour closest to a Pacific dateKey + hour (0–23).
 */
export function pickPacificHourIndexAt(
  times: string[],
  dateKey: string,
  hour: number,
  minute = 0
): number {
  if (!times.length) return 0;

  let bestIndex = 0;
  let bestDiff = Number.POSITIVE_INFINITY;
  const targetMinutes = hour * 60 + minute;

  for (let i = 0; i < times.length; i++) {
    const raw = times[i];
    const pacific = raw.includes(" ")
      ? parseNoaaPacificTime(raw)
      : parseIsoPacific(raw);

    if (pacific.dateKey !== dateKey) continue;

    const diffMinutes = Math.abs(
      pacific.hour * 60 + pacific.minute - targetMinutes
    );

    if (diffMinutes < bestDiff) {
      bestDiff = diffMinutes;
      bestIndex = i;
    }
  }

  // If no same-day match, fall back to closest absolute timestamp.
  if (bestDiff === Number.POSITIVE_INFINITY) {
    return pickPacificHourIndex(times);
  }

  return bestIndex;
}

/**
 * Index of the forecast hour closest to now in Pacific time.
 * Works with Open-Meteo ISO strings (with or without offset).
 */
export function pickPacificHourIndex(times: string[]): number {
  const now = getPacificNowParts();
  return pickPacificHourIndexAt(times, now.dateKey, now.hour, now.minute);
}

function parseIsoPacific(iso: string): {
  dateKey: string;
  hour: number;
  minute: number;
} {
  const date = new Date(iso);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PACIFIC_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";

  return {
    dateKey: `${get("year")}-${get("month")}-${get("day")}`,
    hour: Number(get("hour")),
    minute: Number(get("minute")),
  };
}
