/// <reference types="google.maps" />
import { haversine, type HubLocation, PRESET_HUBS, type Node } from "./network";

/**
 * Extended Bengaluru Logistics, Freight, Transport, and Tech Hubs Directory
 * Ensures instant search and reliable fallback even if network/offline
 */
export const EXTENDED_BENGALURU_HUBS: HubLocation[] = [
  ...PRESET_HUBS,
  {
    id: "manyata",
    name: "Manyata Tech Park Logistics Gate",
    lat: 13.0475,
    lng: 77.6219,
    tag: "North Tech & Delivery Node",
    address: "Outer Ring Road, Nagavara, Bengaluru",
  },
  {
    id: "bagmane",
    name: "Bagmane World Technology Center",
    lat: 12.9868,
    lng: 77.6653,
    tag: "East Distribution Gateway",
    address: "KR Puram - Marathahalli Outer Ring Road, Bengaluru",
  },
  {
    id: "devanahalli",
    name: "Devanahalli Aerospace & Hardware Park",
    lat: 13.2458,
    lng: 77.7289,
    tag: "Far-North Cargo SEZ",
    address: "KIADB Aerospace SEZ, Devanahalli, Bengaluru",
  },
  {
    id: "hoskote",
    name: "Hoskote Industrial Logistics Park",
    lat: 13.0712,
    lng: 77.7981,
    tag: "East Freight Gateway (NH-75)",
    address: "Pillagumpe Industrial Area, Hoskote, Bengaluru",
  },
  {
    id: "bidadi",
    name: "Bidadi Industrial Freight Corridor",
    lat: 12.7984,
    lng: 77.3872,
    tag: "South-West Industrial Hub (SH-17)",
    address: "KIADB Industrial Area, Bidadi, Ramanagara-Bengaluru",
  },
  {
    id: "jigani",
    name: "Jigani-Bommasandra Link Industrial Area",
    lat: 12.7842,
    lng: 77.6394,
    tag: "South Heavy Manufacturing Belt",
    address: "Jigani Industrial Area 1st Phase, Anekal, Bengaluru",
  },
  {
    id: "dabaspet",
    name: "Dabaspet Industrial Area (Sompura)",
    lat: 13.2289,
    lng: 77.2415,
    tag: "North-West Logistics Corridor (NH-48)",
    address: "Sompura Industrial Area, Nelamangala Taluk, Bengaluru",
  },
  {
    id: "silkboard",
    name: "Central Silk Board Transit Hub",
    lat: 12.9176,
    lng: 77.6238,
    tag: "South Interchange Junction",
    address: "Hosur Road - Outer Ring Road, Silk Board, Bengaluru",
  },
  {
    id: "yelahanka",
    name: "Yelahanka New Town Cargo Depot",
    lat: 13.1007,
    lng: 77.5963,
    tag: "North Rail & Road Junction",
    address: "Yelahanka Major Arterial Road, Bengaluru",
  },
  {
    id: "sarjapur",
    name: "Sarjapur Wipro Logistics Junction",
    lat: 12.9114,
    lng: 77.6875,
    tag: "South-East Suburban Hub",
    address: "Sarjapur Main Road, Doddakannelli, Bengaluru",
  },
  {
    id: "krpuram",
    name: "KR Puram Hanging Bridge Cargo Node",
    lat: 13.0035,
    lng: 77.6837,
    tag: "East Traffic Arterial",
    address: "Old Madras Road, KR Puram, Bengaluru",
  },
  {
    id: "bannerghatta",
    name: "Bannerghatta Road Logistics Depot",
    lat: 12.8712,
    lng: 77.5982,
    tag: "South Peripheral Hub",
    address: "Bannerghatta Main Road, Hulimavu, Bengaluru",
  },
];

/**
 * Searches for locations using Google Maps Geocoder if loaded,
 * with fast fuzzy matching on the comprehensive Bengaluru logistics directory.
 */
