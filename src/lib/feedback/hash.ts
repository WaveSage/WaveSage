import { createHash } from "crypto";

export function hashMessageContent(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}
