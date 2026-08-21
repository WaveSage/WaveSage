import path from "path";

/**
 * Root directory for users, reports, and feedback files.
 * On hosts with a persistent disk (Render, Railway, Fly), set
 * WAVESAGE_DATA_DIR to the mount path (e.g. /data).
 */
export function getDataRoot(): string {
  const fromEnv = process.env.WAVESAGE_DATA_DIR?.trim();
  if (fromEnv) return fromEnv;
  return path.join(process.cwd(), "data");
}

export function dataPath(...parts: string[]): string {
  return path.join(getDataRoot(), ...parts);
}
