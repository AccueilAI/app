/**
 * API Geo client for French administrative geography.
 * Free, no authentication required.
 *
 * API docs: https://geo.api.gouv.fr/decoupage-administratif
 */

const API_BASE = 'https://geo.api.gouv.fr';

// ============================================================
// Types
// ============================================================

export interface Commune {
  nom: string;
  code: string;
  codeDepartement: string;
  codeRegion: string;
  codesPostaux: string[];
  population: number;
}

export interface Department {
  nom: string;
  code: string;
  codeRegion: string;
}

export interface Region {
  nom: string;
  code: string;
}

// ============================================================
// Communes
// ============================================================

/**
 * Look up communes by postal code.
 * A single postal code can map to multiple communes.
 */
export async function getCommuneByPostcode(postcode: string): Promise<Commune[]> {
  const fields = 'nom,code,codeDepartement,codeRegion,codesPostaux,population';
  const params = new URLSearchParams({ codePostal: postcode, fields });

  const response = await fetch(`${API_BASE}/communes?${params}`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'AccueilAI/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`API Geo communes error: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as Commune[];
}

// ============================================================
// Departments
// ============================================================

/**
 * Get a department by its code (e.g. "75", "2A", "971").
 */
export async function getDepartment(code: string): Promise<Department | null> {
  const params = new URLSearchParams({ fields: 'nom,code,codeRegion' });

  const response = await fetch(
    `${API_BASE}/departements/${encodeURIComponent(code)}?${params}`,
    {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'AccueilAI/1.0',
      },
    },
  );

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`API Geo department error: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as Department;
}

// ============================================================
// Regions
// ============================================================

/**
 * Get a region by its code (e.g. "11" for Ile-de-France).
 */
export async function getRegion(code: string): Promise<Region | null> {
  const params = new URLSearchParams({ fields: 'nom,code' });

  const response = await fetch(
    `${API_BASE}/regions/${encodeURIComponent(code)}?${params}`,
    {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'AccueilAI/1.0',
      },
    },
  );

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`API Geo region error: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as Region;
}
