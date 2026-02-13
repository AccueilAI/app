/**
 * Government office search helpers.
 * Provides typed queries against the government_offices table.
 */

import { getSupabase } from '@/lib/supabase/client';

// ============================================================
// Types
// ============================================================

export interface GovernmentOffice {
  id: string;
  name: string;
  office_type: string;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  department: string | null;
  region: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  latitude: number | null;
  longitude: number | null;
  opening_hours: Record<string, unknown> | null;
  services: string[];
  metadata: Record<string, unknown> | null;
  source_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface OfficeSearchFilters {
  office_type?: string;
  department?: string;
  city?: string;
  postal_code?: string;
  region?: string;
  service?: string;
}

// ============================================================
// Search offices by text query + optional filters
// ============================================================

export async function searchOffices(
  query: string,
  filters?: OfficeSearchFilters,
  limit = 10,
): Promise<GovernmentOffice[]> {
  const supabase = getSupabase();

  let builder = supabase
    .from('government_offices')
    .select('*')
    .or(`name.ilike.%${query}%,city.ilike.%${query}%,address.ilike.%${query}%`)
    .limit(limit);

  if (filters?.office_type) {
    builder = builder.eq('office_type', filters.office_type);
  }
  if (filters?.department) {
    builder = builder.eq('department', filters.department);
  }
  if (filters?.city) {
    builder = builder.ilike('city', `%${filters.city}%`);
  }
  if (filters?.postal_code) {
    builder = builder.eq('postal_code', filters.postal_code);
  }
  if (filters?.region) {
    builder = builder.ilike('region', `%${filters.region}%`);
  }
  if (filters?.service) {
    builder = builder.contains('services', [filters.service]);
  }

  const { data, error } = await builder;

  if (error) {
    throw new Error(`Office search failed: ${error.message}`);
  }

  return (data ?? []) as GovernmentOffice[];
}

// ============================================================
// Get offices by type (with optional department filter)
// ============================================================

export async function getOfficesByType(
  type: string,
  department?: string,
  limit = 50,
): Promise<GovernmentOffice[]> {
  const supabase = getSupabase();

  let builder = supabase
    .from('government_offices')
    .select('*')
    .eq('office_type', type)
    .order('city')
    .limit(limit);

  if (department) {
    builder = builder.eq('department', department);
  }

  const { data, error } = await builder;

  if (error) {
    throw new Error(`Office type lookup failed: ${error.message}`);
  }

  return (data ?? []) as GovernmentOffice[];
}

// ============================================================
// Get nearest office by type and coordinates (geo proximity)
// ============================================================

/**
 * Finds the nearest office of a given type using the Haversine formula.
 * Since PostGIS is not assumed, we sort client-side after fetching all
 * offices of the given type. For production with >10K offices, consider
 * a PostGIS extension or bounding-box pre-filter.
 */
export async function getNearestOffice(
  type: string,
  lat: number,
  lng: number,
  limit = 5,
): Promise<(GovernmentOffice & { distance_km: number })[]> {
  const supabase = getSupabase();

  // Fetch all offices of this type that have coordinates
  const { data, error } = await supabase
    .from('government_offices')
    .select('*')
    .eq('office_type', type)
    .not('latitude', 'is', null)
    .not('longitude', 'is', null);

  if (error) {
    throw new Error(`Nearest office lookup failed: ${error.message}`);
  }

  if (!data || data.length === 0) return [];

  // Calculate Haversine distance and sort
  const withDistance = (data as GovernmentOffice[]).map((office) => ({
    ...office,
    distance_km: haversineKm(lat, lng, office.latitude!, office.longitude!),
  }));

  withDistance.sort((a, b) => a.distance_km - b.distance_km);

  return withDistance.slice(0, limit);
}

// ============================================================
// Haversine distance formula
// ============================================================

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
