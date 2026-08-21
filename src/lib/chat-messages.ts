import type { ChatMessage } from "@/lib/types";

export function createChatMessage(
  role: ChatMessage["role"],
  content: string,
  id?: string
): ChatMessage {
  return {
    id: id ?? createMessageId(),
    role,
    content,
  };
}

export function createMessageId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function ensureMessageId(message: ChatMessage): ChatMessage {
  if (message.id) return message;
  return { ...message, id: createMessageId() };
}
