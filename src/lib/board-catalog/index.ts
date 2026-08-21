import type { Surfboard } from "@/lib/types";
import type { BoardModel } from "./types";
import { ALBUM_MODELS } from "./brands/album";
import { BORST_MODELS } from "./brands/borst";
import { CHANNEL_ISLANDS_MODELS } from "./brands/channel-islands";
import { CHEMISTRY_MODELS } from "./brands/chemistry";
import { CHRISTENSON_MODELS } from "./brands/christenson";
import { FIREWIRE_MODELS } from "./brands/firewire";
import { HAYDEN_SHAPES_MODELS } from "./brands/hayden-shapes";
import { JS_INDUSTRIES_MODELS } from "./brands/js-industries";
import { LOST_MODELS } from "./brands/lost";
import { ONE_REVOLVER_MODELS } from "./brands/one-revolver";
import { PYZEL_MODELS } from "./brands/pyzel";
import { RUSTY_MODELS } from "./brands/rusty";
import { SLATER_DESIGNS_MODELS } from "./brands/slater-designs";
import { TIMMY_PATTERSON_MODELS } from "./brands/timmy-patterson";

export type { BoardModel, BoardModelTraits, BoardWaveRange } from "./types";

export const CATALOG_BRANDS = [
  "Slater Designs",
  "Firewire",
  "JS Industries",
  "Lost Surfboards",
  "Rusty Surfboards",
  "Album Surfboards",
  "ONE Surfboards",
  "Revolver Surfboards",
  "Channel Islands",
  "Pyzel Surfboards",
  "Chemistry Surfboards",
  "Borst Surfboards",
  "Timmy Patterson Surfboards",
  "Chris Christenson",
  "Hayden Shapes",
] as const;

export const BOARD_CATALOG: BoardModel[] = [
  ...SLATER_DESIGNS_MODELS,
  ...FIREWIRE_MODELS,
  ...JS_INDUSTRIES_MODELS,
  ...LOST_MODELS,
  ...RUSTY_MODELS,
  ...ALBUM_MODELS,
  ...ONE_REVOLVER_MODELS,
  ...CHANNEL_ISLANDS_MODELS,
  ...PYZEL_MODELS,
  ...CHEMISTRY_MODELS,
  ...BORST_MODELS,
  ...TIMMY_PATTERSON_MODELS,
  ...CHRISTENSON_MODELS,
  ...HAYDEN_SHAPES_MODELS,
];

const catalogById = new Map(BOARD_CATALOG.map((m) => [m.id, m]));

const modelsByBrand = BOARD_CATALOG.reduce<Map<string, BoardModel[]>>(
  (map, model) => {
    const list = map.get(model.brand) ?? [];
    list.push(model);
    map.set(model.brand, list);
    return map;
  },
  new Map()
);

export function getBoardModelById(id: string): BoardModel | null {
  return catalogById.get(id) ?? null;
}

export function getModelsByBrand(brand: string): BoardModel[] {
  return modelsByBrand.get(brand) ?? [];
}

export function findBoardModelByName(name: string): BoardModel | null {
  const lower = name.toLowerCase().trim();
  if (!lower) return null;

  for (const model of BOARD_CATALOG) {
    if (model.label.toLowerCase() === lower) return model;
  }

  let best: BoardModel | null = null;
  let bestScore = 0;

  for (const model of BOARD_CATALOG) {
    const candidates = [
      model.label.toLowerCase(),
      model.model.toLowerCase(),
      model.brand.toLowerCase(),
      `${model.brand} ${model.model}`.toLowerCase(),
      `${model.shaper} ${model.model}`.toLowerCase(),
      ...model.aliases,
    ];

    for (const candidate of candidates) {
      if (!candidate || candidate.length < 3) continue;
      if (lower.includes(candidate) || candidate.includes(lower)) {
        if (candidate.length > bestScore) {
          bestScore = candidate.length;
          best = model;
        }
      }
    }
  }

  return best;
}

export function findBoardModelInText(text: string): BoardModel | null {
  const lower = text.toLowerCase();
  let best: BoardModel | null = null;
  let bestScore = 0;

  for (const model of BOARD_CATALOG) {
    for (const alias of model.aliases) {
      if (alias.length < 4) continue;
      if (lower.includes(alias) && alias.length > bestScore) {
        bestScore = alias.length;
        best = model;
      }
    }
  }

  return best ?? findBoardModelByName(text);
}

export function surfboardFromNameInput(
  name: string,
  lengthFt: number,
  volumeL?: number
): Surfboard {
  const model = findBoardModelByName(name);
  const len = lengthFt > 0 ? lengthFt : model?.defaultLengthFt ?? 6;

  if (model) {
    const spec = boardFromModel(model, len);
    return {
      id: "hypothetical-board",
      name: name.trim() || spec.name,
      type: spec.type,
      lengthFt: len,
      volumeL: volumeL && volumeL > 0 ? volumeL : spec.volumeL,
      finSetup: spec.finSetup,
      modelId: spec.modelId,
      shaper: spec.shaper,
    };
  }

  return {
    id: "hypothetical-board",
    name: name.trim() || "Custom board",
    type: "hybrid",
    lengthFt: len,
    volumeL: volumeL && volumeL > 0 ? volumeL : 30,
    finSetup: "thruster",
  };
}

export function boardFromModel(
  model: BoardModel,
  lengthFt?: number
): {
  name: string;
  type: Surfboard["type"];
  lengthFt: number;
  volumeL: number;
  finSetup: Surfboard["finSetup"];
  modelId: string;
  shaper: string;
} {
  const len = lengthFt ?? model.defaultLengthFt;
  return {
    name: model.label,
    type: model.type,
    lengthFt: Math.round(len * 100) / 100,
    volumeL: Math.round(model.volumeForLength(len) * 10) / 10,
    finSetup: model.finSetup,
    modelId: model.id,
    shaper: model.shaper,
  };
}
