/**
 * API Annuaire government office ingestion.
 * Fetches from the OpenDataSoft API, inserts structured data into
 * government_offices table, and creates text chunks for vector search.
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
config();
import { getSupabase } from '@/lib/supabase/client';
import { type DocumentChunk, type IngestStats, RATE_LIMITS, sleep, log } from './config';
import { ingestChunks } from './embed-chunks';

const TAG = 'annuaire';

// ============================================================
// API configuration
// ============================================================

const API_BASE =
  'https://api-lannuaire.service-public.fr/api/explore/v2.1/catalog/datasets/api-lannuaire-administration/records';

/**
 * Office types relevant to immigration / expat life.
 * The API stores type inside `pivot` JSON field — we use `pivot LIKE "xxx"`.
 * mairie excluded (35K+ records, not expat-relevant enough for P1).
 */
const TARGET_OFFICE_TYPES = [
  'prefecture',
  'sous_pref',       // sous-préfecture
  'caf',
  'cpam',
  'ofii',
  'france_travail',
  'sip',             // Service des impôts des particuliers
] as const;

/** Friendly names for display */
const TYPE_LABELS: Record<string, string> = {
  prefecture: 'Préfecture',
  sous_pref: 'Sous-préfecture',
  caf: 'CAF',
  cpam: 'CPAM',
  ofii: 'OFII',
  france_travail: 'France Travail',
  sip: 'Service des impôts des particuliers',
};

// ============================================================
// Raw API response types (actual OpenDataSoft structure)
// ============================================================

interface AnnuaireRecord {
  id: string;
  nom: string;
  pivot?: string;           // JSON string: [{"type_service_local": "...", "code_insee_commune": [...]}]
  adresse?: string;         // JSON string: [{"type_adresse": "Adresse", "numero_voie": "...", "code_postal": "...", "nom_commune": "...", "longitude": "...", "latitude": "..."}]
  telephone?: string;       // JSON string: [{"valeur": "...", "description": "..."}]
  adresse_courriel?: string;
  site_internet?: string;   // JSON string: [{"valeur": "...", "libelle": "..."}]
  plage_ouverture?: string; // JSON string: [{"nom_jour_debut": "...", ...}]
  mission?: string;
  formulaire_contact?: string;
  code_insee_commune?: string;
  ancien_code_pivot?: string;
  [key: string]: unknown;
}

interface ApiResponse {
  total_count: number;
  results: AnnuaireRecord[];
}

// ============================================================
// Government office DB type
// ============================================================

interface GovernmentOffice {
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
  metadata: Record<string, unknown>;
  source_id: string;
}

// ============================================================
// JSON field parsers
// ============================================================

