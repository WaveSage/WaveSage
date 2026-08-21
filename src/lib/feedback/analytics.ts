import type { BadReason, FeedbackRecord, MessageMetrics } from "./types";

const ALL_BAD_REASONS: BadReason[] = [
  "incorrect_fact",
  "repetitive",
  "too_long",
  "tone_problem",
];

function emptyBreakdown(): Record<BadReason, number> {
  return {
    incorrect_fact: 0,
    repetitive: 0,
    too_long: 0,
    tone_problem: 0,
  };
}

/**
 * Aggregate per-message feedback metrics for admin / analytics use.
 * Stub for future dashboard — no UI wired yet.
 */
export function aggregateMessageMetrics(
  records: FeedbackRecord[],
  messageId: string
): MessageMetrics {
  const forMessage = records.filter(
    (r) => r.message_id === messageId && !r.cancelled
  );

  const good_count = forMessage.filter((r) => r.feedback_type === "good").length;
  const bad_count = forMessage.filter((r) => r.feedback_type === "bad").length;
  const total_votes = good_count + bad_count;

  const bad_reason_breakdown = emptyBreakdown();
  for (const record of forMessage) {
    if (record.feedback_type !== "bad") continue;
    for (const reason of record.bad_reasons) {
      if (reason in bad_reason_breakdown) {
        bad_reason_breakdown[reason as BadReason] += 1;
      }
    }
  }

  return {
    message_id: messageId,
    total_votes,
    good_count,
    bad_count,
    bad_reason_breakdown,
    bad_ratio: total_votes > 0 ? bad_count / total_votes : 0,
  };
}

export function aggregateAllMessages(
  records: FeedbackRecord[]
): MessageMetrics[] {
  const messageIds = new Set(
    records.filter((r) => !r.cancelled).map((r) => r.message_id)
  );
  return [...messageIds].map((id) => aggregateMessageMetrics(records, id));
}

export function topBadReasons(
  metrics: MessageMetrics
): { reason: BadReason; count: number }[] {
  return ALL_BAD_REASONS.map((reason) => ({
    reason,
    count: metrics.bad_reason_breakdown[reason],
  }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count);
}
