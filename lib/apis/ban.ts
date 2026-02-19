/**
 * Base Adresse Nationale (BAN) API client for French address lookup.
 * Free, no authentication required. Rate limit: 50 req/s.
 *
 * API docs: https://adresse.data.gouv.fr/api-doc/adresse
 */

const API_BASE = 'https://api-adresse.data.gouv.fr';

// ============================================================
// Types
// ============================================================

export interface BanResult {
  label: string;
  housenumber?: string;
  street?: string;
  postcode: string;
  city: string;
  citycode: string;
  context: string;
  /** Longitude */
  x: number;
  /** Latitude */
  y: number;
  /** Relevance score (0-1) */
  score: number;
}

interface BanFeature {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: {
    label: string;
    score: number;
    housenumber?: string;
    street?: string;
    name: string;
    postcode: string;
    citycode: string;
    city: string;
    context: string;
    x: number;
    y: number;
  };
}

interface BanFeatureCollection {
  type: 'FeatureCollection';
  features: BanFeature[];
}

export interface SearchOptions {
  limit?: number;
  postcode?: string;
  citycode?: string;
  type?: 'housenumber' | 'street' | 'locality' | 'municipality';
}

// ============================================================
// Address search
// ============================================================

/**
 * Search for French addresses matching a text query.
 * Returns up to `limit` results (default 5).
 */
export async function searchAddress(
  query: string,
  options?: SearchOptions,
): Promise<BanResult[]> {
  const params = new URLSearchParams({ q: query, limit: String(options?.limit ?? 5) });
  if (options?.postcode) params.set('postcode', options.postcode);
  if (options?.citycode) params.set('citycode', options.citycode);
  if (options?.type) params.set('type', options.type);

  const response = await fetch(`${API_BASE}/search/?${params}`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'AccueilAI/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`BAN search error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as BanFeatureCollection;
  return data.features.map(toBanResult);
}

// ============================================================
// Reverse geocode
// ============================================================

/**
 * Reverse geocode coordinates to a French address.
 */
export async function reverseGeocode(
  lat: number,
  lon: number,
): Promise<BanResult | null> {
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
    throw new Error(`BAN reverse error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as BanFeatureCollection;
  if (data.features.length === 0) return null;
  return toBanResult(data.features[0]);
}

// ============================================================
// Helpers
// ============================================================

function toBanResult(feature: BanFeature): BanResult {
  const { properties } = feature;
  return {
    label: properties.label,
    housenumber: properties.housenumber,
    street: properties.street ?? properties.name,
    postcode: properties.postcode,
    city: properties.city,
    citycode: properties.citycode,
    context: properties.context,
    x: properties.x,
    y: properties.y,
    score: properties.score,
  };
}
