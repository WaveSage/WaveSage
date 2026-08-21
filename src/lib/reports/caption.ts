import { REPORT_CONFIG } from "./config";

const PROFANITY = [
  "fuck",
  "fucker",
  "fucking",
  "shit",
  "shitty",
  "bullshit",
  "bitch",
  "asshole",
  "asswipe",
  "dumbass",
  "dipshit",
  "damn",
  "goddamn",
  "cunt",
  "dick",
  "dickhead",
  "pussy",
  "bastard",
  "motherfucker",
  "cock",
  "twat",
  "wank",
  "bollocks",
  "slut",
  "whore",
  "piss",
  "tits",
  "fag",
  "faggot",
  "nigger",
  "retard",
];

function foldLeetspeak(text: string): string {
  return text
    .toLowerCase()
    .replace(/[@àáâä]/g, "a")
    .replace(/0/g, "o")
    .replace(/[1!|]/g, "i")
    .replace(/3/g, "e")
    .replace(/\$/g, "s")
    .replace(/5/g, "s")
    .replace(/7/g, "t")
    .replace(/[^a-z]+/g, " ");
}

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

  const folded = foldLeetspeak(normalized);
  for (const word of PROFANITY) {
    if (new RegExp(`\\b${word}\\b`, "i").test(folded)) {
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
