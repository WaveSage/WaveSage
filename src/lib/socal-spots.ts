import type { SurfSpot } from "@/lib/types";
import { findSpotKnowledge } from "@/lib/sage-knowledge";

export const SOCAL_REGION = "Southern California";

export const SOCAL_SPOTS: SurfSpot[] = [
  {
    id: "malibu",
    name: "Malibu",
    region: "LA / Ventura",
    latitude: 34.037,
    longitude: -118.677,
    shoreBearingDeg: 180,
    aliases: ["first point", "malibu point"],
  },
  {
    id: "ventura",
    name: "Ventura Point",
    region: "LA / Ventura",
    latitude: 34.275,
    longitude: -119.293,
    shoreBearingDeg: 200,
    aliases: ["ventura", "c-street"],
  },
  {
    id: "venice",
    name: "Venice Beach",
    region: "South Bay",
    latitude: 33.985,
    longitude: -118.469,
    shoreBearingDeg: 270,
    aliases: ["venice"],
  },
  {
    id: "manhattan",
    name: "Manhattan Beach",
    region: "South Bay",
    latitude: 33.884,
    longitude: -118.411,
    shoreBearingDeg: 270,
    aliases: ["manhattan"],
  },
  {
    id: "hermosa",
    name: "Hermosa Beach",
    region: "South Bay",
    latitude: 33.862,
    longitude: -118.399,
    shoreBearingDeg: 270,
    aliases: ["hermosa"],
  },
  {
    id: "redondo",
    name: "Redondo Beach",
    region: "South Bay",
    latitude: 33.849,
    longitude: -118.388,
    shoreBearingDeg: 270,
    aliases: ["redondo"],
  },
  {
    id: "palos-verdes",
    name: "Palos Verdes",
    region: "South Bay",
    latitude: 33.744,
    longitude: -118.39,
    shoreBearingDeg: 250,
    aliases: ["pv", "lunada bay", "abalone cove"],
  },
  {
    id: "huntington",
    name: "Huntington Beach",
    region: "Orange County",
    latitude: 33.655,
    longitude: -118.005,
    shoreBearingDeg: 270,
    aliases: ["huntington", "hb", "huntington pier"],
  },
  {
    id: "newport",
    name: "Newport Beach",
    region: "Orange County",
    latitude: 33.606,
    longitude: -117.931,
    shoreBearingDeg: 270,
    aliases: ["newport", "the wedge", "newport pier"],
  },
  {
    id: "salt-creek",
    name: "Salt Creek",
    region: "Orange County",
    latitude: 33.478,
    longitude: -117.724,
    shoreBearingDeg: 240,
    aliases: ["salt creek", "dana point"],
  },
  {
    id: "trestles",
    name: "Lower Trestles",
    region: "Orange County",
    latitude: 33.384,
    longitude: -117.592,
    shoreBearingDeg: 220,
    aliases: ["trestles", "lowers", "lower trestles", "san clemente"],
  },
  {
    id: "trestles-uppers",
    name: "Uppers",
    region: "Orange County",
    latitude: 33.388,
    longitude: -117.595,
    shoreBearingDeg: 220,
    aliases: ["uppers", "upper trestles", "trestles uppers"],
  },
  {
    id: "trestles-middles",
    name: "Middles",
    region: "Orange County",
    latitude: 33.386,
    longitude: -117.593,
    shoreBearingDeg: 220,
    aliases: ["middles", "middle trestles", "trestles middles"],
  },
  {
    id: "grandview",
    name: "Grandview",
    region: "San Diego",
    latitude: 33.028,
    longitude: -117.278,
    shoreBearingDeg: 270,
    aliases: ["grandview encinitas", "grand view", "pipes", "pipe", "san elijo"],
  },
  {
    id: "beacons",
    name: "Beacons",
    region: "San Diego",
    latitude: 33.045,
    longitude: -117.292,
    shoreBearingDeg: 270,
    aliases: ["beacons beach"],
  },
  {
    id: "d-street",
    name: "D Street",
    region: "San Diego",
    latitude: 33.025,
    longitude: -117.281,
    shoreBearingDeg: 270,
    aliases: ["d street", "d-street", "d st"],
  },
  {
    id: "del-mar-jetty",
    name: "Del Mar Jetty",
    region: "San Diego",
    latitude: 32.968,
    longitude: -117.268,
    shoreBearingDeg: 270,
    aliases: ["del mar jetty", "dm jetty"],
  },
  {
    id: "scripps-pier",
    name: "Scripps Pier",
    region: "San Diego",
    latitude: 32.866,
    longitude: -117.257,
    shoreBearingDeg: 270,
    aliases: ["scripps", "scripps pier", "la jolla scripps"],
  },
  {
    id: "mission-jetty",
    name: "Mission Jetty",
    region: "San Diego",
    latitude: 32.772,
    longitude: -117.254,
    shoreBearingDeg: 270,
    aliases: ["mission jetty", "mission beach jetty"],
  },
  {
    id: "tamarack",
    name: "Tamarack",
    region: "San Diego",
    latitude: 33.158,
    longitude: -117.352,
    shoreBearingDeg: 270,
    aliases: ["tamarack beach", "carlsbad tamarack", "carlsbad village"],
  },
  {
    id: "oceanside",
    name: "Oceanside Pier",
    region: "San Diego",
    latitude: 33.196,
    longitude: -117.386,
    shoreBearingDeg: 270,
    aliases: ["oceanside", "oceanside pier", "oside pier"],
  },
  {
    id: "the-rock",
    name: "The Rock",
    region: "San Diego",
    latitude: 33.188,
    longitude: -117.382,
    shoreBearingDeg: 270,
    aliases: ["the rock", "rock oceanside"],
  },
  {
    id: "oceanside-harbor",
    name: "Oceanside Harbor",
    region: "San Diego",
    latitude: 33.205,
    longitude: -117.395,
    shoreBearingDeg: 270,
    aliases: ["oceanside harbor", "oside harbor"],
  },
  {
    id: "terramar",
    name: "Terramar",
    region: "San Diego",
    latitude: 33.145,
    longitude: -117.348,
    shoreBearingDeg: 270,
    aliases: ["terramar point"],
  },
  {
    id: "ponto-jetty",
    name: "Ponto Jetty",
    region: "San Diego",
    latitude: 33.128,
    longitude: -117.34,
    shoreBearingDeg: 270,
    aliases: ["ponto", "ponto jetty", "south ponto"],
  },
  {
    id: "swamis",
    name: "Swami's",
    region: "San Diego",
    latitude: 33.034,
    longitude: -117.292,
    shoreBearingDeg: 270,
    aliases: ["swamis", "encinitas"],
  },
  {
    id: "cardiff",
    name: "Cardiff Reef",
    region: "San Diego",
    latitude: 33.01,
    longitude: -117.279,
    shoreBearingDeg: 270,
    aliases: ["cardiff", "cardiff reef"],
  },
  {
    id: "seaside-reef",
    name: "Seaside Reef",
    region: "San Diego",
    latitude: 33.02,
    longitude: -117.285,
    shoreBearingDeg: 270,
    aliases: ["seaside", "seaside reef"],
  },
  {
    id: "del-mar",
    name: "Del Mar",
    region: "San Diego",
    latitude: 32.962,
    longitude: -117.265,
    shoreBearingDeg: 270,
    aliases: ["del mar"],
  },
  {
    id: "blacks-beach",
    name: "Black's Beach",
    region: "San Diego",
    latitude: 32.884,
    longitude: -117.257,
    shoreBearingDeg: 270,
    aliases: [
      "blacks",
      "black's",
      "blacks beach",
      "black's beach",
      "la jolla shores",
    ],
  },
  {
    id: "windansea",
    name: "Windansea",
    region: "San Diego",
    latitude: 32.833,
    longitude: -117.281,
    shoreBearingDeg: 270,
    aliases: ["windan sea", "wind and sea", "la jolla"],
  },
  {
    id: "pacific-beach",
    name: "Pacific Beach",
    region: "San Diego",
    latitude: 32.857,
    longitude: -117.257,
    shoreBearingDeg: 270,
    aliases: ["pb", "pacific beach"],
  },
  {
    id: "ocean-beach",
    name: "Ocean Beach",
    region: "San Diego",
    latitude: 32.749,
    longitude: -117.251,
    shoreBearingDeg: 270,
    aliases: ["ob", "ocean beach sd"],
  },
];

