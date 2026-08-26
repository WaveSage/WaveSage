export const WAVE_QUALITY = [
  { value: 1, label: "Poor" },
  { value: 2, label: "Below Average" },
  { value: 3, label: "Fair" },
  { value: 4, label: "Good" },
  { value: 5, label: "Excellent" },
] as const;

export const WAVE_SIZES = [
  "Knee High",
  "Waist High",
  "Chest to Shoulder",
  "Head+",
] as const;

export const SURFACE_CONDITIONS = ["Clean", "Textured", "Blown Out"] as const;

export const CROWD_LEVELS = ["Uncrowded", "Doable", "Crowded"] as const;

export const CONDITION_TAGS = [
  "Fun",
  "Closing Out",
  "Inconsistent",
  "Rip Current",
  "Longboardable",
] as const;

export type WaveQuality = (typeof WAVE_QUALITY)[number]["value"];
export type WaveSize = (typeof WAVE_SIZES)[number];
export type SurfaceCondition = (typeof SURFACE_CONDITIONS)[number];
export type CrowdLevel = (typeof CROWD_LEVELS)[number];
export type ConditionTag = (typeof CONDITION_TAGS)[number];

export interface StructuredReportDetails {
  waveQuality: WaveQuality;
  waveSize: WaveSize;
  surface: SurfaceCondition;
  crowd: CrowdLevel;
  tags: ConditionTag[];
}

export function qualityLabel(value: WaveQuality): string {
  return WAVE_QUALITY.find((item) => item.value === value)?.label ?? "Fair";
}

export function parseWaveQuality(raw: string): WaveQuality | null {
  const n = Number(raw);
  return n === 1 || n === 2 || n === 3 || n === 4 || n === 5 ? n : null;
}

export function parseWaveSize(raw: string): WaveSize | null {
  return (WAVE_SIZES as readonly string[]).includes(raw)
    ? (raw as WaveSize)
    : null;
}

export function parseSurface(raw: string): SurfaceCondition | null {
  return (SURFACE_CONDITIONS as readonly string[]).includes(raw)
    ? (raw as SurfaceCondition)
    : null;
}

export function parseCrowd(raw: string): CrowdLevel | null {
  return (CROWD_LEVELS as readonly string[]).includes(raw)
    ? (raw as CrowdLevel)
    : null;
}

export function parseTags(raw: string): ConditionTag[] {
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter((item): item is ConditionTag =>
      (CONDITION_TAGS as readonly string[]).includes(item)
    );
}

export function formatStructuredSummary(
  details: StructuredReportDetails,
  comment?: string
): string {
  const bits = [
    `${details.waveQuality}/5 ${qualityLabel(details.waveQuality)}`,
    details.waveSize,
    details.surface,
    details.crowd,
  ];
  if (details.tags.length) bits.push(details.tags.join(", "));
  const head = bits.join(" · ");
  const extra = comment?.trim();
  if (!extra) return head;
  return `${head}. ${extra}`.slice(0, 140);
}
