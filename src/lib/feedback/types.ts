export type FeedbackType = "good" | "bad";

export type BadReason =
  | "incorrect_fact"
  | "repetitive"
  | "too_long"
  | "tone_problem";

export const BAD_REASON_LABELS: Record<BadReason, string> = {
  incorrect_fact: "Incorrect fact",
  repetitive: "Repetitive / redundant",
  too_long: "Too long / verbose",
  tone_problem: "Tone / wording problem",
};

export interface DeviceInfo {
  os: string;
  os_version: string;
  model: string;
}

export interface FeedbackRecord {
  feedback_id: string;
  user_token: string;
  message_id: string;
  spot_id: string | null;
  feedback_type: FeedbackType;
  bad_reasons: BadReason[];
  comment: string | null;
  timestamp_utc: string;
  app_version: string;
  device_info: DeviceInfo;
  context_snapshot: string;
  confidence_score: number | null;
  session_id: string;
  locale: string;
  cancelled?: boolean;
}

export interface FeedbackSubmitPayload {
  feedback_id: string;
  user_token: string;
  message_id: string;
  spot_id?: string | null;
  feedback_type: FeedbackType;
  bad_reasons?: BadReason[];
  comment?: string | null;
  timestamp_utc: string;
  app_version: string;
  device_info: DeviceInfo;
  context_snapshot: string;
  confidence_score?: number | null;
  session_id: string;
  locale: string;
}

export interface FeedbackSubmitResponse {
  status: "saved";
  feedback_id: string;
}

export interface FeedbackCancelResponse {
  status: "cancelled";
  feedback_id: string;
}

export type FeedbackVote = "good" | "bad" | null;

export interface MessageFeedbackState {
  vote: FeedbackVote;
  feedbackId: string | null;
  thanksMessage: string | null;
  showBadModal: boolean;
  undoDeadline: number | null;
}

export interface MessageMetrics {
  message_id: string;
  total_votes: number;
  good_count: number;
  bad_count: number;
  bad_reason_breakdown: Record<BadReason, number>;
  bad_ratio: number;
}

export interface ReviewQueueItem {
  message_id: string;
  flagged_at: string;
  reason: string;
  metrics: MessageMetrics;
}

export interface ReviewQueue {
  items: ReviewQueueItem[];
}
