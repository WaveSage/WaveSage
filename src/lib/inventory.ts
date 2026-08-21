import type { Inventory } from "@/lib/types";

export const EMPTY_INVENTORY: Inventory = {
  skillLevel: "intermediate",
  defaultSpot: {
    id: "hermosa",
    name: "Hermosa Beach",
    region: "South Bay",
    latitude: 33.862,
    longitude: -118.399,
    shoreBearingDeg: 270,
  },
  boards: [],
  fins: [],
  builds: [],
};

export const SAMPLE_INVENTORY: Inventory = {
  skillLevel: "intermediate",
  defaultSpot: {
    id: "hermosa",
    name: "Hermosa Beach",
    region: "South Bay",
    latitude: 33.862,
    longitude: -118.399,
    shoreBearingDeg: 270,
  },
  boards: [
    {
      id: "board-1",
      name: "Daily Driver Shortboard",
      type: "shortboard",
      lengthFt: 6.1,
      widthIn: 19.25,
      thicknessIn: 2.5,
      volumeL: 30,
      finSetup: "thruster",
      notes: "Go-to for good days",
    },
    {
      id: "board-2",
      name: "Twin Fish",
      type: "fish",
      lengthFt: 5.8,
      widthIn: 21,
      thicknessIn: 2.5,
      volumeL: 34,
      finSetup: "twin",
      notes: "Small/medium mush",
    },
    {
      id: "board-3",
      name: "Mid Length Fun",
      type: "midlength",
      lengthFt: 7.2,
      widthIn: 21.5,
      thicknessIn: 2.75,
      volumeL: 48,
      finSetup: "2+1",
      notes: "Easy paddle, grovel days",
    },
  ],
  fins: [
    {
      id: "fin-1",
      name: "Performance Thruster M",
      setup: "thruster",
      size: "M",
      template: "performance",
    },
    {
      id: "fin-2",
      name: "Pivot Twin Keels",
      setup: "twin",
      size: "L",
      template: "pivot",
    },
    {
      id: "fin-3",
      name: "Neutral Quad S",
      setup: "quad",
      size: "S",
      template: "neutral",
    },
  ],
  builds: [],
};

export const INVENTORY_STORAGE_KEY = "wavesage-inventory";
const LEGACY_SURF_SAGE_KEY = "surf-sage-inventory";
const LEGACY_SURF_APP_KEY = "surf-app-inventory";

export function hasSavedInventory(): boolean {
  if (typeof window === "undefined") return false;
  return (
    !!localStorage.getItem(INVENTORY_STORAGE_KEY) ||
    !!localStorage.getItem(LEGACY_SURF_SAGE_KEY) ||
    !!localStorage.getItem(LEGACY_SURF_APP_KEY)
  );
}

export function loadInventory(): Inventory {
  if (typeof window === "undefined") return EMPTY_INVENTORY;

  try {
    const raw = localStorage.getItem(INVENTORY_STORAGE_KEY);
    if (raw) {
      return normalizeInventory(JSON.parse(raw) as Inventory);
    }

    const surfSageLegacy = localStorage.getItem(LEGACY_SURF_SAGE_KEY);
    if (surfSageLegacy) {
      localStorage.setItem(INVENTORY_STORAGE_KEY, surfSageLegacy);
      return normalizeInventory(JSON.parse(surfSageLegacy) as Inventory);
    }

    const surfAppLegacy = localStorage.getItem(LEGACY_SURF_APP_KEY);
    if (surfAppLegacy) {
      localStorage.setItem(INVENTORY_STORAGE_KEY, surfAppLegacy);
      return normalizeInventory(JSON.parse(surfAppLegacy) as Inventory);
    }

    return EMPTY_INVENTORY;
  } catch {
    return EMPTY_INVENTORY;
  }
}

function normalizeInventory(inv: Inventory): Inventory {
  return {
    ...inv,
    builds: inv.builds ?? [],
  };
}

export function saveInventory(inventory: Inventory): void {
  localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(inventory));
}
