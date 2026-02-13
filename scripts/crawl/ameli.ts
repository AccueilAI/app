/**
 * ameli.fr crawler.
 * Crawls health insurance guide pages relevant to foreigners / expats.
 * Only targets public informational pages (not account/login areas).
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
config();
import * as cheerio from 'cheerio';
import { type DocumentChunk, type IngestStats, RATE_LIMITS, sleep, log } from '../ingest/config';
import { ingestChunks } from '../ingest/embed-chunks';
import { parseHtmlToChunks } from './parser';

const TAG = 'ameli';

// ============================================================
// Configuration
// ============================================================

const BASE_URL = 'https://www.ameli.fr';

/** Seed URLs covering key health insurance topics for foreigners (verified against actual site) */
const SEED_URLS = [
  // === Foreigners coming to France (CORE for expats) ===
  `${BASE_URL}/assure/droits-demarches/europe-international/protection-sociale-france/travailleur-expatriation-france`,
  `${BASE_URL}/assure/droits-demarches/europe-international/protection-sociale-france/vous-venez-vous-faire-soigner-en-france`,
  `${BASE_URL}/assure/droits-demarches/europe-international/protection-sociale-france/vous-venez-etudier-en-france`,
  `${BASE_URL}/assure/droits-demarches/europe-international/protection-sociale-france`,

  // === Foreigners leaving France / abroad ===
  `${BASE_URL}/assure/droits-demarches/europe-international/protection-sociale-etranger`,
  `${BASE_URL}/assure/droits-demarches/europe-international/protection-sociale-etranger/travailleur-expatriation-etranger`,
  `${BASE_URL}/assure/droits-demarches/europe-international/protection-sociale-etranger/vacances-etranger`,
  `${BASE_URL}/assure/droits-demarches/europe-international/protection-sociale-etranger/retraite-etranger`,

  // === PUMa (universal health coverage) ===
  `${BASE_URL}/assure/droits-demarches/principes/protection-universelle-maladie`,

  // === Carte Vitale & CEAM ===
  `${BASE_URL}/assure/remboursements/etre-bien-rembourse/carte-vitale`,
  `${BASE_URL}/assure/remboursements/etre-bien-rembourse/la-carte-europeenne-d-assurance-maladie`,

  // === Core rights and procedures ===
  `${BASE_URL}/assure/droits-demarches/principes/remboursement`,
  `${BASE_URL}/assure/droits-demarches/principes/medecin-traitant`,
  `${BASE_URL}/assure/droits-demarches/principes/parcours-de-soins-coordonnes`,

  // === Low-income coverage (AME, C2S) ===
  `${BASE_URL}/assure/droits-demarches/difficultes-acces-droits-soins/complementaire-sante-solidaire`,
  `${BASE_URL}/assure/droits-demarches/difficultes-acces-droits-soins/aide-medicale-etat`,

  // === Life events ===
  `${BASE_URL}/assure/droits-demarches/situations-particulieres/changement-situation`,
  `${BASE_URL}/assure/droits-demarches/situations-particulieres/demenagement`,
  `${BASE_URL}/assure/droits-demarches/situations-particulieres/grossesse`,

  // === Maternity ===
  `${BASE_URL}/assure/droits-demarches/famille/maternite-paternite-adoption`,

  // === Remboursements ===
  `${BASE_URL}/assure/remboursements/etre-bien-rembourse/tiers-payant`,
  `${BASE_URL}/assure/remboursements/etre-bien-rembourse/complementaire-sante`,

  // === Self-employed & students ===
  `${BASE_URL}/assure/droits-demarches/situations-particulieres/independant-micro-entrepreneur`,
  `${BASE_URL}/assure/droits-demarches/situations-particulieres/etudiant`,

  // === Contact ===
  `${BASE_URL}/assure/adresses-et-contacts/votre-caisse-d-assurance-maladie`,
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

    // Only keep ameli.fr national informational pages
    // Exclude département-specific URLs (e.g., /ain/assure/, /paris/assure/)
    // Exclude account areas, PDFs, and news/actualités pages
    if (
      url.startsWith(`${BASE_URL}/assure/`) &&
      !url.includes('/compte-ameli') &&
      !url.includes('/login') &&
      !url.includes('/espace-client') &&
      !url.includes('/actualites') &&
      !url.endsWith('.pdf') &&
      !url.includes('#')
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

export async function crawlAmeli(): Promise<IngestStats> {
  log(TAG, 'Starting ameli.fr crawl');

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
        source: 'ameli',
        doc_type: 'procedure',
        language: 'fr',
        metadata: { crawler: 'ameli' },
      });

      allChunks.push(...chunks);
      crawled++;
      log(TAG, `[${crawled}] ${url} -> ${chunks.length} chunks`);

      // Discover new links (limit to avoid runaway crawl)
      if (visited.size < 100) {
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

if (process.argv[1]?.includes('ameli')) {
  crawlAmeli()
    .then((stats) => {
      log(TAG, `Completed: ${JSON.stringify(stats)}`);
      process.exit(0);
    })
    .catch((err) => {
      console.error('ameli crawl failed:', err);
      process.exit(1);
    });
}
