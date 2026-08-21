export interface SpotKnowledge {
  id: string;
  name: string;
  aliases: string[];
  region: string;
  breakType: string;
  howItBreaks: string;
  bestSwellDirection: string;
  cleanWindDirection: string;
  tideNotes: string;
  localTips: string;
}

export type FitnessLevel = "low" | "average" | "high";

export interface VolumeRecommendation {
  recommendedLiters: number;
  rangeLiters: [number, number];
  explanation: string;
}
