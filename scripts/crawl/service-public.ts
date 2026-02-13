/**
 * service-public.gouv.fr crawler.
 * Discovers pages via sitemap + hardcoded seed URLs,
 * crawls foreigner-relevant content, and ingests into Supabase.
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
config();
import { type DocumentChunk, type IngestStats, RATE_LIMITS, sleep, log } from '../ingest/config';
import { ingestChunks } from '../ingest/embed-chunks';
import { parseHtmlToChunks } from './parser';

const TAG = 'service-public';

// ============================================================
// Configuration
// ============================================================

const BASE_URL = 'https://www.service-public.fr';

/** Link pattern to extract F/N page links from category pages */
const FICHE_LINK_RE = /\/particuliers\/vosdroits\/(F|N)\d+/g;

/** Hardcoded seed URLs for key pages (fallback + guaranteed coverage) */
const SEED_URLS = [
  // Titres de sejour
  `${BASE_URL}/particuliers/vosdroits/N110`,
  `${BASE_URL}/particuliers/vosdroits/F2209`,
  `${BASE_URL}/particuliers/vosdroits/F2215`,
  `${BASE_URL}/particuliers/vosdroits/F15898`,
  `${BASE_URL}/particuliers/vosdroits/F16162`,
  `${BASE_URL}/particuliers/vosdroits/F35789`,
  `${BASE_URL}/particuliers/vosdroits/F2257`,
  // Visa
  `${BASE_URL}/particuliers/vosdroits/F16146`,
  `${BASE_URL}/particuliers/vosdroits/F39`,
  // Naturalisation
  `${BASE_URL}/particuliers/vosdroits/F2213`,
  `${BASE_URL}/particuliers/vosdroits/F2726`,
  // CAF / allocations
  `${BASE_URL}/particuliers/vosdroits/N156`,
  `${BASE_URL}/particuliers/vosdroits/F12006`,
  `${BASE_URL}/particuliers/vosdroits/F823`,
  // CPAM / sante
  `${BASE_URL}/particuliers/vosdroits/N418`,
  `${BASE_URL}/particuliers/vosdroits/F3381`,
  `${BASE_URL}/particuliers/vosdroits/F675`,
  // Impots
  `${BASE_URL}/particuliers/vosdroits/N247`,
  `${BASE_URL}/particuliers/vosdroits/F1225`,
  `${BASE_URL}/particuliers/vosdroits/F2367`,
  // Travail etranger
  `${BASE_URL}/particuliers/vosdroits/F2728`,
  `${BASE_URL}/particuliers/vosdroits/N107`,
  `${BASE_URL}/particuliers/vosdroits/F15898`,
  // Regroupement familial
  `${BASE_URL}/particuliers/vosdroits/F11166`,
  `${BASE_URL}/particuliers/vosdroits/F11167`,
  // Asile
  `${BASE_URL}/particuliers/vosdroits/N106`,
  `${BASE_URL}/particuliers/vosdroits/F2741`,
];

// ============================================================
// URL discovery
// ============================================================

async function discoverUrls(): Promise<string[]> {
  const urlSet = new Set<string>();
  const categoryUrls = SEED_URLS.filter((u) => /\/N\d+$/.test(u));
  const ficheUrls = SEED_URLS.filter((u) => /\/F\d+$/.test(u));

  // Add seed fiches directly
  for (const u of ficheUrls) urlSet.add(u);

  // Crawl each category (N-page) to discover linked F-pages
  for (const catUrl of categoryUrls) {
    try {
      const html = await fetchPage(catUrl);
      if (!html) continue;

      // Also parse the category page itself
      urlSet.add(catUrl);

      // Extract all F/N page links from the category page
      const matches = html.matchAll(FICHE_LINK_RE);
      for (const m of matches) {
        const path = m[0];
        const fullUrl = path.startsWith('http') ? path : `${BASE_URL}${path}`;
        urlSet.add(fullUrl);
      }

      await sleep(RATE_LIMITS.crawlDelayMs);
    } catch (err) {
      log(TAG, `Failed to discover from ${catUrl}: ${err}`);
    }
  }

  log(TAG, `Discovered ${urlSet.size} URLs from ${categoryUrls.length} category pages + ${ficheUrls.length} seed fiches`);
  return Array.from(urlSet);
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

export async function crawlServicePublic(): Promise<IngestStats> {
  log(TAG, 'Starting service-public.fr crawl');

  const urls = await discoverUrls();
  const allChunks: DocumentChunk[] = [];

  let crawled = 0;
  let failed = 0;

  for (const url of urls) {
    const html = await fetchPage(url);

    if (html) {
      const chunks = parseHtmlToChunks(html, url, {
        source: 'service-public',
        doc_type: 'procedure',
        language: 'fr',
        metadata: { crawler: 'service-public' },
      });

      allChunks.push(...chunks);
      crawled++;
      log(TAG, `[${crawled}/${urls.length}] ${url} -> ${chunks.length} chunks`);
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

if (process.argv[1]?.includes('service-public')) {
  crawlServicePublic()
    .then((stats) => {
      log(TAG, `Completed: ${JSON.stringify(stats)}`);
      process.exit(0);
    })
    .catch((err) => {
      console.error('service-public crawl failed:', err);
      process.exit(1);
    });
}
