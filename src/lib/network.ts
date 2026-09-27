export type Node = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  demand: number;
};

export const DEPOT: Node = {
  id: "D0",
  name: "Peenya Depot",
  lat: 13.0287,
  lng: 77.5199,
  demand: 0,
};

export const STOPS: Node[] = [
  { id: "S1", name: "Yeshwanthpur", lat: 13.0234, lng: 77.55, demand: 4 },
  { id: "S2", name: "Hebbal", lat: 13.0358, lng: 77.597, demand: 6 },
  { id: "S3", name: "KR Puram", lat: 13.008, lng: 77.696, demand: 5 },
  { id: "S4", name: "Whitefield", lat: 12.9698, lng: 77.75, demand: 8 },
  { id: "S5", name: "Marathahalli", lat: 12.9591, lng: 77.6974, demand: 6 },
  { id: "S6", name: "Indiranagar", lat: 12.9784, lng: 77.6408, demand: 3 },
  { id: "S7", name: "MG Road", lat: 12.975, lng: 77.606, demand: 4 },
  { id: "S8", name: "Majestic", lat: 12.9767, lng: 77.5713, demand: 7 },
  { id: "S9", name: "Koramangala", lat: 12.9352, lng: 77.6245, demand: 5 },
  { id: "S10", name: "Jayanagar", lat: 12.925, lng: 77.5938, demand: 4 },
  { id: "S11", name: "Banashankari", lat: 12.925, lng: 77.5667, demand: 5 },
  { id: "S12", name: "Electronic City", lat: 12.8452, lng: 77.6602, demand: 9 },
  { id: "S13", name: "HSR Layout", lat: 12.9121, lng: 77.6446, demand: 5 },
  { id: "S14", name: "BTM Layout", lat: 12.9166, lng: 77.6101, demand: 4 },
  { id: "S15", name: "Bellandur", lat: 12.9304, lng: 77.6784, demand: 6 },
  { id: "S16", name: "Domlur", lat: 12.9609, lng: 77.6387, demand: 3 },
  { id: "S17", name: "Rajajinagar", lat: 12.9917, lng: 77.5522, demand: 4 },
  { id: "S18", name: "Malleshwaram", lat: 13.0035, lng: 77.5647, demand: 4 },
  { id: "S19", name: "RT Nagar", lat: 13.0207, lng: 77.5936, demand: 3 },
  { id: "S20", name: "Kalyan Nagar", lat: 13.0248, lng: 77.6403, demand: 5 },
  { id: "S21", name: "Bommanahalli", lat: 12.8993, lng: 77.6197, demand: 6 },
  { id: "S22", name: "Kengeri", lat: 12.9166, lng: 77.4826, demand: 7 },
  { id: "S23", name: "Vijayanagar", lat: 12.9719, lng: 77.5308, demand: 4 },
  { id: "S24", name: "JP Nagar", lat: 12.9063, lng: 77.5857, demand: 5 },
];

export const ALL_NODES = [DEPOT, ...STOPS];

export type HubLocation = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  tag?: string;
  address?: string;
  isCustom?: boolean;
};

export type NetworkConfig = {
  pickupHub: HubLocation;
  destinationHub: HubLocation;
  isRoundTrip: boolean;
};

