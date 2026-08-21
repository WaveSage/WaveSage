import type { FinSetup, FinSet } from "@/lib/types";

export interface FinProfile {
  pattern: RegExp;
  name: string;
  setup: FinSetup;
  size: string;
  template: FinSet["template"];
}

export const FIN_PROFILES: FinProfile[] = [
  {
    pattern: /\bmayhem\s*evil\s*quads?\b/i,
    name: "Mayhem Evil Quad",
    setup: "quad",
    size: "M",
    template: "pivot",
  },
  {
    pattern: /\bmayhem\s*(?:4\.0\s*)?quad\b/i,
    name: "Mayhem Quad",
    setup: "quad",
    size: "M",
    template: "performance",
  },
  {
    pattern: /\brasta\s*quads?\b/i,
    name: "Rasta Quad (Lost)",
    setup: "quad",
    size: "M",
    template: "pivot",
  },
  {
    pattern: /\bfutures?\s*am1\b/i,
    name: "Futures AM1 Thruster",
    setup: "thruster",
    size: "L",
    template: "drive",
  },
  {
    pattern: /\bfutures?\s*am2\b/i,
    name: "Futures AM2 Thruster",
    setup: "thruster",
    size: "M",
    template: "performance",
  },
  {
    pattern: /\bfutures?\s*am3\b/i,
    name: "Futures AM3 Thruster",
    setup: "thruster",
    size: "S",
    template: "pivot",
  },
  {
    pattern: /\bfcs?\s*(?:ii\s*)?performer\b/i,
    name: "FCS Performer Thruster",
    setup: "thruster",
    size: "M",
    template: "performance",
  },
  {
    pattern: /\bfcs?\s*carver\b/i,
    name: "FCS Carver Thruster",
    setup: "thruster",
    size: "M",
    template: "drive",
  },
  {
    pattern: /\bkeel\s*(?:twins?|fins?)?\b/i,
    name: "Keel Twin",
    setup: "twin",
    size: "L",
    template: "drive",
  },
  {
    pattern: /\bpivot\s*twins?\b/i,
    name: "Pivot Twin",
    setup: "twin",
    size: "M",
    template: "pivot",
  },
  {
    pattern: /\b(?:neutral|all-?around)\s*quad\b/i,
    name: "Neutral Quad",
    setup: "quad",
    size: "M",
    template: "neutral",
  },
  {
    pattern: /\b(?:performance\s+)?thrusters?\b/i,
    name: "Performance Thruster",
    setup: "thruster",
    size: "M",
    template: "performance",
  },
  {
    pattern: /\bquads?\b/i,
    name: "Pivot Quad",
    setup: "quad",
    size: "M",
    template: "pivot",
  },
  {
    pattern: /\btwin(?:\s*fin)?s?\b/i,
    name: "Twin Fin",
    setup: "twin",
    size: "M",
    template: "pivot",
  },
  {
    pattern: /\b2\+1\b/i,
    name: "2+1 Fin Set",
    setup: "2+1",
    size: "M",
    template: "neutral",
  },
  {
    pattern: /\bsingle(?:\s*fin)?\b/i,
    name: "Single Fin",
    setup: "single",
    size: "L",
    template: "drive",
  },
];

const SETUP_TEMPLATES: Record<
  FinSetup,
  { name: string; template: FinSet["template"]; size: string }
> = {
  thruster: { name: "Thruster set", template: "performance", size: "M" },
  quad: { name: "Quad set", template: "pivot", size: "M" },
  twin: { name: "Twin fin set", template: "pivot", size: "M" },
  "2+1": { name: "2+1 fin set", template: "neutral", size: "M" },
  single: { name: "Single fin", template: "drive", size: "L" },
};

let finIdCounter = 0;

function toFinSet(profile: FinProfile): FinSet {
  finIdCounter += 1;
  return {
    id: `parsed-fin-${finIdCounter}`,
    name: profile.name,
    setup: profile.setup,
    size: profile.size,
    template: profile.template,
  };
}

