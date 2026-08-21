"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  BadReason,
  FeedbackSubmitPayload,
  FeedbackVote,
} from "@/lib/feedback/types";

const APP_VERSION = "0.1.0";
const UNDO_WINDOW_MS = 5_000;
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;
const QUEUE_KEY = "wavesage-feedback-queue";
const ANON_TOKEN_KEY = "wavesage-feedback-token";
const SESSION_KEY = "wavesage-feedback-session";

const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_PATTERN =
  /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;

export function scrubPii(text: string): string {
  return text.replace(EMAIL_PATTERN, "[email]").replace(PHONE_PATTERN, "[phone]");
}

function createId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `fb-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function getAnonymousToken(): string {
  if (typeof localStorage === "undefined") return "anon-session";
  let token = localStorage.getItem(ANON_TOKEN_KEY);
  if (!token) {
    token = createId();
    localStorage.setItem(ANON_TOKEN_KEY, token);
  }
  return token;
}

function getSessionId(): string {
  if (typeof sessionStorage === "undefined") return createId();
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = createId();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

function parseUserAgent(): {
  os: string;
  os_version: string;
  model: string;
} {
  if (typeof navigator === "undefined") {
    return { os: "unknown", os_version: "", model: "" };
  }
  const ua = navigator.userAgent;
  let os = "unknown";
  let os_version = "";

  if (/Windows NT ([\d.]+)/.test(ua)) {
    os = "Windows";
    os_version = RegExp.$1;
  } else if (/Mac OS X ([\d_]+)/.test(ua)) {
    os = "macOS";
    os_version = RegExp.$1.replace(/_/g, ".");
  } else if (/Android ([\d.]+)/.test(ua)) {
    os = "Android";
    os_version = RegExp.$1;
  } else if (/iPhone OS ([\d_]+)/.test(ua)) {
    os = "iOS";
    os_version = RegExp.$1.replace(/_/g, ".");
  } else if (/Linux/.test(ua)) {
    os = "Linux";
  }

  return { os, os_version, model: ua.slice(0, 120) };
}

async function hashContent(content: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const data = new TextEncoder().encode(content);
    const hash = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  return `fallback-${content.length}`;
}

interface QueuedFeedback {
  payload: FeedbackSubmitPayload;
  method: "POST" | "DELETE";
  deleteParams?: { feedback_id: string; user_token: string };
}

function readQueue(): QueuedFeedback[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as QueuedFeedback[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedFeedback[]): void {
  if (typeof localStorage === "undefined") return;
  if (queue.length === 0) {
    localStorage.removeItem(QUEUE_KEY);
  } else {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }
}

async function flushQueue(): Promise<void> {
  const queue = readQueue();
  if (queue.length === 0) return;

  const remaining: QueuedFeedback[] = [];

  for (const item of queue) {
    try {
      if (item.method === "POST") {
        const res = await fetch("/api/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item.payload),
        });
        if (!res.ok && res.status !== 429) {
          remaining.push(item);
        }
      } else if (item.deleteParams) {
        const params = new URLSearchParams(item.deleteParams);
        const res = await fetch(`/api/feedback?${params}`, { method: "DELETE" });
        if (!res.ok && res.status !== 429) {
          remaining.push(item);
        }
      }
    } catch {
      remaining.push(item);
    }
  }

  writeQueue(remaining);
}

export interface UseMessageFeedbackOptions {
  messageId: string;
  messageContent: string;
  spotId?: string | null;
  userId?: string | null;
  confidenceScore?: number | null;
}

export interface UseMessageFeedbackResult {
  vote: FeedbackVote;
  thanksMessage: string | null;
  showBadModal: boolean;
  rateLimited: boolean;
  liveRegionMessage: string;
  submitGood: () => void;
  submitBad: () => void;
  undo: () => void;
  openBadModal: () => void;
  closeBadModal: () => void;
  submitBadWithDetails: (reasons: BadReason[], comment: string) => void;
  submitBadBasic: () => void;
  canUndo: boolean;
}

export function useMessageFeedback({
  messageId,
  messageContent,
  spotId,
  userId,
  confidenceScore,
}: UseMessageFeedbackOptions): UseMessageFeedbackResult {
  const [vote, setVote] = useState<FeedbackVote>(null);
  const [thanksMessage, setThanksMessage] = useState<string | null>(null);
  const [showBadModal, setShowBadModal] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [liveRegionMessage, setLiveRegionMessage] = useState("");
  const [canUndo, setCanUndo] = useState(false);

  const feedbackIdRef = useRef<string | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const actionTimestampsRef = useRef<number[]>([]);
  const pendingRef = useRef(false);

  const userToken = userId ?? getAnonymousToken();
  const sessionId = getSessionId();
  const locale =
    typeof navigator !== "undefined" ? navigator.language : "en-US";

  const clearUndoTimer = useCallback(() => {
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
    setCanUndo(false);
  }, []);

  const startUndoWindow = useCallback(() => {
    clearUndoTimer();
    setCanUndo(true);
    undoTimerRef.current = setTimeout(() => {
      setCanUndo(false);
      undoTimerRef.current = null;
    }, UNDO_WINDOW_MS);
  }, [clearUndoTimer]);

  const checkClientRateLimit = useCallback((): boolean => {
    const now = Date.now();
    actionTimestampsRef.current = actionTimestampsRef.current.filter(
      (ts) => now - ts < RATE_LIMIT_WINDOW_MS
    );
    if (actionTimestampsRef.current.length >= RATE_LIMIT_MAX) {
      setRateLimited(true);
      setLiveRegionMessage("Feedback rate limit reached. Try again in a minute.");
      return false;
    }
    actionTimestampsRef.current.push(now);
    setRateLimited(false);
    return true;
  }, []);

  const sendFeedback = useCallback(
    async (
      type: FeedbackVote,
      badReasons: BadReason[] = [],
      comment: string | null = null
    ) => {
      if (!type || pendingRef.current) return;
      if (!checkClientRateLimit()) return;

      pendingRef.current = true;
      const feedbackId = createId();
      feedbackIdRef.current = feedbackId;

      const payload: FeedbackSubmitPayload = {
        feedback_id: feedbackId,
        user_token: userToken,
        message_id: messageId,
        spot_id: spotId ?? null,
        feedback_type: type,
        bad_reasons: badReasons,
        comment: comment ? scrubPii(comment) : null,
        timestamp_utc: new Date().toISOString(),
        app_version: APP_VERSION,
        device_info: parseUserAgent(),
        context_snapshot: await hashContent(messageContent),
        confidence_score: confidenceScore ?? null,
        session_id: sessionId,
        locale,
      };

      try {
        const res = await fetch("/api/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          if (res.status === 429) {
            setRateLimited(true);
            setLiveRegionMessage("Too many feedback actions. Please wait.");
            return;
          }
          throw new Error("submit failed");
        }

        setLiveRegionMessage(
          type === "good"
            ? "Thanks — glad it helped."
            : "Thanks — we'll use this to improve WaveSage."
        );
      } catch {
        const queue = readQueue();
        queue.push({ payload, method: "POST" });
        writeQueue(queue);
        setLiveRegionMessage("Feedback saved offline and will sync when online.");
      } finally {
        pendingRef.current = false;
      }
    },
    [
      checkClientRateLimit,
      confidenceScore,
      locale,
      messageContent,
      messageId,
      sessionId,
      spotId,
      userToken,
    ]
  );

  const submitGood = useCallback(() => {
    if (vote === "good") return;

    setVote("good");
    setThanksMessage("Thanks — glad it helped.");
    setShowBadModal(false);
    startUndoWindow();
    void sendFeedback("good");
  }, [sendFeedback, startUndoWindow, vote]);

  const submitBadBasic = useCallback(() => {
    if (vote === "bad") return;
    setShowBadModal(false);
    setVote("bad");
    setThanksMessage("Thanks — we'll use this to improve WaveSage.");
    startUndoWindow();
    void sendFeedback("bad");
  }, [sendFeedback, startUndoWindow, vote]);

  const submitBadWithDetails = useCallback(
    (reasons: BadReason[], comment: string) => {
      if (vote === "bad") return;
      setShowBadModal(false);
      setVote("bad");
      setThanksMessage("Thanks — we'll use this to improve WaveSage.");
      startUndoWindow();
      void sendFeedback(
        "bad",
        reasons,
        comment.trim() ? scrubPii(comment.trim()) : null
      );
    },
    [sendFeedback, startUndoWindow, vote]
  );

  const submitBad = useCallback(() => {
    if (vote === "bad") return;
    setShowBadModal(true);
  }, [vote]);

  const openBadModal = useCallback(() => setShowBadModal(true), []);
  const closeBadModal = useCallback(() => setShowBadModal(false), []);

  const undo = useCallback(async () => {
    if (!canUndo || !feedbackIdRef.current) return;
    if (!checkClientRateLimit()) return;

    const feedbackId = feedbackIdRef.current;
    clearUndoTimer();
    setVote(null);
    setThanksMessage(null);
    setShowBadModal(false);
    feedbackIdRef.current = null;
    setLiveRegionMessage("Feedback removed.");

    try {
      const params = new URLSearchParams({
        feedback_id: feedbackId,
        user_token: userToken,
      });
      const res = await fetch(`/api/feedback?${params}`, { method: "DELETE" });
      if (!res.ok && res.status !== 404) {
        throw new Error("undo failed");
      }
    } catch {
      const queue = readQueue();
      queue.push({
        payload: {} as FeedbackSubmitPayload,
        method: "DELETE",
        deleteParams: { feedback_id: feedbackId, user_token: userToken },
      });
      writeQueue(queue);
    }
  }, [canUndo, checkClientRateLimit, clearUndoTimer, userToken]);

  useEffect(() => {
    void flushQueue();

    function handleOnline() {
      void flushQueue();
    }

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  useEffect(() => {
    return () => clearUndoTimer();
  }, [clearUndoTimer]);

  return {
    vote,
    thanksMessage,
    showBadModal,
    rateLimited,
    liveRegionMessage,
    submitGood,
    submitBad,
    undo,
    openBadModal,
    closeBadModal,
    submitBadWithDetails,
    submitBadBasic,
    canUndo,
  };
}
