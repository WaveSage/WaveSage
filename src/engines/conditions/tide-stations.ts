export interface MappedTideStation {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

const SANTA_BARBARA: MappedTideStation = {
  id: "9411340",
  name: "Santa Barbara, CA",
  lat: 34.4036,
  lng: -119.6925,
};

const SANTA_MONICA: MappedTideStation = {
  id: "9410840",
  name: "Santa Monica, CA",
  lat: 34.0083,
  lng: -118.5,
};

const LOS_ANGELES: MappedTideStation = {
  id: "9410660",
  name: "Los Angeles, CA",
  lat: 33.72,
  lng: -118.272,
};

const NEWPORT: MappedTideStation = {
  id: "9410580",
  name: "Newport Bay Entrance, CA",
  lat: 33.6033,
  lng: -117.883,
};

const LA_JOLLA: MappedTideStation = {
  id: "9410230",
  name: "La Jolla (Scripps), CA",
  lat: 32.8669,
  lng: -117.2571,
};

/**
 * Preferred NOAA tide-prediction stations for SoCal spots (MLLW).
 * Keys match SOCAL_SPOTS ids exactly. Stations must return predictions
 * (subordinate-only NOAA IDs return 400).
 */
export const SPOT_TIDE_STATIONS: Record<string, MappedTideStation> = {
  ventura: SANTA_BARBARA,
  malibu: SANTA_MONICA,
  venice: SANTA_MONICA,
  manhattan: SANTA_MONICA,
  hermosa: SANTA_MONICA,
  redondo: SANTA_MONICA,
  "palos-verdes": LOS_ANGELES,
  huntington: NEWPORT,
  newport: NEWPORT,
  "salt-creek": NEWPORT,
  trestles: NEWPORT,
  "trestles-uppers": NEWPORT,
  "trestles-middles": NEWPORT,
  oceanside: LA_JOLLA,
  "oceanside-harbor": LA_JOLLA,
  "the-rock": LA_JOLLA,
  tamarack: LA_JOLLA,
  terramar: LA_JOLLA,
  "ponto-jetty": LA_JOLLA,
  beacons: LA_JOLLA,
  grandview: LA_JOLLA,
  "d-street": LA_JOLLA,
  swamis: LA_JOLLA,
  cardiff: LA_JOLLA,
  "seaside-reef": LA_JOLLA,
  "del-mar": LA_JOLLA,
  "del-mar-jetty": LA_JOLLA,
  "blacks-beach": LA_JOLLA,
  "scripps-pier": LA_JOLLA,
  windansea: LA_JOLLA,
  "pacific-beach": LA_JOLLA,
  "mission-jetty": LA_JOLLA,
  "ocean-beach": LA_JOLLA,
};
