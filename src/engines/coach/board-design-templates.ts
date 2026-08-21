import type { SurfConditions } from "@/lib/types";

export type TailShape = "squash" | "round" | "swallow" | "pin" | "square";

export type BoardType =
  | "longboard"
  | "shortboard"
  | "fish"
  | "groveler"
  | "hybrid"
  | "midlength";

const TAIL_SHAPES: TailShape[] = ["squash", "round", "swallow", "pin", "square"];

const TAIL_DESCRIPTIONS: Record<TailShape, string> = {
  squash:
    "Wider, flatter end with rounded corners — more surface area for lift, quick speed, and snappy pivots in average to good surf. The everyday shortboard default.",
  round:
    "Continuous curve with less tail area — more grip, smoother rail-to-rail transitions, and hold in steeper, cleaner, or barreling waves where you control speed instead of generating it.",
  swallow:
    "Wide tail with a V cut (fish tail) — lots of planing area plus a defined release point. Fast down the line, great drive in mush, popular on twins, fish, and grovelers.",
  pin:
    "Narrow, pointed tail — maximum hold and direction in hollow, powerful surf. Less release for snaps; built for speed control on open faces and barrels.",
  square:
    "Abrupt, flat tail edge — skaty, quick release, and fast direction changes in small, weak, or peaky surf. Can feel loose when waves get steep.",
};

const PAIR_SYNTHESIS: Partial<Record<string, string>> = {
  "squash|swallow": `Both tails add width and speed, but they release differently. Squash keeps more outline through the corners for everyday shortboard snap and lip release. Swallow's V cut gives fish-style drive and a sharper exit — usually better when you want glide and trim in softer surf rather than vertical shortboard surfing.`,
  "squash|round": `Squash generates lift and immediate speed in softer, average waves; round tail sits lower with more edge hold for steeper, cleaner surf. Squash for snappy daily drivers; round when the wave has power and you want drawn-out arcs.`,
  "squash|pin": `Squash is the versatile planing tail for everyday performance; pin tail narrows the outline for hold in hollow, powerful waves. Squash if you want release and pivot; pin if the wave demands commitment and control at speed.`,
  "squash|square": `Both favor speed in weaker surf, but squash is smoother and more predictable while square is abrupt and skaty. Squash for all-around shortboards; square when you want maximum release in small, peaky beach breaks.`,
  "round|swallow": `Round tail grips and controls in powerful surf; swallow tail planes and drives in mush. Round for step-ups and clean faces; swallow for fish, twins, and groveling small waves.`,
  "round|pin": `Both emphasize hold, but round tail still allows smooth, flowing turns while pin tail is built for maximum hold in hollow surf. Round for performance in good waves; pin for barrels and heavy faces.`,
  "swallow|pin": `Opposite ends of the spectrum — swallow for width, speed, and fish-style glide; pin for narrow hold in hollow surf. Swallow in small-to-medium mush; pin when the wave is steep and hollow.`,
  "swallow|square": `Both work in small surf, but swallow spreads width with a V for drive on fish and hybrids while square gives a hard, skaty release on short grovelers. Swallow for trim and glide; square for quick pivots.`,
  "pin|square": `Pin tail holds in power; square tail releases in small surf. Pin for hollow waves; square for weak, peaky beach breaks.`,
};

