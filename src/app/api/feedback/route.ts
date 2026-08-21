import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { hashMessageContent } from "@/lib/feedback/hash";
import { runModerationCheck } from "@/lib/feedback/moderation";
import {
  checkRateLimit,
  releaseRateLimitSlot,
} from "@/lib/feedback/rate-limit";
import {
  cancelFeedback,
  listActiveFeedback,
  saveFeedback,
} from "@/lib/feedback/storage";
import type {
  BadReason,
  FeedbackRecord,
  FeedbackSubmitPayload,
} from "@/lib/feedback/types";

const APP_VERSION = process.env.npm_package_version ?? "0.1.0";

const VALID_BAD_REASONS = new Set<BadReason>([
  "incorrect_fact",
  "repetitive",
  "too_long",
  "tone_problem",
]);

function parseBadReasons(value: unknown): BadReason[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is BadReason =>
      typeof item === "string" && VALID_BAD_REASONS.has(item as BadReason)
  );
}

function sanitizeComment(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, 250);
  return trimmed.length > 0 ? trimmed : null;
}

export async function POST(request: Request) {
  let body: FeedbackSubmitPayload;
  try {
    body = (await request.json()) as FeedbackSubmitPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const {
    feedback_id,
    user_token,
    message_id,
    feedback_type,
    timestamp_utc,
    context_snapshot,
    session_id,
    locale,
    device_info,
  } = body;

  if (
    !feedback_id ||
    !user_token ||
    !message_id ||
    !feedback_type ||
    !timestamp_utc ||
    !context_snapshot ||
    !session_id
  ) {
    return NextResponse.json(
      { error: "Missing required fields." },
      { status: 400 }
    );
  }

  if (feedback_type !== "good" && feedback_type !== "bad") {
    return NextResponse.json(
      { error: "Invalid feedback_type." },
      { status: 400 }
    );
  }

  const sessionUserId = await getSessionUserId();
  const effectiveToken = sessionUserId ?? user_token;

  const rate = checkRateLimit(effectiveToken);
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded.",
        retry_after_ms: rate.retryAfterMs,
      },
      { status: 429 }
    );
  }

  const record: FeedbackRecord = {
    feedback_id,
    user_token: effectiveToken,
    message_id,
    spot_id: body.spot_id ?? null,
    feedback_type,
    bad_reasons:
      feedback_type === "bad" ? parseBadReasons(body.bad_reasons) : [],
    comment: feedback_type === "bad" ? sanitizeComment(body.comment) : null,
    timestamp_utc,
    app_version: body.app_version ?? APP_VERSION,
    device_info: device_info ?? { os: "unknown", os_version: "", model: "" },
    context_snapshot,
    confidence_score:
      typeof body.confidence_score === "number" ? body.confidence_score : null,
    session_id,
    locale: locale ?? "en-US",
  };

  await saveFeedback(record);

  const allRecords = await listActiveFeedback();
  await runModerationCheck(allRecords, message_id);

  return NextResponse.json({
    status: "saved",
    feedback_id,
  });
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const feedbackId =
    url.searchParams.get("feedback_id") ?? url.searchParams.get("feedbackId");
  const userToken = url.searchParams.get("user_token");

  if (!feedbackId || !userToken) {
    return NextResponse.json(
      { error: "feedback_id and user_token required." },
      { status: 400 }
    );
  }

  const sessionUserId = await getSessionUserId();
  const effectiveToken = sessionUserId ?? userToken;

  const rate = checkRateLimit(effectiveToken);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded.", retry_after_ms: rate.retryAfterMs },
      { status: 429 }
    );
  }

  const cancelled = await cancelFeedback(feedbackId, effectiveToken);
  if (!cancelled) {
    releaseRateLimitSlot(effectiveToken);
    return NextResponse.json(
      { error: "Cannot cancel feedback." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    status: "cancelled",
    feedback_id: feedbackId,
  });
}

/** Re-export hash for server-side validation if needed */
export { hashMessageContent };
