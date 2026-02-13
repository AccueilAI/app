/**
 * API Adresse (IGN/BAN) client.
 * French national address database — free, no authentication required.
 * Used at query time to geocode addresses and resolve jurisdictions.
 *
 * API docs: https://adresse.data.gouv.fr/api-doc/adresse
 */

const API_BASE = 'https://api-adresse.data.gouv.fr';

// ============================================================
// Types
// ============================================================

export interface GeocodedAddress {
  /** Full formatted label */
  label: string;
  /** House number */
  housenumber?: string;
  /** Street name */
  street?: string;
  /** Postal code */
  postcode: string;
  /** City name */
  city: string;
  /** INSEE commune code (5 digits) */
  citycode: string;
  /** Département code (2-3 digits) */
  department: string;
  /** Région name */
  region?: string;
  /** Longitude */
  longitude: number;
  /** Latitude */
  latitude: number;
  /** Relevance score (0-1) */
  score: number;
}

interface ApiFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  properties: {
    label: string;
    score: number;
    housenumber?: string;
    id: string;
    type: string;
    name: string;
    postcode: string;
    citycode: string;
    x: number;
    y: number;
    city: string;
    district?: string;
    context: string; // "75, Paris, Île-de-France"
    importance: number;
    street?: string;
  };
}

interface ApiResponse {
  type: 'FeatureCollection';
  version: string;
  features: ApiFeature[];
  attribution: string;
  licence: string;
  query: string;
  limit: number;
}

// ============================================================
// Geocode: address text → coordinates + jurisdiction
// ============================================================

/**
 * Geocode a French address string.
 * Returns the top match with coordinates and administrative codes.
 */
export async function geocode(
  query: string,
  options?: { limit?: number; postcode?: string; citycode?: string },
): Promise<GeocodedAddress[]> {
  const params = new URLSearchParams({ q: query });
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.postcode) params.set('postcode', options.postcode);
  if (options?.citycode) params.set('citycode', options.citycode);

  const response = await fetch(`${API_BASE}/search/?${params}`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'AccueilAI/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`API Adresse error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as ApiResponse;
  return data.features.map(featureToAddress);
}

// ============================================================
// Reverse geocode: coordinates → address + jurisdiction
// ============================================================

/**
 * Reverse geocode coordinates to a French address.
 */
export async function reverseGeocode(
  lat: number,
  lon: number,
): Promise<GeocodedAddress | null> {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
  });

  const response = await fetch(`${API_BASE}/reverse/?${params}`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'AccueilAI/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`API Adresse reverse error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as ApiResponse;
  if (data.features.length === 0) return null;
  return featureToAddress(data.features[0]);
}

// ============================================================
// Helpers
// ============================================================

function featureToAddress(feature: ApiFeature): GeocodedAddress {
  const { properties, geometry } = feature;
  const contextParts = properties.context.split(', ');

  return {
    label: properties.label,
    housenumber: properties.housenumber,
    street: properties.street ?? properties.name,
    postcode: properties.postcode,
    city: properties.city,
    citycode: properties.citycode,
    department: contextParts[0] ?? properties.citycode.slice(0, 2),
    region: contextParts[2],
    longitude: geometry.coordinates[0],
    latitude: geometry.coordinates[1],
    score: properties.score,
  };
}

/**
 * Extract département code from a commune code or postal code.
 */
export function getDepartment(codeOrPostal: string): string {
  // DOM-TOM: 97X or 98X
  if (codeOrPostal.startsWith('97') || codeOrPostal.startsWith('98')) {
    return codeOrPostal.slice(0, 3);
  }
  // Corse: 2A or 2B
  if (codeOrPostal.startsWith('20')) {
    const num = parseInt(codeOrPostal.slice(0, 5), 10);
    return num < 20200 ? '2A' : '2B';
  }
  return codeOrPostal.slice(0, 2);
}