function safeParseJson<T>(raw: string | undefined | null): T[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

interface AdresseEntry {
  type_adresse?: string;
  numero_voie?: string;
  complement1?: string;
  complement2?: string;
  service_distribution?: string;
  code_postal?: string;
  nom_commune?: string;
  longitude?: string;
  latitude?: string;
}

interface TelephoneEntry {
  valeur?: string;
  description?: string;
}

interface SiteEntry {
  valeur?: string;
  libelle?: string;
}

interface PivotEntry {
  type_service_local?: string;
  code_insee_commune?: string[];
}

interface PlageOuvertureEntry {
  nom_jour_debut?: string;
  nom_jour_fin?: string;
  valeur_heure_debut_1?: string;
  valeur_heure_fin_1?: string;
  valeur_heure_debut_2?: string;
  valeur_heure_fin_2?: string;
  commentaire?: string;
}

// ============================================================
// API fetching
// ============================================================

async function fetchRecords(
  officeType: string,
  offset: number,
  limit: number,
): Promise<ApiResponse> {
  const params = new URLSearchParams({
    where: `pivot LIKE "${officeType}"`,
    limit: String(limit),
    offset: String(offset),
  });

  const url = `${API_BASE}?${params}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'AccueilAI-Ingest/1.0 (bot; +https://accueilai.com)',
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<ApiResponse>;
}

// ============================================================
// Record processing
// ============================================================

function parseAddress(record: AnnuaireRecord): {
  address: string | null;
  city: string | null;
  postalCode: string | null;
  lat: number | null;
  lng: number | null;
} {
  const entries = safeParseJson<AdresseEntry>(record.adresse);
  // Prefer the physical address over postal address
  const addr = entries.find((e) => e.type_adresse === 'Adresse') ?? entries[0];
  if (!addr) return { address: null, city: null, postalCode: null, lat: null, lng: null };

  return {
    address: addr.numero_voie || null,
    city: addr.nom_commune || null,
    postalCode: addr.code_postal || null,
    lat: addr.latitude ? parseFloat(addr.latitude) : null,
    lng: addr.longitude ? parseFloat(addr.longitude) : null,
  };
}

function parsePhone(record: AnnuaireRecord): string | null {
  const entries = safeParseJson<TelephoneEntry>(record.telephone);
  return entries[0]?.valeur || null;
}

function parseWebsite(record: AnnuaireRecord): string | null {
  const entries = safeParseJson<SiteEntry>(record.site_internet);
  return entries[0]?.valeur || record.formulaire_contact || null;
}

function parseOpeningHours(record: AnnuaireRecord): Record<string, unknown> | null {
  const entries = safeParseJson<PlageOuvertureEntry>(record.plage_ouverture);
  if (entries.length === 0) return null;

  const hours: Record<string, string> = {};
  for (const entry of entries) {
    const dayRange =
      entry.nom_jour_debut === entry.nom_jour_fin
        ? entry.nom_jour_debut
        : `${entry.nom_jour_debut}-${entry.nom_jour_fin}`;
    if (!dayRange) continue;

    const slots: string[] = [];
    if (entry.valeur_heure_debut_1 && entry.valeur_heure_fin_1) {
      slots.push(`${entry.valeur_heure_debut_1.slice(0, 5)}-${entry.valeur_heure_fin_1.slice(0, 5)}`);
    }
    if (entry.valeur_heure_debut_2 && entry.valeur_heure_fin_2) {
      slots.push(`${entry.valeur_heure_debut_2.slice(0, 5)}-${entry.valeur_heure_fin_2.slice(0, 5)}`);
    }
    if (slots.length > 0) {
      hours[dayRange] = slots.join(', ');
    }
    if (entry.commentaire) {
      hours['note'] = entry.commentaire;
    }
  }

  return Object.keys(hours).length > 0 ? hours : null;
}

function detectOfficeType(record: AnnuaireRecord): string {
  const pivots = safeParseJson<PivotEntry>(record.pivot);
  return pivots[0]?.type_service_local ?? 'unknown';
}

function inferServices(officeType: string, mission: string | undefined): string[] {
  const services: string[] = [];
  const type = officeType.toLowerCase();

  if (type === 'prefecture' || type === 'sous_pref') {
    services.push('titre_de_sejour', 'naturalisation', 'etat_civil', 'permis_conduire');
  } else if (type === 'caf') {
    services.push('allocations_familiales', 'aide_logement', 'rsa', 'prime_activite');
  } else if (type === 'cpam') {
    services.push('assurance_maladie', 'carte_vitale', 'ameli');
  } else if (type === 'ofii') {
    services.push('integration', 'contrat_integration_republicaine', 'formation_linguistique');
  } else if (type === 'france_travail') {
    services.push('emploi', 'formation', 'indemnisation', 'accompagnement');
  } else if (type === 'sip') {
    services.push('impot_revenu', 'declaration_fiscale', 'avis_imposition');
  }

  if (mission) {
    const lower = mission.toLowerCase();
    if (lower.includes('passeport')) services.push('passeport');
    if (lower.includes('carte nationale')) services.push('carte_identite');
  }

  return [...new Set(services)];
}

function recordToOffice(record: AnnuaireRecord): GovernmentOffice {
  const officeType = detectOfficeType(record);
  const { address, city, postalCode, lat, lng } = parseAddress(record);

  return {
    name: record.nom,
    office_type: officeType,
    address,
    city,
    postal_code: postalCode,
    department: record.code_insee_commune?.slice(0, 2) ?? null,
    region: null, // not directly available as top-level field
    phone: parsePhone(record),
    email: record.adresse_courriel ?? null,
    website: parseWebsite(record),
    latitude: lat,
    longitude: lng,
    opening_hours: parseOpeningHours(record),
    services: inferServices(officeType, record.mission ?? undefined),
    metadata: {
      source_api: 'annuaire-service-public',
      fetched_at: new Date().toISOString(),
    },
    source_id: record.id,
  };
}

function officeToChunk(office: GovernmentOffice): DocumentChunk {
  const label = TYPE_LABELS[office.office_type] ?? office.office_type;
  const parts = [`${label}: ${office.name}`];

  if (office.address) parts.push(office.address);
  if (office.city && office.postal_code) {
    parts.push(`${office.postal_code} ${office.city}`);
  }
  if (office.phone) parts.push(`Tél: ${office.phone}`);
  if (office.email) parts.push(`Email: ${office.email}`);
  if (office.website) parts.push(`Site: ${office.website}`);

  if (office.opening_hours && typeof office.opening_hours === 'object') {
    const entries = Object.entries(office.opening_hours).filter(([k]) => k !== 'note');
    const hoursStr = entries.map(([day, hours]) => `${day}: ${hours}`).join(', ');
    if (hoursStr) parts.push(`Horaires: ${hoursStr}`);
    const note = (office.opening_hours as Record<string, string>)['note'];
    if (note) parts.push(note);
  }

  if (office.services.length > 0) {
    parts.push(`Services: ${office.services.join(', ')}`);
  }

  return {
    content: parts.join(' — '),
    source: 'annuaire',
    doc_type: 'office_info',
    language: 'fr',
    source_url: office.website,
    last_modified: new Date().toISOString(),
    metadata: {
      office_type: office.office_type,
      city: office.city,
      department: office.department,
      source_id: office.source_id,
    },
  };
}

// ============================================================
// Database insertion
// ============================================================

async function insertOffices(offices: GovernmentOffice[]): Promise<number> {
  const supabase = getSupabase();
  let inserted = 0;
  const batchSize = 500;

  for (let i = 0; i < offices.length; i += batchSize) {
    const batch = offices.slice(i, i + batchSize);

    const { error } = await supabase.from('government_offices').insert(
      batch.map((o) => ({
        ...o,
        updated_at: new Date().toISOString(),
      })),
    );

    if (error) {
      log(TAG, `Error inserting offices batch at ${i}: ${error.message}`);
    } else {
      inserted += batch.length;
    }

    log(TAG, `Inserted ${inserted}/${offices.length} offices`);
    await sleep(RATE_LIMITS.insertDelayMs);
  }

  return inserted;
}

// ============================================================
// Main pipeline
// ============================================================

export async function ingestAnnuaire(): Promise<IngestStats> {
  const startTime = Date.now();
  log(TAG, 'Starting Annuaire government office ingestion');

  const allOffices: GovernmentOffice[] = [];
  const pageSize = 100;

  for (const officeType of TARGET_OFFICE_TYPES) {
    log(TAG, `Fetching ${officeType} offices...`);
    let offset = 0;
    let total = 0;

    try {
      const firstPage = await fetchRecords(officeType, 0, pageSize);
      total = firstPage.total_count;
      log(TAG, `Found ${total} ${officeType} offices`);

      for (const record of firstPage.results) {
        allOffices.push(recordToOffice(record));
      }
      offset += pageSize;

      while (offset < total) {
        const page = await fetchRecords(officeType, offset, pageSize);
        for (const record of page.results) {
          allOffices.push(recordToOffice(record));
        }
        offset += pageSize;
        log(TAG, `Fetched ${Math.min(offset, total)}/${total} ${officeType} offices`);
        await sleep(RATE_LIMITS.crawlDelayMs);
      }
    } catch (err) {
      log(TAG, `Error fetching ${officeType}: ${err}`);
    }

    await sleep(RATE_LIMITS.crawlDelayMs);
  }

  log(TAG, `Total offices fetched: ${allOffices.length}`);

  // Insert into government_offices table
  const officesInserted = await insertOffices(allOffices);
  log(TAG, `Inserted ${officesInserted} offices into government_offices`);

  // Create text chunks for vector search
  const chunks = allOffices.map(officeToChunk);
  log(TAG, `Created ${chunks.length} text chunks for vector search`);

  const stats = await ingestChunks(chunks);

  return {
    ...stats,
    source: 'annuaire',
    durationMs: Date.now() - startTime,
  };
}

// ============================================================
// Direct execution
// ============================================================

if (process.argv[1]?.includes('annuaire')) {
  ingestAnnuaire()
    .then((stats) => {
      log(TAG, `Completed: ${JSON.stringify(stats)}`);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Annuaire ingestion failed:', err);
      process.exit(1);
    });
}