const TAIL_ON_BOARD: Partial<Record<string, string>> = {
  "swallow|longboard": `A swallow tail adds bite and release on a longboard — it keeps tail area for speed while the V cut creates two winged tips that let the tail break free for quicker turns than a full parallel outline.

When to use:
- Small–medium, weaker waves where you want maintained speed plus quicker turning.
- Longboards aiming for playful trim-and-turn riding rather than pure noseriding focus.

Trade-off: you give up some locked-in trim and noseride stability versus a round or square tail log.`,
  "squash|longboard": `A squash tail on a longboard widens the tail for planing speed and stability in small surf while keeping enough release for cutbacks. It is less common than round or square tails on logs, but works on performance longboards and mid-lengths when you want shortboard-style snaps on a longer board.

When to use: soft, average waves where you want paddle power plus pivot off the tail.`,
  "round|longboard": `A round tail on a longboard smooths turns and adds hold on clean, lined-up faces — classic for noseriding and drawn-out trim. The continuous curve keeps the tail engaged without abrupt release.

When to use: point breaks, mellow peelers, and noseride-focused logs.`,
  "swallow|fish": `Swallow tail is the defining fish tail — wide planing surface with a V cut for drive and release. On a fish it pairs with a wide outline and twin fins for speed through flat sections and loose, skatey turns.

When to use: small to medium mush, groveling, and fast trim-and-turn sessions.`,
  "squash|shortboard": `Squash tail is the default performance shortboard tail — width for lift, rounded corners for predictable release off the lip. Versatile from average beach breaks to good overhead surf.

When to use: everyday shortboarding when you want a balance of drive, hold, and snap.`,
  "round|shortboard": `Round tail on a shortboard reduces tail area for more edge hold and smoother arcs in powerful, clean surf. You trade a bit of flat-section speed for control in steeper faces.

When to use: hollow reefs, good point breaks, and step-up conditions.`,
  "pin|shortboard": `Pin tail narrows the outline for maximum hold in hollow, fast surf. Common on guns and step-ups; less release for vertical surfing.

When to use: barrels, heavy reef, and when control at speed matters more than generating speed.`,
};

function pairKey(a: string, b: string): string {
  return [a, b].sort().join("|");
}

export function parseBoardTypeInMessage(message: string): BoardType | null {
  const lower = message.toLowerCase();
  if (/\b(longboard|longboards)\b/.test(lower) || /\bon a log\b/.test(lower)) {
    return "longboard";
  }
  if (/\b(shortboard|shortboards|short board)\b/.test(lower)) return "shortboard";
  if (/\bfish\b/.test(lower)) return "fish";
  if (/\bgroveler\b/.test(lower)) return "groveler";
  if (/\b(hybrid|funboard|fun board)\b/.test(lower)) return "hybrid";
  if (/\b(mid-?length|midlength)\b/.test(lower)) return "midlength";
  return null;
}

export function isTailShapeQuestion(message: string): boolean {
  const shapes = parseTailShapesInMessage(message);
  if (shapes.length !== 1) return false;

  const lower = message.toLowerCase();
  const mentionsTail = /\b(tail|tails)\b/.test(lower) || shapes.length === 1;

  if (!mentionsTail) return false;

  return (
    /\b(how does|how do|what is|explain|work|works|when to use|why use|why would)\b/.test(
      lower
    ) || parseBoardTypeInMessage(message) !== null
  );
}

export function parseTailShapesInMessage(message: string): TailShape[] {
  const lower = message.toLowerCase();
  const found: TailShape[] = [];

  if (/\b(?:squash(?:\s+tail)?|squash-tails?)\b/.test(lower)) found.push("squash");
  if (/\b(?:round(?:\s+tail)?|round-tails?)\b/.test(lower)) found.push("round");
  if (/\b(?:swallow(?:\s+tail)?|fish(?:\s+tail)?|swallow-tails?)\b/.test(lower)) {
    found.push("swallow");
  }
  if (/\b(?:pin(?:\s+tail)?|pin-tails?)\b/.test(lower)) found.push("pin");
  if (/\b(?:square(?:\s+tail)?|square-tails?)\b/.test(lower)) found.push("square");

  return [...new Set(found)];
}

export function isTailComparisonQuestion(message: string): boolean {
  const shapes = parseTailShapesInMessage(message);
  if (shapes.length < 2) return false;
  const lower = message.toLowerCase();
  if (!/\b(tail|tails)\b/.test(lower)) return false;
  return (
    /\b(vs|versus|compares?|compared|difference|different|how does|how do)\b/.test(
      lower
    ) || shapes.length >= 2
  );
}

function capitalize(shape: TailShape): string {
  return shape.charAt(0).toUpperCase() + shape.slice(1);
}

