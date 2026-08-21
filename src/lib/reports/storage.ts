import { promises as fs } from "fs";
import path from "path";
import type { UserReportGalleryItem, UserReportRecord } from "./types";
import { dataPath } from "@/lib/data-root";

const DATA_DIR = dataPath("reports");
const STORE_FILE = path.join(DATA_DIR, "reports.json");
const IMAGES_DIR = path.join(DATA_DIR, "images");
const THUMBS_DIR = path.join(DATA_DIR, "thumbnails");

interface ReportStore {
  reports: UserReportRecord[];
}

async function readStore(): Promise<ReportStore> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = await fs.readFile(STORE_FILE, "utf-8");
    const parsed = JSON.parse(raw) as ReportStore;
    if (!Array.isArray(parsed.reports)) return { reports: [] };
    return parsed;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return { reports: [] };
    throw error;
  }
}

async function saveStore(store: ReportStore): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const temp = `${STORE_FILE}.tmp`;
  await fs.writeFile(temp, JSON.stringify(store, null, 2), "utf-8");
  await fs.rename(temp, STORE_FILE);
}

function createId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `report-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function saveReportImages(
  reportId: string,
  full: Buffer,
  thumbnail: Buffer
): Promise<{ imageFileName: string; thumbnailFileName: string }> {
  await fs.mkdir(IMAGES_DIR, { recursive: true });
  await fs.mkdir(THUMBS_DIR, { recursive: true });

  const imageFileName = `${reportId}.jpg`;
  const thumbnailFileName = `${reportId}.jpg`;

  await fs.writeFile(path.join(IMAGES_DIR, imageFileName), full);
  await fs.writeFile(path.join(THUMBS_DIR, thumbnailFileName), thumbnail);

  return { imageFileName, thumbnailFileName };
}

export async function deleteReportImages(report: UserReportRecord): Promise<void> {
  await fs.unlink(path.join(IMAGES_DIR, report.imageFileName)).catch(() => {});
  await fs
    .unlink(path.join(THUMBS_DIR, report.thumbnailFileName))
    .catch(() => {});
}

export async function createReport(
  record: Omit<UserReportRecord, "id"> & { id?: string }
): Promise<UserReportRecord> {
  const store = await readStore();
  const report: UserReportRecord = {
    ...record,
    id: record.id ?? createId(),
  };
  store.reports.push(report);
  await saveStore(store);
  return report;
}

export async function listReports(options?: {
  spotId?: string;
  userId?: string;
  recentHours?: number;
  includeDeleted?: boolean;
}): Promise<UserReportRecord[]> {
  const store = await readStore();
  const now = Date.now();
  const windowMs = (options?.recentHours ?? 24 * 365) * 60 * 60 * 1000;

  return store.reports.filter((report) => {
    if (!options?.includeDeleted && report.deleted) return false;
    if (report.moderationHidden) return false;
    if (options?.spotId && report.spotId !== options.spotId) return false;
    if (options?.userId && report.userId !== options.userId) return false;
    const captureMs = Date.parse(report.captureTimeUtc);
    if (!Number.isFinite(captureMs)) return false;
    if (now - captureMs > windowMs) return false;
    return true;
  });
}

export async function getReportById(id: string): Promise<UserReportRecord | null> {
  const store = await readStore();
  return store.reports.find((r) => r.id === id) ?? null;
}

export async function softDeleteReport(
  id: string,
  userId: string
): Promise<boolean> {
  const store = await readStore();
  const report = store.reports.find((r) => r.id === id);
  if (!report || report.userId !== userId) return false;

  report.deleted = true;
  await saveStore(store);
  await deleteReportImages(report);
  return true;
}

export async function readReportImage(
  reportId: string,
  variant: "full" | "thumb"
): Promise<Buffer | null> {
  const report = await getReportById(reportId);
  if (!report || report.deleted) return null;

  const dir = variant === "full" ? IMAGES_DIR : THUMBS_DIR;
  const file = variant === "full" ? report.imageFileName : report.thumbnailFileName;

  try {
    return await fs.readFile(path.join(dir, file));
  } catch {
    return null;
  }
}

export function toGalleryItem(
  report: UserReportRecord,
  viewerUserId: string
): UserReportGalleryItem {
  return {
    id: report.id,
    spotId: report.spotId,
    spotName: report.spotName,
    normalizedCaption: report.normalizedCaption,
    captureTimeUtc: report.captureTimeUtc,
    submissionTimeUtc: report.submissionTimeUtc,
    distanceToSpotMiles: report.distanceToSpotMiles,
    imageContentConfidence: report.imageContentConfidence,
    notes: report.notes,
    username: report.username,
    isOwn: report.userId === viewerUserId,
    imageUrl: `/api/reports/image/${report.id}`,
    thumbnailUrl: `/api/reports/image/${report.id}?thumb=1`,
  };
}
