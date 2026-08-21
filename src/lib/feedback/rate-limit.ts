const WINDOW_MS = 60_000;
const MAX_ACTIONS = 10;

interface RateLimitEntry {
  timestamps: number[];
}

const buckets = new Map<string, RateLimitEntry>();

function prune(entry: RateLimitEntry, now: number): void {
  entry.timestamps = entry.timestamps.filter((ts) => now - ts < WINDOW_MS);
}

export function checkRateLimit(userToken: string): {
  allowed: boolean;
  retryAfterMs?: number;
} {
  const now = Date.now();
  let entry = buckets.get(userToken);
  if (!entry) {
    entry = { timestamps: [] };
    buckets.set(userToken, entry);
  }

  prune(entry, now);

  if (entry.timestamps.length >= MAX_ACTIONS) {
    const oldest = entry.timestamps[0]!;
    return { allowed: false, retryAfterMs: WINDOW_MS - (now - oldest) };
  }

  entry.timestamps.push(now);
  return { allowed: true };
}

export function releaseRateLimitSlot(userToken: string): void {
  const entry = buckets.get(userToken);
  if (!entry || entry.timestamps.length === 0) return;
  entry.timestamps.pop();
}
