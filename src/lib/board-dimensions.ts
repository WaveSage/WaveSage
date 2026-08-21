/** Rough liter estimate from length (ft), width (in), and thickness (in). */
export function estimateVolumeL(
  lengthFt: number,
  widthIn: number,
  thicknessIn: number
): number {
  const lengthIn = lengthFt * 12;
  return Math.round(((lengthIn * widthIn * (thicknessIn + 2.5)) / 61) * 10) / 10;
}

/** Accepts 6.1, 6, 6'2, 6'2", 6-2, etc. */
export function parseLengthFt(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const feetInches = trimmed.match(
    /^(\d+(?:\.\d+)?)\s*[''′\-]\s*(\d+(?:\.\d+)?)?/
  );
  if (feetInches) {
    const feet = Number(feetInches[1]);
    const inches = feetInches[2] ? Number(feetInches[2]) : 0;
    if (!Number.isFinite(feet) || !Number.isFinite(inches) || inches >= 12) {
      return null;
    }
    return Math.round((feet + inches / 12) * 100) / 100;
  }

  const num = Number(trimmed);
  return Number.isFinite(num) && num > 0 ? num : null;
}

/** Accepts 19.5, 19 5/8, etc. */
export function parseInches(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const fraction = trimmed.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (fraction) {
    const whole = Number(fraction[1]);
    const numerator = Number(fraction[2]);
    const denominator = Number(fraction[3]);
    if (!Number.isFinite(whole) || denominator === 0) return null;
    return Math.round((whole + numerator / denominator) * 1000) / 1000;
  }

  const num = Number(trimmed);
  return Number.isFinite(num) && num > 0 ? num : null;
}

export function createBoardId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `board-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export type BoardFormValues = {
  name: string;
  lengthFt: string;
  widthIn: string;
  thicknessIn: string;
};

export function validateBoardForm(values: BoardFormValues): string | null {
  if (!values.name.trim()) {
    return "Enter a board name.";
  }

  const length = parseLengthFt(values.lengthFt);
  if (length == null) {
    return "Enter a valid length (e.g. 6.1 or 6'2).";
  }

  const width = parseInches(values.widthIn);
  if (width == null) {
    return "Enter a valid width in inches (e.g. 19.5).";
  }

  const thickness = parseInches(values.thicknessIn);
  if (thickness == null) {
    return "Enter a valid thickness in inches (e.g. 2.5).";
  }

  return null;
}

export function boardFromFormValues(
  values: BoardFormValues,
  type: string,
  finSetup: string
): {
  name: string;
  type: string;
  lengthFt: number;
  widthIn: number;
  thicknessIn: number;
  volumeL: number;
  finSetup: string;
} | null {
  const error = validateBoardForm(values);
  if (error) return null;

  const lengthFt = parseLengthFt(values.lengthFt)!;
  const widthIn = parseInches(values.widthIn)!;
  const thicknessIn = parseInches(values.thicknessIn)!;

  return {
    name: values.name.trim(),
    type,
    lengthFt,
    widthIn,
    thicknessIn,
    volumeL: estimateVolumeL(lengthFt, widthIn, thicknessIn),
    finSetup,
  };
}

export function formatBoardDimensions(board: {
  lengthFt: number;
  widthIn?: number;
  thicknessIn?: number;
  volumeL?: number;
}): string {
  if (board.widthIn != null && board.thicknessIn != null) {
    return `${board.lengthFt}' × ${board.widthIn}" × ${board.thicknessIn}"`;
  }
  if (board.volumeL != null) {
    return `${board.lengthFt}' · ${board.volumeL}L`;
  }
  return `${board.lengthFt}'`;
}
