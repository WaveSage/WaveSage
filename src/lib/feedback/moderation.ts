import { promises as fs } from "fs";
import path from "path";
import { aggregateMessageMetrics } from "./analytics";
import type { BadReason, FeedbackRecord, ReviewQueue, ReviewQueueItem } from "./types";
import { dataPath } from "@/lib/data-root";

const DATA_DIR = dataPath("feedback");
const REVIEW_QUEUE_FILE = path.join(DATA_DIR, "review-queue.json");

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

async function readReviewQueue(): Promise<ReviewQueue> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = await fs.readFile(REVIEW_QUEUE_FILE, "utf-8");
    const parsed = JSON.parse(raw) as ReviewQueue;
    if (!Array.isArray(parsed.items)) return { items: [] };
    return parsed;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return { items: [] };
    throw error;
  }
}

async function saveReviewQueue(queue: ReviewQueue): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const temp = `${REVIEW_QUEUE_FILE}.tmp`;
  await fs.writeFile(temp, JSON.stringify(queue, null, 2), "utf-8");
  await fs.rename(temp, REVIEW_QUEUE_FILE);
}

function recentBadVotes(
  records: FeedbackRecord[],
  messageId: string,
  now: number
): number {
  return records.filter((r) => {
    if (r.cancelled) return false;
    if (r.message_id !== messageId) return false;
    if (r.feedback_type !== "bad") return false;
    const ts = Date.parse(r.timestamp_utc);
    return Number.isFinite(ts) && now - ts <= TWENTY_FOUR_HOURS_MS;
  }).length;
}

function hasIncorrectFactFlag(record: FeedbackRecord): boolean {
  return (
    record.feedback_type === "bad" &&
    !record.cancelled &&
    record.bad_reasons.includes("incorrect_fact" as BadReason)
  );
}

/**
 * Lightweight moderation hooks — flags messages for human review.
 * Not a full RLHF pipeline; writes to review-queue.json for admin follow-up.
 */
export async function evaluateModeration(
  records: FeedbackRecord[],
  messageId: string
): Promise<ReviewQueueItem | null> {
  const now = Date.now();
  const active = records.filter((r) => !r.cancelled);
  const metrics = aggregateMessageMetrics(active, messageId);

  const latestBad = active
    .filter((r) => r.message_id === messageId && r.feedback_type === "bad")
    .sort(
      (a, b) =>
        Date.parse(b.timestamp_utc) - Date.parse(a.timestamp_utc)
    )[0];

  const reasons: string[] = [];

  if (latestBad && hasIncorrectFactFlag(latestBad)) {
    reasons.push("incorrect_fact reported");
  }

  const bad24h = recentBadVotes(active, messageId, now);
  if (bad24h >= 5) {
    reasons.push(`${bad24h} bad votes in 24h`);
  }

  if (metrics.total_votes >= 10 && metrics.bad_ratio >= 0.3) {
    reasons.push(
      `bad_ratio ${(metrics.bad_ratio * 100).toFixed(0)}% (${metrics.bad_count}/${metrics.total_votes})`
    );
  }

  if (reasons.length === 0) return null;

  return {
    message_id: messageId,
    flagged_at: new Date().toISOString(),
    reason: reasons.join("; "),
    metrics,
  };
}

export async function upsertReviewQueueItem(
  item: ReviewQueueItem
): Promise<void> {
  const queue = await readReviewQueue();
  const idx = queue.items.findIndex((i) => i.message_id === item.message_id);
  if (idx >= 0) {
    queue.items[idx] = item;
  } else {
    queue.items.push(item);
  }
  await saveReviewQueue(queue);
}

export async function runModerationCheck(
  records: FeedbackRecord[],
  messageId: string
): Promise<void> {
  const item = await evaluateModeration(records, messageId);
  if (item) {
    await upsertReviewQueueItem(item);
  }
}
