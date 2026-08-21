import sharp from "sharp";
import { REPORT_CONFIG } from "./config";

export interface ImageClassification {
  confidence: number;
  oceanRatio: number;
  skyRatio: number;
  skinRatio: number;
  rejectedReason?: string;
}

function isOceanPixel(r: number, g: number, b: number): boolean {
  return b > 55 && b >= r * 0.85 && g >= r * 0.65 && b > g * 0.75;
}

function isSkyPixel(r: number, g: number, b: number): boolean {
  return b > 120 && g > 100 && r > 70 && b >= g;
}

function isSkinPixel(r: number, g: number, b: number): boolean {
  return r > 95 && g > 40 && b > 20 && r > g && r > b && r - g < 80;
}

export async function classifySurfImage(
  buffer: Buffer
): Promise<ImageClassification> {
  const { data, info } = await sharp(buffer)
    .rotate()
    .resize(96, 96, { fit: "cover" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = info.width * info.height;
  let ocean = 0;
  let sky = 0;
  let skin = 0;

  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * 3;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      if (y < info.height * 0.35 && isSkyPixel(r, g, b)) sky++;
      if (y >= info.height * 0.25 && isOceanPixel(r, g, b)) ocean++;
      if (
        y >= info.height * 0.2 &&
        y <= info.height * 0.85 &&
        isSkinPixel(r, g, b)
      ) {
        skin++;
      }
    }
  }

  const oceanRatio = ocean / pixels;
  const skyRatio = sky / pixels;
  const skinRatio = skin / pixels;

  let confidence = 0.2;
  if (oceanRatio >= 0.18) confidence += 0.35;
  if (skyRatio >= 0.08) confidence += 0.15;
  if (oceanRatio + skyRatio >= 0.35) confidence += 0.2;
  if (oceanRatio >= 0.28 && skyRatio >= 0.05) confidence += 0.1;

  if (skinRatio > 0.18) {
    return {
      confidence: 0.15,
      oceanRatio,
      skyRatio,
      skinRatio,
      rejectedReason: "close_up_people",
    };
  }

  if (oceanRatio < 0.12) {
    return {
      confidence: 0.2,
      oceanRatio,
      skyRatio,
      skinRatio,
      rejectedReason: "not_ocean",
    };
  }

  confidence = Math.min(0.95, Math.round(confidence * 100) / 100);

  return { confidence, oceanRatio, skyRatio, skinRatio };
}

export function imageConfidenceVerdict(confidence: number): {
  accept: boolean;
  lowConfidence: boolean;
} {
  if (confidence < REPORT_CONFIG.confidenceLow) {
    return { accept: false, lowConfidence: false };
  }
  if (confidence < REPORT_CONFIG.confidenceAccept) {
    return { accept: true, lowConfidence: true };
  }
  return { accept: true, lowConfidence: false };
}

export async function prepareReportImages(buffer: Buffer): Promise<{
  full: Buffer;
  thumbnail: Buffer;
}> {
  const full = await sharp(buffer)
    .rotate()
    .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();

  const thumbnail = await sharp(buffer)
    .rotate()
    .resize(320, 320, { fit: "cover" })
    .jpeg({ quality: 80 })
    .toBuffer();

  return { full, thumbnail };
}

export function detectImageMime(buffer: Buffer): "image/jpeg" | "image/png" | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "image/png";
  }
  return null;
}
