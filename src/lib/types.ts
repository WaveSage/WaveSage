export type SkillLevel = "beginner" | "intermediate" | "advanced";

export type BoardType =
  | "shortboard"
  | "fish"
  | "groveler"
  | "midlength"
  | "hybrid"
  | "funboard"
  | "longboard"
  | "gun"
  | "softboard";

export type FinSetup = "single" | "twin" | "thruster" | "quad" | "2+1";

export type WindType = "offshore" | "onshore" | "cross-shore" | "unknown";

export type TideTrend = "rising" | "falling" | "high" | "low";

export type SwellFit = "excellent" | "good" | "marginal" | "poor";

export type BreakType = "beach" | "reef" | "point" | "jetty";

export interface SpotTransform {
  modelWaveHeightFt: number;
  modelSwellHeightFt: number;
  swellFit: SwellFit;
  swellFitScore: number;
  breakType: BreakType;
  note: string;
}

export interface SurfSpot {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  /** Compass bearing the beach faces, toward the ocean (e.g. 270 = west-facing). */
  shoreBearingDeg?: number;
  region?: string;
  aliases?: string[];
}

export interface TideInfo {
  heightFt: number;
  trend: TideTrend;
  stationName: string;
  stationDistanceKm: number;
}

export interface Surfboard {
  id: string;
  name: string;
  type: BoardType;
  lengthFt: number;
  widthIn?: number;
  thicknessIn?: number;
  volumeL: number;
  finSetup: FinSetup;
  /** Links to shaper-spec board model in the catalog. */
  modelId?: string;
  shaper?: string;
  notes?: string;
}

export interface FinSet {
  id: string;
  name: string;
  setup: FinSetup;
  size: string;
  template: "performance" | "neutral" | "drive" | "pivot";
  notes?: string;
}

export interface BoardBuild {
  id: string;
  name: string;
  boardId: string;
  finId: string;
  notes?: string;
}

export interface Inventory {
  boards: Surfboard[];
  fins: FinSet[];
  builds: BoardBuild[];
  skillLevel: SkillLevel;
  defaultSpot?: SurfSpot;
}

export interface SurfConditions {
  spot: SurfSpot;
  fetchedAt: string;
  waveHeightFt: number;
  wavePeriodSec: number;
  waveDirectionDeg: number;
  windSpeedMph: number;
  windDirectionDeg: number;
  windDirectionLabel: string;
  windType: WindType;
  swellHeightFt: number;
  swellPeriodSec: number;
  swellDirectionDeg: number;
  swellDirectionLabel: string;
  tide: TideInfo | null;
  summary: string;
  quality: "poor" | "fair" | "good" | "epic";
  /** Spot-specific adjustment from model forecast to break-aware surf. */
  spotTransform?: SpotTransform;
}

export interface EquipmentRecommendation {
  board: Surfboard;
  finSet?: FinSet;
  score: number;
  fit: "ideal" | "good" | "workable" | "stretch";
  tradeoffs: string[];
  howItWouldFeel: string;
}

/** Structured style outlook for the Surf Engine UI (not just chat text). */
export interface StyleOutlook {
  style_fit_score: number;
  one_line_verdict: string;
  conditions_for_style: string;
  style_specific_feedback: string;
  recommended_board_from_quiver: string | null;
  risk_and_difficulty_notes: string;
  simple_explanation: string;
}

export interface HourlySurfPoint {
  hour: number;
  minute: number;
  label: string;
  dateKey: string;
  waveHeightFt: number;
  wavePeriodSec: number;
  windSpeedMph: number;
  windDirectionLabel: string;
  windType: WindType;
  swellHeightFt: number;
  swellPeriodSec: number;
  swellDirectionLabel: string;
  swellDirectionDeg: number;
  tideHeightFt: number | null;
  tideTrend: TideTrend | null;
  quality: SurfConditions["quality"];
  styleFitScore: number;
}

export interface CoachResponse {
  message: string;
  conditions?: SurfConditions;
  styleOutlook?: StyleOutlook;
  recommendations?: EquipmentRecommendation[];
  source: "ai" | "template";
}

export interface ChatMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
}

export interface RegionalForecast {
  region: string;
  fetchedAt: string;
  conditions: SurfConditions[];
}

export interface DailyForecastDay {
  date: string;
  label: string;
  waveHeightFt: number;
  wavePeriodSec: number;
  swellHeightFt: number;
  swellPeriodSec: number;
  swellDirectionLabel: string;
  windSpeedMph: number;
  windDirectionLabel: string;
  windType: WindType;
  quality: SurfConditions["quality"];
  swellFit?: SwellFit;
}

export interface SpotForecast {
  spot: SurfSpot;
  fetchedAt: string;
  days: DailyForecastDay[];
}