export function parseFinSetup(message: string): FinSetup | undefined {
  for (const profile of FIN_PROFILES) {
    if (profile.pattern.test(message)) return profile.setup;
  }
  return undefined;
}

export function parseFinFromSegment(segment: string): FinSet | null {
  for (const profile of FIN_PROFILES) {
    if (profile.pattern.test(segment)) return toFinSet(profile);
  }
  const setup = parseFinSetup(segment);
  if (!setup) return null;
  const meta = SETUP_TEMPLATES[setup];
  finIdCounter += 1;
  return {
    id: `parsed-fin-${finIdCounter}`,
    name: meta.name,
    setup,
    size: meta.size,
    template: meta.template,
  };
}

export function matchInventoryFin(
  segment: string,
  fins: FinSet[]
): FinSet | undefined {
  const lower = segment.toLowerCase();

  const byName = fins.find((fin) => {
    const name = fin.name.toLowerCase();
    return lower.includes(name) || name.split(/\s+/).every((w) => lower.includes(w));
  });
  if (byName) return byName;

  const tokens = lower.split(/\W+/).filter((t) => t.length > 2);
  return fins.find((fin) => {
    const finLower = fin.name.toLowerCase();
    return tokens.some((token) => finLower.includes(token));
  });
}

export function resolveFinFromSegment(
  segment: string,
  inventoryFins: FinSet[]
): FinSet | null {
  return matchInventoryFin(segment, inventoryFins) ?? parseFinFromSegment(segment);
}

function splitComparisonSegments(message: string): string[] {
  if (/\s+(?:vs\.?|versus|compared to)\s+/i.test(message)) {
    return message.split(/\s+(?:vs\.?|versus|compared to)\s+/i);
  }
  if (/\s+or\s+(?=(?:my\s+)?(?:quads?|thrusters?|twins?|fins?|rasta|keel|fcs|futures))/i.test(message)) {
    return message.split(/\s+or\s+/i);
  }
  return [message];
}

export function resolveFinsFromMessage(
  message: string,
  inventoryFins: FinSet[]
): FinSet[] {
  const segments = splitComparisonSegments(message);
  const resolved: FinSet[] = [];
  const seen = new Set<string>();

  for (const segment of segments) {
    const fin = resolveFinFromSegment(segment, inventoryFins);
    if (!fin) continue;
    const key = `${fin.setup}-${fin.template}-${fin.name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    resolved.push(fin);
  }

  if (resolved.length > 0) return resolved;

  const single = parseFinFromSegment(message);
  return single ? [single] : [];
}

export function isFinQuestion(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    /\bfin(?:s|ned)?\b/i.test(lower) ||
    /\b(?:thruster|quad|twin|keel|rasta|mayhem|fcs|futures|am[123])\b/i.test(lower) ||
    /\bvs\.?\b|\bversus\b/i.test(lower)
  );
}

export function isFinComparisonQuestion(message: string): boolean {
  if (!isFinQuestion(message)) return false;

  if (
    /\b(?:vs\.?|versus|compared to)\b/i.test(message) ||
    (/\bor\b/i.test(message) && resolveFinsFromMessage(message, []).length >= 2) ||
    /\bcompare\b/i.test(message)
  ) {
    return true;
  }

  return false;
}

export function defaultFinAlternatives(setup: FinSetup): FinSet[] {
  const alternatives: FinSetup[] =
    setup === "thruster"
      ? ["thruster", "quad"]
      : setup === "quad"
        ? ["quad", "thruster"]
        : setup === "twin"
          ? ["twin", "thruster"]
          : setup === "2+1"
            ? ["2+1", "single"]
            : [setup];

  return alternatives.map((alt, i) => {
    const meta = SETUP_TEMPLATES[alt];
    return {
      id: `default-fin-alt-${i}`,
      name: meta.name,
      setup: alt,
      size: meta.size,
      template: meta.template,
    };
  });
}
