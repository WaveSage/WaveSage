import type { BoardType, FinSetup } from "@/lib/types";

export interface BoardModelTraits {
  speed: number;
  pivot: number;
  drive: number;
  paddle: number;
  hold: number;
  grovel: number;
  rail: number;
}

export interface BoardWaveRange {
  minFt: number;
  maxFt: number;
  idealMinFt: number;
  idealMaxFt: number;
}

export interface BoardModel {
  id: string;
  brand: string;
  shaper: string;
  model: string;
  label: string;
  aliases: string[];
  type: BoardType;
  finSetup: FinSetup;
  defaultLengthFt: number;
  volumeForLength: (lengthFt: number) => number;
  waveRange: BoardWaveRange;
  traits: BoardModelTraits;
  shaperNotes: string;
  feelSummary: string;
}
