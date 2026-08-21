import { promises as fs } from "fs";
import path from "path";
import type { FeedbackRecord } from "./types";
import { dataPath } from "@/lib/data-root";

const DATA_DIR = dataPath("feedback");
const STORE_FILE = path.join(DATA_DIR, "feedback.json");

interface FeedbackStore {
  records: FeedbackRecord[];
}

async function readStore(): Promise<FeedbackStore> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = await fs.readFile(STORE_FILE, "utf-8");
    const parsed = JSON.parse(raw) as FeedbackStore;
    if (!Array.isArray(parsed.records)) return { records: [] };
    return parsed;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return { records: [] };
    throw error;
  }
}

async function saveStore(store: FeedbackStore): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const temp = `${STORE_FILE}.tmp`;
  await fs.writeFile(temp, JSON.stringify(store, null, 2), "utf-8");
  await fs.rename(temp, STORE_FILE);
}

export async function saveFeedback(
  record: FeedbackRecord
): Promise<FeedbackRecord> {
  const store = await readStore();
  const existing = store.records.findIndex(
    (r) => r.feedback_id === record.feedback_id
  );
  if (existing >= 0) {
    store.records[existing] = record;
  } else {
    store.records.push(record);
  }
  await saveStore(store);
  return record;
}

export async function getFeedbackById(
  feedbackId: string
): Promise<FeedbackRecord | null> {
  const store = await readStore();
  return store.records.find((r) => r.feedback_id === feedbackId) ?? null;
}

export async function cancelFeedback(
  feedbackId: string,
  userToken: string
): Promise<boolean> {
  const store = await readStore();
  const record = store.records.find((r) => r.feedback_id === feedbackId);
  if (!record || record.user_token !== userToken || record.cancelled) {
    return false;
  }

  const submittedMs = Date.parse(record.timestamp_utc);
  if (!Number.isFinite(submittedMs)) return false;
  if (Date.now() - submittedMs > 5_000) return false;

  record.cancelled = true;
  await saveStore(store);
  return true;
}

export async function listActiveFeedback(): Promise<FeedbackRecord[]> {
  const store = await readStore();
  return store.records.filter((r) => !r.cancelled);
}