export async function searchBengaluruLocations(query: string): Promise<HubLocation[]> {
  const trimmed = query.trim();
  if (!trimmed) return PRESET_HUBS;

  // 1. Check local directory for instant instant results
  const qLower = trimmed.toLowerCase();
  const localMatches = EXTENDED_BENGALURU_HUBS.filter(
    (hub) =>
      hub.name.toLowerCase().includes(qLower) ||
      hub.tag?.toLowerCase().includes(qLower) ||
      hub.address?.toLowerCase().includes(qLower) ||
      hub.id.toLowerCase().includes(qLower),
  );

  // 2. Query Google Maps Geocoder API if available
  if (typeof window !== "undefined" && window.google?.maps?.Geocoder) {
    try {
      const geocoder = new window.google.maps.Geocoder();
      const results = await new Promise<google.maps.GeocoderResult[]>((resolve) => {
        geocoder.geocode(
          {
            address: `${trimmed}, Bengaluru, Karnataka, India`,
            bounds: {
              north: 13.35,
              south: 12.75,
              west: 77.3,
              east: 77.85,
            },
          },
          (res, status) => {
            if (status === window.google.maps.GeocoderStatus.OK && res) {
              resolve(res);
            } else {
              resolve([]);
            }
          },
        );
      });

      const googleLocations: HubLocation[] = results.slice(0, 5).map((r, idx) => {
        const lat = r.geometry.location.lat();
        const lng = r.geometry.location.lng();
        const shortName = r.formatted_address.split(",")[0] || trimmed;
        return {
          id: `gmap_${Date.now()}_${idx}`,
          name: shortName,
          lat,
          lng,
          tag: "Google Maps Verified Place",
          address: r.formatted_address,
          isCustom: true,
        };
      });

      // Merge and deduplicate by distance
      const merged = [...localMatches];
      for (const gLoc of googleLocations) {
        const exists = merged.some(
          (m) =>
            haversine(
              { id: "a", name: "a", lat: m.lat, lng: m.lng, demand: 0 },
              { id: "b", name: "b", lat: gLoc.lat, lng: gLoc.lng, demand: 0 },
            ) < 0.3,
        );
        if (!exists) merged.push(gLoc);
      }
      return merged.slice(0, 10);
    } catch {
      // Fallback gracefully to local matches
      return localMatches;
    }
  }

  return localMatches;
}

/**
 * Reverse-geocodes coordinates into a readable HubLocation using Google Maps Geocoder API.
 */
export async function reverseGeocodeLocation(lat: number, lng: number): Promise<HubLocation> {
  const defaultFallback: HubLocation = {
    id: `custom_${lat.toFixed(4)}_${lng.toFixed(4)}`,
    name: `Custom Hub (${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E)`,
    lat,
    lng,
    tag: "Custom Map Pin",
    address: `Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}, Bengaluru`,
    isCustom: true,
  };

  if (typeof window !== "undefined" && window.google?.maps?.Geocoder) {
    try {
      const geocoder = new window.google.maps.Geocoder();
      const results = await new Promise<google.maps.GeocoderResult[]>((resolve) => {
        geocoder.geocode({ location: { lat, lng } }, (res, status) => {
          if (status === window.google.maps.GeocoderStatus.OK && res?.[0]) {
            resolve(res);
          } else {
            resolve([]);
          }
        });
      });

      if (results[0]) {
        const addr = results[0].formatted_address;
        const placeName = addr.split(",")[0] || `Hub near ${lat.toFixed(4)}°N`;
        return {
          id: `pin_${Date.now()}`,
          name: placeName,
          lat,
          lng,
          tag: "Selected on Live Map",
          address: addr,
          isCustom: true,
        };
      }
    } catch {
      return defaultFallback;
    }
  }

  // Check if it's close to any known hub
  for (const hub of EXTENDED_BENGALURU_HUBS) {
    const d = haversine(
      { id: "a", name: "a", lat: hub.lat, lng: hub.lng, demand: 0 },
      { id: "b", name: "b", lat, lng, demand: 0 },
    );
    if (d < 0.6) {
      return {
        ...hub,
        id: `near_${hub.id}`,
        name: `Near ${hub.name}`,
        lat,
        lng,
        isCustom: true,
      };
    }
  }

  return defaultFallback;
}
