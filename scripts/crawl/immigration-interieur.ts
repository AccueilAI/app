/**
 * immigration.interieur.gouv.fr crawler.
 * Crawls immigration-specific pages (visa, titre de séjour, naturalisation, ANEF)
 * and ingests into Supabase.
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
config();
import * as cheerio from 'cheerio';
import { type DocumentChunk, type IngestStats, RATE_LIMITS, sleep, log } from '../ingest/config';
import { ingestChunks } from '../ingest/embed-chunks';
import { parseHtmlToChunks } from './parser';

const TAG = 'immigration-interieur';

// ============================================================
// Configuration
// ============================================================

const BASE_URL = 'https://www.immigration.interieur.gouv.fr';

/** Seed URLs covering key immigration topics */
const SEED_URLS = [
  // Main sections
  `${BASE_URL}/fr/immigration/immigration-professionnelle`,
  `${BASE_URL}/fr/immigration/immigration-familiale`,
  `${BASE_URL}/fr/immigration/les-visas`,
  `${BASE_URL}/fr/immigration/les-titres-de-sejour`,
  `${BASE_URL}/fr/immigration/etudiants-et-chercheurs`,
  `${BASE_URL}/fr/immigration/asile-et-refugies`,

  // Titre de séjour specifics
  `${BASE_URL}/fr/titres-de-sejour/carte-de-sejour-temporaire`,
  `${BASE_URL}/fr/titres-de-sejour/carte-de-sejour-pluriannuelle`,
  `${BASE_URL}/fr/titres-de-sejour/carte-de-resident`,
  `${BASE_URL}/fr/titres-de-sejour/passeport-talent`,
  `${BASE_URL}/fr/titres-de-sejour/vie-privee-et-familiale`,
  `${BASE_URL}/fr/titres-de-sejour/salarie`,
  `${BASE_URL}/fr/titres-de-sejour/travailleur-temporaire`,
  `${BASE_URL}/fr/titres-de-sejour/etudiant`,
  `${BASE_URL}/fr/titres-de-sejour/entrepreneur-liberal`,
  `${BASE_URL}/fr/titres-de-sejour/renouvellement`,

  // Visa types
  `${BASE_URL}/fr/visas/visa-long-sejour`,
  `${BASE_URL}/fr/visas/visa-court-sejour`,
  `${BASE_URL}/fr/visas/vls-ts`,

  // Naturalisation
  `${BASE_URL}/fr/nationalite/naturalisation`,
  `${BASE_URL}/fr/nationalite/declaration-de-nationalite`,
  `${BASE_URL}/fr/nationalite/conditions`,
  `${BASE_URL}/fr/nationalite/procedure`,

  // ANEF (online platform)
  `${BASE_URL}/fr/demarches/anef`,
  `${BASE_URL}/fr/demarches/demande-en-ligne`,
  `${BASE_URL}/fr/demarches/premiere-demande`,
  `${BASE_URL}/fr/demarches/renouvellement-en-ligne`,
  `${BASE_URL}/fr/demarches/changement-de-statut`,
  `${BASE_URL}/fr/demarches/duplicata`,

  // Integration
  `${BASE_URL}/fr/integration/contrat-d-integration-republicaine`,
  `${BASE_URL}/fr/integration/formation-linguistique`,
  `${BASE_URL}/fr/integration/formation-civique`,

  // Practical info
  `${BASE_URL}/fr/informations-pratiques/rendez-vous-en-prefecture`,
  `${BASE_URL}/fr/informations-pratiques/documents-a-fournir`,
  `${BASE_URL}/fr/informations-pratiques/recepisse`,
  `${BASE_URL}/fr/informations-pratiques/taxe-titre-de-sejour`,
  `${BASE_URL}/fr/informations-pratiques/delais-de-traitement`,

  // Regroupement familial
  `${BASE_URL}/fr/immigration-familiale/regroupement-familial`,
  `${BASE_URL}/fr/immigration-familiale/conjoint-de-francais`,
  `${BASE_URL}/fr/immigration-familiale/parent-enfant-francais`,

  // Work permits
  `${BASE_URL}/fr/immigration-professionnelle/autorisation-de-travail`,
  `${BASE_URL}/fr/immigration-professionnelle/detache-ict`,
  `${BASE_URL}/fr/immigration-professionnelle/saisonnier`,
  `${BASE_URL}/fr/immigration-professionnelle/competences-et-talents`,
];

// ============================================================
// Link discovery
// ============================================================

function discoverLinks(html: string, sourceUrl: string): string[] {
  const $ = cheerio.load(html);
  const links: string[] = [];

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;

    let url: string;
    try {
      url = new URL(href, sourceUrl).href;
    } catch {
      return;
    }

    // Only keep same-domain links that look like content pages
    if (
      url.startsWith(BASE_URL) &&
      !url.includes('/en/') && // French only for now
      !url.includes('#') &&
      !url.endsWith('.pdf') &&
      !url.endsWith('.xml') &&
      /\/(fr|immigration|titres|visas|nationalite|demarches|integration|informations)/.test(url)
    ) {
      const clean = url.split('#')[0].split('?')[0];
      links.push(clean);
    }
  });

  return links;
}

// ============================================================
// Page fetcher
// ============================================================

async function fetchPage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'AccueilAI-Ingest/1.0 (bot; +https://accueilai.com)',
        Accept: 'text/html',
        'Accept-Language': 'fr-FR,fr;q=0.9',
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
// Main pipeline
// ============================================================

export async function crawlImmigrationInterieur(): Promise<IngestStats> {
  log(TAG, 'Starting immigration.interieur.gouv.fr crawl');

  const visited = new Set<string>();
  const queue = [...SEED_URLS];
  const allChunks: DocumentChunk[] = [];
  let crawled = 0;
  let failed = 0;

  while (queue.length > 0) {
    const url = queue.shift()!;
    if (visited.has(url)) continue;
    visited.add(url);

    const html = await fetchPage(url);

    if (html) {
      const chunks = parseHtmlToChunks(html, url, {
        source: 'immigration-interieur',
        doc_type: 'procedure',
        language: 'fr',
        metadata: { crawler: 'immigration-interieur' },
      });

      allChunks.push(...chunks);
      crawled++;
      log(TAG, `[${crawled}] ${url} -> ${chunks.length} chunks`);

      // Discover new links (limit total pages to avoid runaway crawl)
      if (visited.size < 200) {
        const newLinks = discoverLinks(html, url);
        for (const link of newLinks) {
          if (!visited.has(link) && !queue.includes(link)) {
            queue.push(link);
          }
        }
      }
    } else {
      failed++;
    }

    await sleep(RATE_LIMITS.crawlDelayMs);
  }

  log(TAG, `Crawled ${crawled} pages (${failed} failed), ${allChunks.length} total chunks`);

  return ingestChunks(allChunks);
}

// ============================================================
// Direct execution
// ============================================================

if (process.argv[1]?.includes('immigration-interieur')) {
  crawlImmigrationInterieur()
    .then((stats) => {
      log(TAG, `Completed: ${JSON.stringify(stats)}`);
      process.exit(0);
    })
    .catch((err) => {
      console.error('immigration-interieur crawl failed:', err);
      process.exit(1);
    });
}
