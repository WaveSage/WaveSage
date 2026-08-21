import { getPacificNowParts } from "@/engines/conditions/pacific-time";

export type CoachPeriod = "morning" | "afternoon" | "evening";

export function getCoachPeriod(_date: Date = new Date()): CoachPeriod {
  const hour = getPacificNowParts().hour;

  if (hour >= 11 && hour < 16) return "afternoon";
  if (hour >= 16) return "evening";
  return "morning";
}
export function getCoachTitle(period: CoachPeriod = getCoachPeriod()): string {
  switch (period) {
    case "afternoon":
      return "Afternoon Sage";
    case "evening":
      return "Evening Sage";
    default:
      return "Morning Sage";
  }
}

export function getTimeRangeLabel(period: CoachPeriod): string {
  switch (period) {
    case "afternoon":
      return "11am–4pm";
    case "evening":
      return "4–7pm";
    default:
      return "6–9am";
  }
}

export function getCoachGreeting(period: CoachPeriod = getCoachPeriod()): string {
  switch (period) {
    case "afternoon":
      return "Good afternoon. Southern California conditions are live — pick a beach or ask where's best in SoCal right now.";
    case "evening":
      return "Good evening. Check today's conditions across SoCal — pick a beach or ask what setup would work for a sunset session.";
    default:
      return "Good morning. Southern California conditions load for this hour — ask about dawn patrol, 9am, afternoon, or where's best in North County at 2pm.";
  }
}

export function getConditionsOutlookLabel(
  period: CoachPeriod = getCoachPeriod()
): string {
  switch (period) {
    case "afternoon":
      return "Afternoon outlook";
    case "evening":
      return "Evening outlook";
    default:
      return "Morning outlook";
  }
}
