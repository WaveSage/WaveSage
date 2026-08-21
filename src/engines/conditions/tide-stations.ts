export interface MappedTideStation {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

/**
 * Preferred NOAA tideprediction stations for SoCal spots (MLLW).
 * IDs must be harmonic/reference stations that return predictions
 * (subordinate-only IDs like the old Oceanside 9410573 return 400).
 */
export const SPOT_TIDE_STATIONS: Record<string, MappedTideStation> = {
  // Ventura / Santa Barbara area
  ventura: {
    id: "9411340",
    name: "Santa Barbara, CA",
    lat: 34.4036,
    lng: -119.6925,
  },

  // LA / South Bay → Santa Monica
  malibu: {
    id: "9410840",
    name: "Santa Monica, CA",
    lat: 34.0083,
    lng: -118.5,
  },
  venice: {
    id: "9410840",
    name: "Santa Monica, CA",
    lat: 34.0083,
    lng: -118.5,
  },
  manhattan: {
    id: "9410840",
    name: "Santa Monica, CA",
    lat: 34.0083,
    lng: -118.5,
  },
  hermosa: {
    id: "9410840",
    name: "Santa Monica, CA",
    lat: 34.0083,
    lng: -118.5,
  },
  redondo: {
    id: "9410840",
    name: "Santa Monica, CA",
    lat: 34.0083,
    lng: -118.5,
  },

  // PV / Long Beach → Los Angeles (outer harbor)
  "palos-verdes": {
    id: "9410660",
    name: "Los Angeles, CA",
    lat: 33.72,
    lng: -118.272,
  },

  // Orange County → Newport Bay Entrance
  huntington: {
    id: "9410580",
    name: "Newport Bay Entrance, CA",
    lat: 33.6033,
    lng: -117.883,
  },
  newport: {
    id: "9410580",
    name: "Newport Bay Entrance, CA",
    lat: 33.6033,
    lng: -117.883,
  },
  "salt-creek": {
    id: "9410580",
    name: "Newport Bay Entrance, CA",
    lat: 33.6033,
    lng: -117.883,
  },
  trestles: {
    id: "9410580",
    name: "Newport Bay Entrance, CA",
    lat: 33.6033,
    lng: -117.883,
  },
  "trestles-uppers": {
    id: "9410580",
    name: "Newport Bay Entrance, CA",
    lat: 33.6033,
    lng: -117.883,
  },
  "trestles-middles": {
    id: "9410580",
    name: "Newport Bay Entrance, CA",
    lat: 33.6033,
    lng: -117.883,
  },

  // North County / San Diego beaches → La Jolla (Scripps) — closest
  // working harmonic station (no Oceanside prediction station exists).
  oceanside: {
    id: "9410230",
    name: "La Jolla (Scripps), CA",
    lat: 32.8669,
    lng: -117.2571,
  },
  "oceanside-harbor": {
    id: "9410230",
    name: "La Jolla (Scripps), CA",
    lat: 32.8669,
    lng: -117.2571,
  },
  "the-rock": {
    id: "9410230",
    name: "La Jolla (Scripps), CA",
    lat: 32.8669,
    lng: -117.2571,
  },
  tamarack: {
    id: "9410230",
    name: "La Jolla (Scripps), CA",
    lat: 32.8669,
    lng: -117.2571,
  },
  terramar: {
    id: "9410230",
    name: "La Jolla (Scripps), CA",
    lat: 32.8669,
    lng: -117.2571,
  },
  "ponto-jetty": {
    id: "9410230",
    name: "La Jolla (Scripps), CA",
    lat: 32.8669,
    lng: -117.2571,
  },
  beacons: {
    id: "9410230",
    name: "La Jolla (Scripps), CA",
    lat: 32.8669,
    lng: -117.2571,
  },
  grandview: {
    id: "9410230",
    name: "La Jolla (Scripps), CA",
    lat: 32.8669,
    lng: -117.2571,
  },
  "d-street": {
    id: "9410230",
    name: "La Jolla (Scripps), CA",
    lat: 32.8669,
    lng: -117.2571,
  },
  swamis: {
    id: "9410230",
    name: "La Jolla (Scripps), CA",
    lat: 32.8669,
    lng: -117.2571,
  },
  cardiff: {
    id: "9410230",
    name: "La Jolla (Scripps), CA",
    lat: 32.8669,
    lng: -117.2571,
  },
  "seaside-reef": {
    id: "9410230",
    name: "La Jolla (Scripps), CA",
    lat: 32.8669,
    lng: -117.2571,
  },
  "del-mar": {
    id: "9410230",
    name: "La Jolla (Scripps), CA",
    lat: 32.8669,
    lng: -117.2571,
  },
  "del-mar-jetty": {
    id: "9410230",
    name: "La Jolla (Scripps), CA",
    lat: 32.8669,
    lng: -117.2571,
  },
  "blacks-beach": {
    id: "9410230",
    name: "La Jolla (Scripps), CA",
    lat: 32.8669,
    lng: -117.2571,
  },
  "scripps-pier": {
    id: "9410230",
    name: "La Jolla (Scripps), CA",
    lat: 32.8669,
    lng: -117.2571,
  },
  windansea: {
    id: "9410230",
    name: "La Jolla (Scripps), CA",
    lat: 32.8669,
    lng: -117.2571,
  },
  "pacific-beach": {
    id: "9410230",
    name: "La Jolla (Scripps), CA",
    lat: 32.8669,
    lng: -117.2571,
  },
  "mission-jetty": {
    id: "9410230",
    name: "La Jolla (Scripps), CA",
    lat: 32.8669,
    lng: -117.2571,
  },
  "ocean-beach": {
    id: "9410230",
    name: "La Jolla (Scripps), CA",
    lat: 32.8669,
    lng: -117.2571,
  },
};
