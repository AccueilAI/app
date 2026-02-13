/**
 * france-visas.gouv.fr crawler.
 * Crawls visa information pages and ingests into Supabase.
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
config();
import { type DocumentChunk, type IngestStats, RATE_LIMITS, sleep, log } from '../ingest/config';
import { ingestChunks } from '../ingest/embed-chunks';
import { parseHtmlToChunks } from './parser';

const TAG = 'france-visas';

// ============================================================
// Configuration
// ============================================================

const BASE_URL = 'https://france-visas.gouv.fr';

/** Seed URLs covering visa types, procedures, documents, and fees */
const SEED_URLS = [
  // Main informational pages
  `${BASE_URL}/en/web/france-visas/welcome-page`,
  `${BASE_URL}/en/web/france-visas/visa-wizard`,

  // Short-stay visas (Schengen)
  `${BASE_URL}/en/web/france-visas/short-stay-visa`,
  `${BASE_URL}/en/web/france-visas/transit-visa`,

  // Long-stay visas
  `${BASE_URL}/en/web/france-visas/long-stay-visa`,
  `${BASE_URL}/en/web/france-visas/long-stay-student`,
  `${BASE_URL}/en/web/france-visas/long-stay-equivalent-to-residence-permit`,

  // Specific visa types
  `${BASE_URL}/en/web/france-visas/talent-passport`,
  `${BASE_URL}/en/web/france-visas/intra-company-transfer`,
  `${BASE_URL}/en/web/france-visas/family-reunification`,
  `${BASE_URL}/en/web/france-visas/spouse-of-french-national`,

  // Procedures
  `${BASE_URL}/en/web/france-visas/how-to-apply`,
  `${BASE_URL}/en/web/france-visas/required-documents`,
  `${BASE_URL}/en/web/france-visas/fees`,
  `${BASE_URL}/en/web/france-visas/processing-time`,
  `${BASE_URL}/en/web/france-visas/track-your-application`,

  // FAQ and practical info
  `${BASE_URL}/en/web/france-visas/faq`,
  `${BASE_URL}/en/web/france-visas/visa-application-centres`,

  // French versions for comprehensive coverage
  `${BASE_URL}/fr/web/france-visas/accueil`,
  `${BASE_URL}/fr/web/france-visas/visa-court-sejour`,
  `${BASE_URL}/fr/web/france-visas/visa-long-sejour`,
  `${BASE_URL}/fr/web/france-visas/visa-long-sejour-etudiant`,
  `${BASE_URL}/fr/web/france-visas/passeport-talent`,
  `${BASE_URL}/fr/web/france-visas/transfert-intragroupe`,
  `${BASE_URL}/fr/web/france-visas/regroupement-familial`,
  `${BASE_URL}/fr/web/france-visas/conjoint-francais`,
  `${BASE_URL}/fr/web/france-visas/demarche-en-ligne`,
  `${BASE_URL}/fr/web/france-visas/documents-necessaires`,
  `${BASE_URL}/fr/web/france-visas/tarifs`,
  `${BASE_URL}/fr/web/france-visas/delais-traitement`,
  `${BASE_URL}/fr/web/france-visas/suivi-demande`,
  `${BASE_URL}/fr/web/france-visas/foire-aux-questions`,
  `${BASE_URL}/fr/web/france-visas/centres-de-demande`,
];

// ============================================================
// Page fetcher
// ============================================================

async function fetchPage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'AccueilAI-Ingest/1.0 (bot; +https://accueilai.com)',
        Accept: 'text/html',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
      },
    });

    if (!response.ok) {
      log(TAG, `HTTP ${response.status} for ${url}`);
      return null;
    }

    return response.text();
  } catch (err) {
    log(TAG, `Fetch failed for ${url}: ${err}`);
    return null;
  }
}

// ============================================================
// Language detection from URL
// ============================================================

function detectLanguage(url: string): string {
  if (url.includes('/en/')) return 'en';
  return 'fr';
}

// ============================================================
// Main pipeline
// ============================================================

export async function crawlFranceVisas(): Promise<IngestStats> {
  log(TAG, 'Starting france-visas.gouv.fr crawl');

  const allChunks: DocumentChunk[] = [];
  let crawled = 0;
  let failed = 0;

  for (const url of SEED_URLS) {
    const html = await fetchPage(url);

    if (html) {
      const lang = detectLanguage(url);
      const chunks = parseHtmlToChunks(html, url, {
        source: 'france-visas',
        doc_type: 'visa_info',
        language: lang,
        metadata: { crawler: 'france-visas' },
      });

      allChunks.push(...chunks);
      crawled++;
      log(TAG, `[${crawled}/${SEED_URLS.length}] ${url} -> ${chunks.length} chunks`);
    } else {
      failed++;
    }

    // Polite delay between requests
    await sleep(RATE_LIMITS.crawlDelayMs);
  }

  log(TAG, `Crawled ${crawled} pages (${failed} failed), ${allChunks.length} total chunks`);

  return ingestChunks(allChunks);
}

// ============================================================
// Direct execution
// ============================================================

if (process.argv[1]?.includes('france-visas')) {
  crawlFranceVisas()
    .then((stats) => {
      log(TAG, `Completed: ${JSON.stringify(stats)}`);
      process.exit(0);
    })
    .catch((err) => {
      console.error('france-visas crawl failed:', err);
      process.exit(1);
    });
}