export const PRESET_HUBS: HubLocation[] = [
  {
    id: "peenya",
    name: "Peenya Industrial Depot",
    lat: 13.0287,
    lng: 77.5199,
    tag: "North-West Logistics Hub",
    address: "Peenya Industrial Area Phase 1, Bengaluru",
  },
  {
    id: "nelamangala",
    name: "Nelamangala Highway Logistics Park",
    lat: 13.0991,
    lng: 77.3934,
    tag: "NH-48 Freight Corridor",
    address: "Tumkur Road, Nelamangala Hub, Bengaluru",
  },
  {
    id: "airport",
    name: "Kempegowda Int'l Airport (BLR Cargo)",
    lat: 13.1986,
    lng: 77.7066,
    tag: "North Air Cargo Terminal",
    address: "Cargo Village, Devanahalli, Bengaluru",
  },
  {
    id: "whitefield",
    name: "Whitefield Freight & Distribution Center",
    lat: 12.9698,
    lng: 77.75,
    tag: "East Container Depot (ICD)",
    address: "ITPL Main Rd, Whitefield, Bengaluru",
  },
  {
    id: "ecity",
    name: "Electronic City South Terminal",
    lat: 12.8452,
    lng: 77.6602,
    tag: "South Express Hub",
    address: "Hosur Road, Electronic City Phase 1, Bengaluru",
  },
  {
    id: "majestic",
    name: "Majestic Central Intermodal Depot",
    lat: 12.9767,
    lng: 77.5713,
    tag: "City Core Railway Freight",
    address: "Subhash Nagar, KSR Central, Bengaluru",
  },
  {
    id: "yeshwanthpur",
    name: "Yeshwanthpur Rail Freight Yard",
    lat: 13.0234,
    lng: 77.55,
    tag: "Rail Freight Terminal",
    address: "Yeshwanthpur Industrial Suburb, Bengaluru",
  },
  {
    id: "bommasandra",
    name: "Bommasandra Industrial Logistics Park",
    lat: 12.8167,
    lng: 77.6917,
    tag: "South-East Industrial Hub",
    address: "Bommasandra Industrial Area, Bengaluru",
  },
  {
    id: "kengeri",
    name: "Kengeri Mysore Road Terminal",
    lat: 12.9166,
    lng: 77.4826,
    tag: "West Gateway Hub",
    address: "Mysore Road, Kengeri Satellite Town, Bengaluru",
  },
];

export const DEFAULT_NETWORK_CONFIG: NetworkConfig = {
  pickupHub: PRESET_HUBS[0]!, // Peenya
  destinationHub: PRESET_HUBS[0]!, // Peenya
  isRoundTrip: true,
};

export function getActiveNodes(config: NetworkConfig = DEFAULT_NETWORK_CONFIG): Node[] {
  const pickupNode: Node = {
    id: "D0",
    name: config.pickupHub.name,
    lat: config.pickupHub.lat,
    lng: config.pickupHub.lng,
    demand: 0,
  };

  if (config.isRoundTrip || config.pickupHub.id === config.destinationHub.id) {
    return [pickupNode, ...STOPS];
  }

  const destNode: Node = {
    id: "DEST0",
    name: config.destinationHub.name,
    lat: config.destinationHub.lat,
    lng: config.destinationHub.lng,
    demand: 0,
  };

  return [pickupNode, ...STOPS, destNode];
}

export function getDestNodeIndex(config: NetworkConfig = DEFAULT_NETWORK_CONFIG): number {
  if (config.isRoundTrip || config.pickupHub.id === config.destinationHub.id) {
    return 0; // returns to pickup depot
  }
  return STOPS.length + 1; // 25 (the appended destination node)
}

export type Scenario = { accident: boolean; closure: boolean };

const R = 6371;

export function haversine(a: Node, b: Node): number {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Deterministic pseudo-random congestion factor per edge (1.0 – 2.1)
function edgeCongestion(i: number, j: number): number {
  const seed = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453;
  return 1 + Math.abs(seed - Math.floor(seed)) * 1.1;
}

export type Matrices = {
  dist: number[][];
  congestion: number[][];
};

export function buildMatrices(scenario: Scenario, customNodes?: Node[]): Matrices {
  const nodes = customNodes ?? ALL_NODES;
  const n = nodes.length;
  const dist: number[][] = [];
  const congestion: number[][] = [];
  for (let i = 0; i < n; i++) {
    dist[i] = [];
    congestion[i] = [];
    for (let j = 0; j < n; j++) {
      const d = i === j ? 0 : haversine(nodes[i]!, nodes[j]!) * 1.32;
      dist[i]![j] = d;
      let c = edgeCongestion(Math.min(i, j), Math.max(i, j));
      // Accident on the Marathahalli (5) – Whitefield (4) corridor
      if (scenario.accident && [4, 5].includes(i) && [4, 5].includes(j)) c *= 2.4;
      // Closure of the MG Road (7) links
      if (scenario.closure && (i === 7 || j === 7)) c *= 3.1;
      congestion[i]![j] = c;
    }
  }
  return { dist, congestion };
}