export function getSpotById(id: string): SurfSpot | undefined {
  return SOCAL_SPOTS.find((spot) => spot.id === id);
}

export function matchSpotInMessage(message: string): SurfSpot | null {
  const lower = normalizeSpotText(message);

  if (
    /\b(?:socal|so-cal|southern california|all beaches|everywhere)\b/i.test(
      lower
    )
  ) {
    return null;
  }

  const ranked = [...SOCAL_SPOTS].sort(
    (a, b) => b.name.length - a.name.length
  );

  for (const spot of ranked) {
    if (lower.includes(normalizeSpotText(spot.name))) return spot;
    if (
      spot.aliases?.some((alias) => lower.includes(normalizeSpotText(alias)))
    ) {
      return spot;
    }
  }

  const knowledgeSpot = findSpotKnowledge(message);
  if (knowledgeSpot) {
    const fromCatalog = SOCAL_SPOTS.find((s) => s.id === knowledgeSpot.id);
    if (fromCatalog) return fromCatalog;
  }

  return null;
}

/** Normalize curly apostrophes so "Black’s" matches "Black's". */
function normalizeSpotText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[\u2018\u2019\u02BC\u2032`]/g, "'");
}

export function isRegionalQuestion(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    /\b(?:socal|so-cal|southern california)\b/i.test(lower) ||
    /\bwhere(?:'s| is) (?:the )?best\b/i.test(lower) ||
    /\b(?:best spot|where should i surf|which beach|compare beaches|all beaches)\b/i.test(
      lower
    ) ||
    /\b(?:north|south)\b.*\b(?:county|oc|la)\b/i.test(lower)
  );
}