export function formatTailComparison(
  shapes: [TailShape, TailShape],
  conditions: SurfConditions
): string {
  const [a, b] = shapes;
  const synthesis =
    PAIR_SYNTHESIS[pairKey(a, b)] ??
    `${capitalize(a)} and ${capitalize(b)} tails change how much water the outline holds at the back of the board — that affects speed, release, and how the board finishes turns.`;

  return `${capitalize(a)} tail vs ${capitalize(b)} tail:

${capitalize(a)}: ${TAIL_DESCRIPTIONS[a]}

${capitalize(b)}: ${TAIL_DESCRIPTIONS[b]}

${synthesis}

Want to tie this to today's ${conditions.waveHeightFt} ft surf, or compare another shape?`;
}

export function formatTailOnBoardAnswer(
  message: string,
  conditions: SurfConditions
): string | null {
  if (!isTailShapeQuestion(message)) return null;

  const shapes = parseTailShapesInMessage(message);
  if (shapes.length !== 1) return null;

  const tail = shapes[0];
  const boardType = parseBoardTypeInMessage(message);
  const boardLabel = boardType ?? "board";

  if (boardType) {
    const specific = TAIL_ON_BOARD[`${tail}|${boardType}`];
    if (specific) {
      return `${specific}

Want fin setup notes for a ${tail}-tail ${boardType}, or the full build spec?`;
    }
  }

  return `${capitalize(tail)} tail on a ${boardLabel}: ${TAIL_DESCRIPTIONS[tail]}

When to use: match tail width and release to your wave — wider tails (squash, swallow) for speed in softer surf; round and pin for hold in cleaner, steeper faces.

Want me to tie this to a specific board type or today's ${conditions.waveHeightFt} ft surf?`;
}

export function templateBoardDesignAnswer(
  message: string,
  conditions: SurfConditions
): string | null {
  const lower = message.toLowerCase();

  const tailOnBoard = formatTailOnBoardAnswer(message, conditions);
  if (tailOnBoard) return tailOnBoard;

  if (isTailComparisonQuestion(message)) {
    const shapes = parseTailShapesInMessage(message);
    if (shapes.length >= 2) {
      return formatTailComparison([shapes[0], shapes[1]], conditions);
    }
  }

  if (
    /\b(full|soft|hard|down)\b/.test(lower) &&
    /\b(rail|rails)\b/.test(lower) &&
    /\b(vs|versus|compare|difference|compared)\b/.test(lower)
  ) {
    return `Soft/full rails engage gradually — forgiving, stable, and good for trim and small waves. Hard/down rails bite sooner in the face for sharper turns in punchy or steep surf.

Quick read: soft rails for cruise and grovel; hard rails when you want the board to lock in and carve.

Want build notes for rail bevel percentages, or how this fits today's ${conditions.waveHeightFt} ft surf?`;
  }

  if (
    /\b(flat|single|double|v-concave|v concave|concave)\b/.test(lower) &&
    /\b(vs|versus|compare|difference|compared|bottom)\b/.test(lower)
  ) {
    return `Bottom contour changes how water flows under the board. Flat is predictable and stable. Single concave adds lift and speed. Double concave channels water out the tail for release through turns. V in the tail eases rail-to-rail transitions — common on fish and step-ups.

Tell me your wave type (mush, punchy beach break, reef) and I'll recommend a contour plus fin setup.

Want the full build spec?`;
  }

  if (
    /\b(rocker)\b/.test(lower) &&
    /\b(vs|versus|compare|difference|compared|more|less)\b/.test(lower)
  ) {
    return `More rocker loosens the board for steep drops and tight pockets but slows paddling and glide. Less rocker planes earlier and runs faster down the line — great for small, weak surf but easier to pearl on late drops.

Typical starting point: moderate nose rocker for paddle safety, moderate tail rocker for release — adjust based on wave power.

Want nose/mid/tail numbers for a specific board length?`;
  }

  return null;
}

export function templateBoardDesignFallback(
  message: string,
  conditions: SurfConditions
): string {
  return `Good board design question. I can walk through tail shapes, rails, rocker, bottom contours, volume, and fin setups — and how each interacts with wave type and board style.

Tell me the board type (longboard, fish, shortboard), the wave you surf most, and what feel you're chasing (speed, hold, noseride, snap).

Want the full build spec, or tie this to today's ${conditions.waveHeightFt} ft surf?`;
}

export { TAIL_SHAPES, TAIL_DESCRIPTIONS };
