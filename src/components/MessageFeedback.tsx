"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  BAD_REASON_LABELS,
  type BadReason,
} from "@/lib/feedback/types";
import { useMessageFeedback } from "@/lib/feedback/useMessageFeedback";

const BAD_REASON_OPTIONS: BadReason[] = [
  "incorrect_fact",
  "repetitive",
  "too_long",
  "tone_problem",
];

interface BadFeedbackModalProps {
  open: boolean;
  onCancel: () => void;
  onSubmit: (reasons: BadReason[], comment: string) => void;
}

function BadFeedbackModal({ open, onCancel, onSubmit }: BadFeedbackModalProps) {
  const titleId = useId();
  const [reasons, setReasons] = useState<BadReason[]>([]);
  const [comment, setComment] = useState("");
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      setReasons([]);
      setComment("");
      return;
    }
    cancelRef.current?.focus();
  }, [open]);

  if (!open) return null;

  function toggleReason(reason: BadReason) {
    setReasons((prev) =>
      prev.includes(reason)
        ? prev.filter((r) => r !== reason)
        : [...prev, reason]
    );
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    onSubmit(reasons, comment);
  }

  return (
    <div
      className="photo-modal-backdrop feedback-modal-backdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div
        className="panel photo-modal feedback-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id={titleId} className="feedback-modal-title">
          Sorry — what went wrong?
        </h3>
        <form onSubmit={handleSubmit}>
          <fieldset className="feedback-reasons">
            <legend className="feedback-reasons-legend">What went wrong?</legend>
            {BAD_REASON_OPTIONS.map((reason) => (
              <label key={reason} className="feedback-reason-label">
                <input
                  type="checkbox"
                  checked={reasons.includes(reason)}
                  onChange={() => toggleReason(reason)}
                />
                <span>{BAD_REASON_LABELS[reason]}</span>
              </label>
            ))}
          </fieldset>

          <label className="photo-caption-label feedback-comment-label">
            More details (optional).
            <textarea
              value={comment}
              onChange={(event) =>
                setComment(event.target.value.slice(0, 250))
              }
              maxLength={250}
              rows={3}
              placeholder="Tell us more (optional)"
            />
          </label>
          <p className="photo-caption-meta">
            {comment.length}/250 characters
          </p>

          <div className="photo-modal-actions">
            <button
              ref={cancelRef}
              type="button"
              className="volume-form-cancel"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button type="submit" className="volume-form-submit">
              Submit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ThumbIcon({ up }: { up: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {up ? (
        <>
          <path d="M7 10v12" />
          <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
        </>
      ) : (
        <>
          <path d="M17 14V2" />
          <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z" />
        </>
      )}
    </svg>
  );
}

export interface MessageFeedbackProps {
  messageId: string;
  messageContent: string;
  spotId?: string | null;
  userId?: string | null;
  confidenceScore?: number | null;
}

export function MessageFeedback({
  messageId,
  messageContent,
  spotId,
  userId,
  confidenceScore,
}: MessageFeedbackProps) {
  const {
    vote,
    thanksMessage,
    showBadModal,
    rateLimited,
    liveRegionMessage,
    submitGood,
    submitBad,
    undo,
    closeBadModal,
    submitBadWithDetails,
    submitBadBasic,
    canUndo,
  } = useMessageFeedback({
    messageId,
    messageContent,
    spotId,
    userId,
    confidenceScore,
  });

  function handleGoodClick() {
    if (vote === "good" && canUndo) {
      undo();
      return;
    }
    submitGood();
  }

  function handleBadClick() {
    if (vote === "bad" && canUndo) {
      undo();
      return;
    }
    submitBad();
  }

  return (
    <div className="message-feedback">
      <div className="message-feedback-buttons">
        <button
          type="button"
          className={`feedback-btn ${vote === "good" ? "active good" : ""}`}
          onClick={handleGoodClick}
          disabled={rateLimited}
          aria-label="Good response"
          aria-pressed={vote === "good"}
          title="Good response — helpful, clear."
        >
          <ThumbIcon up />
          <span className="sr-only">Good response</span>
        </button>
        <button
          type="button"
          className={`feedback-btn ${vote === "bad" ? "active bad" : ""}`}
          onClick={handleBadClick}
          disabled={rateLimited}
          aria-label="Bad response"
          aria-pressed={vote === "bad"}
          title="Bad response — unhelpful, incorrect, or repetitive."
        >
          <ThumbIcon up={false} />
          <span className="sr-only">Bad response</span>
        </button>
      </div>

      {thanksMessage && (
        <p className="message-feedback-thanks" aria-live="polite">
          {thanksMessage}
        </p>
      )}

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {liveRegionMessage}
      </p>

      <BadFeedbackModal
        open={showBadModal}
        onCancel={() => {
          closeBadModal();
          submitBadBasic();
        }}
        onSubmit={submitBadWithDetails}
      />
    </div>
  );
}
