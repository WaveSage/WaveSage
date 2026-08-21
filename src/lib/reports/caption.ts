import { REPORT_CONFIG } from "./config";

const PROFANITY = [
  "fuck",
  "shit",
  "bitch",
  "asshole",
  "damn",
  "cunt",
  "dick",
  "pussy",
  "bastard",
];

const URL_RE =
  /\b(https?:\/\/|www\.|[a-z0-9-]+\.(com|net|org|io|co|me|tv|ly))\b/i;
const EMOJI_RE =
  /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
const HASHTAG_RE = /#\w+/;

export interface CaptionValidation {
  ok: boolean;
  normalized: string;
  error?: string;
  field?: string;
}

export function normalizeCaption(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

export function validateCaption(raw: string): CaptionValidation {
  const normalized = normalizeCaption(raw);

  if (normalized.length > REPORT_CONFIG.captionMaxLength) {
    return {
      ok: false,
      normalized,
      error: "Caption too long—keep it under 140 characters.",
      field: "caption",
    };
  }

  if (URL_RE.test(normalized)) {
    return {
      ok: false,
      normalized,
      error: "Captions cannot include URLs.",
      field: "caption",
    };
  }

  if (EMOJI_RE.test(normalized)) {
    return {
      ok: false,
      normalized,
      error: "Captions cannot include emojis.",
      field: "caption",
    };
  }

  if (HASHTAG_RE.test(normalized)) {
    return {
      ok: false,
      normalized,
      error: "Captions cannot include hashtags.",
      field: "caption",
    };
  }

  const lower = normalized.toLowerCase();
  for (const word of PROFANITY) {
    if (new RegExp(`\\b${word}\\b`, "i").test(lower)) {
      return {
        ok: false,
        normalized,
        error: "Please remove explicit language from your caption.",
        field: "caption",
      };
    }
  }

  return { ok: true, normalized };
}

export function displayCaption(normalized: string): string {
  return normalized || "No caption provided.";
}
