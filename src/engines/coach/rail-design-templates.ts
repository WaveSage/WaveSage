import type { SurfConditions } from "@/lib/types";
import type { UserProfile } from "@/lib/auth/types";
import { STYLE_LABELS } from "@/lib/auth/types";
import { parseWeightFromMessage } from "@/lib/sage-knowledge";

export function templateRailDesignAnswer(
  message: string,
  conditions: SurfConditions,
  profile: UserProfile
): string {
  const lower = message.toLowerCase();
  const weight = parseWeightFromMessage(message);
  const styleLabel = STYLE_LABELS[profile.stylePreference].toLowerCase();

  if (/\bhooky\b/.test(lower) || (/\bhook\b/.test(lower) && /\bturn/.test(lower))) {
    return `Summary: Soften the tail rail by ~1–2 mm or add a small bevel on the tail edge.

Why:
- A sharp tail rail catches abruptly in the face — feels hooky mid-turn.
- A 1 mm bevel or slightly rounder edge lets the board release without losing all hold.

Tuning tip: Change one thing at a time and test on 5–10 similar waves. Log whether hold, release, or speed improved.

What's your board length and tail shape? I can suggest exact taper zones.`;
  }

  if (
    /\b(50\/50|60\/40|70\/30)\b/.test(lower) ||
    (/\b(full|soft|hard|down)\b/.test(lower) &&
      /\b(vs|versus|compare|difference|or)\b/.test(lower))
  ) {
    return `Summary: 50/50 for trim and noseride, 60/40 for all-around bite, 70/30 for performance — pick based on wave power and how hard you want the board to engage.

50/50: Equal roundness — stable, forgiving, best for noseride and mellow trim.
60/40: Slightly harder bottom edge — earlier bite without feeling locked in; great daily-driver blend.
70/30: Harder bottom, softer deck — sharp engagement for critical turns; common on performance shortboards.

For your ${styleLabel} style in ${conditions.waveHeightFt} ft surf today: ${profile.stylePreference === "cruise" ? "lean 50/50 to 60/40 for stability." : profile.stylePreference === "trim" ? "60/40 mid with slightly fuller tail rails keeps speed in softer sections." : "60/40 transitioning to 70/30 in the last 20 cm of tail for carve and release."}

Want shaper notes with mm targets for your board?`;
  }

  if (/\bnoseride\b/.test(lower) || /\btrim\b/.test(lower)) {
    return `Summary: Fuller 50/50 rails through the nose and mid — taper the tail so you can still pivot off the back foot.

Why:
- Full nose/mid rails add planing area and stability for time on the nose.
- A tapered tail keeps the board from feeling stuck when you step back.

Build note: 50/50 for roughly the front two-thirds; transition to 60/40 or softer taper in the last 20–25 cm before the tail.

What length log or mid-length are you on?`;
  }

  if (/\bperformance\b/.test(lower) || /\bshortboard\b/.test(lower)) {
    const weightNote = weight
      ? weight < 154
        ? " At your weight, you can run a slightly sharper tail edge."
        : weight > 198
          ? " At your weight, keep a touch more rail volume mid-board for paddle."
          : ""
      : "";
    return `Summary: 60/40 midrail shifting to 70/30 and a thinner tail edge over the last 18–22 cm.${weightNote}

Why:
- Harder bottom rails bite sooner for pocket turns and carves.
- Thin tail edge reduces drag and helps release off the lip.

Build notes: Target tail edge ~1.5–2.0 mm; start 60/40→70/30 transition ~25 cm forward of tail; ±1 mm tolerance.

Tuning: If it feels loose, harden tail 0.5–1 mm or add fin hold. If hooky, add a 1 mm bevel.

Want this as a CAD-ready spec for a 6'0" or your actual dims?`;
  }

  if (/\btype|types\b/.test(lower) || /\bwhat are\b/.test(lower) || /\bexplain\b/.test(lower)) {
    return `Summary: Rails are the board's edge — they decide when the board bites, releases, and how stable it feels in trim.

Main types:
- 50/50 — forgiving, noseride and cruise.
- 60/40 — all-around bite; most versatile.
- 70/30 — performance engagement; sharper turns.
- Soft/full — mellow, small surf, longboards.
- Hard/down — steep waves, carving, barrels.
- Beveled — tuning tool for smoother release.

For your ${styleLabel} style: ${profile.stylePreference === "cruise" ? "start with fuller 50/50 to 60/40 rails." : profile.stylePreference === "trim" ? "60/40 mid with a bit of tail release works well." : "60/40 → 70/30 into a thinner tail edge for pocket surfing."}

Today's ${conditions.waveHeightFt} ft surf at ${conditions.spot.name}: ${conditions.quality} — ${conditions.waveHeightFt <= 2.5 ? "softer rails or a touch more volume in the rail line help in weaker surf." : "you can run sharper tail rails when the wave has push."}

Which rail topic do you want next — comparison, a hooky-turn fix, or shaper measurements?`;
  }

  return `Summary: Match rail sharpness to wave power — fuller and softer for mush, harder and thinner at the tail for performance and hollow surf.

Quick guide:
- Noseride / trim → 50/50, fuller nose and mid.
- Cruise / small surf → soft to 60/40, +1–2 mm volume in the rail.
- Performance → 60/40 → 70/30, thin tail edge (last 18–22 cm).
- Hollow → pin/hard tail, tapered nose.

For ${styleLabel} surfing in ${conditions.waveHeightFt} ft ${conditions.quality} conditions, I'd start with 60/40 mid transitioning sharper in the tail unless you're on a log.

What board are you on, and does it feel too sticky or too loose in turns?`;
}
