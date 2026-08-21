/**
 * Index of the forecast hour closest to the current time,
 * or a specific Pacific hour when provided.
 */
import {
  pickPacificHourIndex,
  pickPacificHourIndexAt,
} from "./pacific-time";

export function pickCurrentHourIndex(times: string[]): number {
  return pickPacificHourIndex(times);
}

export function pickHourIndex(
  times: string[],
  target?: { dateKey: string; hour: number; minute?: number }
): number {
  if (!target) return pickPacificHourIndex(times);
  return pickPacificHourIndexAt(
    times,
    target.dateKey,
    target.hour,
    target.minute ?? 0
  );
}
