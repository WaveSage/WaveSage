"use client";

import { useState } from "react";
import type { ChatMessage } from "@/lib/types";
import type { ExperienceLevel } from "@/lib/auth/types";
import { EXPERIENCE_LABELS } from "@/lib/auth/types";
import {
  VOLUME_QUICK_PROMPT,
  VOLUME_EXPERIENCE_OPTIONS,
  type VolumeFormExperience,
} from "@/engines/coach/topic-guard";
import { MessageFeedback } from "@/components/MessageFeedback";

interface ChatProps {
  messages: ChatMessage[];
  loading: boolean;
  onSend: (message: string) => void;
  placeholder?: string;
  quickPrompts?: string[];
  defaultExperienceLevel?: ExperienceLevel;
  onVolumeRecommend?: (
    weightLbs: number,
    experienceLevel: VolumeFormExperience
  ) => void;
  spotId?: string | null;
  userId?: string | null;
  showFeedback?: boolean;
}

function defaultVolumeExperience(
  level?: ExperienceLevel
): VolumeFormExperience {
  if (level === "beginner" || level === "intermediate" || level === "advanced") {
    return level;
  }
  return "intermediate";
}

export function Chat({
  messages,
  loading,
  onSend,
  placeholder = "Ask the Sage...",
  quickPrompts = [],
  defaultExperienceLevel,
  onVolumeRecommend,
  spotId,
  userId,
  showFeedback = false,
}: ChatProps) {
  const [input, setInput] = useState("");
  const [showVolumeForm, setShowVolumeForm] = useState(false);
  const [weightLbs, setWeightLbs] = useState("");
  const [volumeExperience, setVolumeExperience] = useState<VolumeFormExperience>(
    () => defaultVolumeExperience(defaultExperienceLevel)
  );
  const [volumeError, setVolumeError] = useState<string | null>(null);

  function submit(message: string) {
    const trimmed = message.trim();
    if (!trimmed || loading) return;
    onSend(trimmed);
    setInput("");
  }

  function handleQuickPrompt(prompt: string) {
    if (prompt === VOLUME_QUICK_PROMPT && onVolumeRecommend) {
      setShowVolumeForm(true);
      setVolumeError(null);
      setVolumeExperience(defaultVolumeExperience(defaultExperienceLevel));
      return;
    }
    submit(prompt);
  }

  function handleVolumeSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (loading || !onVolumeRecommend) return;

    const weight = Number(weightLbs);
    if (!Number.isFinite(weight) || weight < 80 || weight > 350) {
      setVolumeError("Enter your weight in lbs (80–350).");
      return;
    }

    setVolumeError(null);
    setShowVolumeForm(false);
    onVolumeRecommend(Math.round(weight), volumeExperience);
    setWeightLbs("");
  }

  return (
    <>
      <div className="chat-log">
        {messages.map((message, index) => {
          const messageId = message.id ?? `legacy-${index}`;
          const isAssistant = message.role === "assistant";

          return (
            <div
              key={messageId}
              className={`message ${message.role}`}
            >
              <div className="message-content">{message.content}</div>
              {showFeedback && isAssistant && message.id && (
                <MessageFeedback
                  messageId={message.id}
                  messageContent={message.content}
                  spotId={spotId}
                  userId={userId}
                />
              )}
            </div>
          );
        })}
        {loading && (
          <div className="message assistant muted">Thinking...</div>
        )}
      </div>

      {quickPrompts.length > 0 && (
        <div className="quick-prompts">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => handleQuickPrompt(prompt)}
              disabled={loading}
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {showVolumeForm && onVolumeRecommend && (
        <form className="volume-form" onSubmit={handleVolumeSubmit}>
          <p className="volume-form-title">Volume recommendation</p>
          <div className="volume-form-fields">
            <label className="volume-form-field">
              Weight (lbs)
              <input
                type="number"
                min={80}
                max={350}
                step={1}
                inputMode="numeric"
                placeholder="e.g. 175"
                value={weightLbs}
                onChange={(event) => setWeightLbs(event.target.value)}
                disabled={loading}
                autoFocus
              />
            </label>
            <label className="volume-form-field">
              Experience
              <select
                value={volumeExperience}
                onChange={(event) =>
                  setVolumeExperience(event.target.value as VolumeFormExperience)
                }
                disabled={loading}
              >
                {VOLUME_EXPERIENCE_OPTIONS.map((level) => (
                  <option key={level} value={level}>
                    {EXPERIENCE_LABELS[level]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {volumeError && <p className="volume-form-error">{volumeError}</p>}
          <div className="volume-form-actions">
            <button
              type="button"
              className="volume-form-cancel"
              onClick={() => {
                setShowVolumeForm(false);
                setVolumeError(null);
              }}
              disabled={loading}
            >
              Cancel
            </button>
            <button type="submit" className="volume-form-submit" disabled={loading}>
              Get recommendation
            </button>
          </div>
        </form>
      )}

      <form
        className="chat-form"
        onSubmit={(event) => {
          event.preventDefault();
          submit(input);
        }}
      >
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={placeholder}
          disabled={loading}
        />
        <button type="submit" disabled={loading || !input.trim()}>
          Ask
        </button>
      </form>
    </>
  );
}
