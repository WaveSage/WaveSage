import type { BoardModel, BoardModelTraits, BoardWaveRange } from "./types";
import type { BoardType, FinSetup } from "@/lib/types";

type ModelInput = {
  id: string;
  brand: string;
  shaper: string;
  model: string;
  aliases?: string[];
  type: BoardType;
  finSetup: FinSetup;
  defaultLengthFt: number;
  volumeBase: number;
  volumePerFt: number;
  waveRange: BoardWaveRange;
  traits: BoardModelTraits;
  shaperNotes: string;
  feelSummary: string;
};

export const WAVE = {
  tiny: { minFt: 1, maxFt: 3.5, idealMinFt: 1, idealMaxFt: 2.5 },
  grovel: { minFt: 1, maxFt: 4, idealMinFt: 1.5, idealMaxFt: 3.5 },
  smallMed: { minFt: 2, maxFt: 5, idealMinFt: 2.5, idealMaxFt: 4.5 },
  daily: { minFt: 2, maxFt: 5.5, idealMinFt: 3, idealMaxFt: 5 },
  performance: { minFt: 3, maxFt: 7, idealMinFt: 4, idealMaxFt: 6 },
  stepUp: { minFt: 4, maxFt: 8, idealMinFt: 5, idealMaxFt: 7 },
  big: { minFt: 6, maxFt: 12, idealMinFt: 8, idealMaxFt: 10 },
} as const satisfies Record<string, BoardWaveRange>;

export const T = {
  grovelFish: {
    speed: 8,
    pivot: 8,
    drive: 5,
    paddle: 9,
    hold: 3,
    grovel: 10,
    rail: 4,
  },
  grovelHybrid: {
    speed: 9,
    pivot: 8,
    drive: 6,
    paddle: 8,
    hold: 4,
    grovel: 9,
    rail: 5,
  },
  dailyHybrid: {
    speed: 8,
    pivot: 7,
    drive: 7,
    paddle: 8,
    hold: 5,
    grovel: 7,
    rail: 6,
  },
  perfFish: {
    speed: 8,
    pivot: 8,
    drive: 6,
    paddle: 7,
    hold: 5,
    grovel: 8,
    rail: 6,
  },
  hpShort: {
    speed: 7,
    pivot: 8,
    drive: 8,
    paddle: 5,
    hold: 8,
    grovel: 3,
    rail: 9,
  },
  driveShort: {
    speed: 7,
    pivot: 7,
    drive: 9,
    paddle: 6,
    hold: 9,
    grovel: 3,
    rail: 9,
  },
  stepUp: {
    speed: 6,
    pivot: 6,
    drive: 9,
    paddle: 6,
    hold: 10,
    grovel: 2,
    rail: 8,
  },
  fun: {
    speed: 6,
    pivot: 6,
    drive: 6,
    paddle: 9,
    hold: 5,
    grovel: 7,
    rail: 5,
  },
} as const satisfies Record<string, BoardModelTraits>;

function vol(base: number, perFt: number) {
  return (len: number) => Math.round((base + perFt * len) * 10) / 10;
}

export function defineModel(input: ModelInput): BoardModel {
  const label = `${input.brand} ${input.model}`;
  const brandLower = input.brand.toLowerCase();
  const modelLower = input.model.toLowerCase();
  const aliases = [
    modelLower,
    `${brandLower} ${modelLower}`,
    label.toLowerCase(),
    ...(input.aliases ?? []),
  ];

  return {
    id: input.id,
    brand: input.brand,
    shaper: input.shaper,
    model: input.model,
    label,
    aliases: [...new Set(aliases)],
    type: input.type,
    finSetup: input.finSetup,
    defaultLengthFt: input.defaultLengthFt,
    volumeForLength: vol(input.volumeBase, input.volumePerFt),
    waveRange: input.waveRange,
    traits: input.traits,
    shaperNotes: input.shaperNotes,
    feelSummary: input.feelSummary,
  };
}
