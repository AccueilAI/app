/**
 * welcometofrance.com crawler.
 * Crawls expat-specific guides and ingests into Supabase.
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
config();
import * as cheerio from 'cheerio';
import { type DocumentChunk, type IngestStats, RATE_LIMITS, sleep, log } from '../ingest/config';
import { ingestChunks } from '../ingest/embed-chunks';
import { parseHtmlToChunks } from './parser';

const TAG = 'welcome-to-france';

// ============================================================
// Configuration
// ============================================================

const BASE_URL = 'https://www.welcometofrance.com';

/** Seed URLs organized by topic area */
const SEED_URLS = [
  // Settling in France
  `${BASE_URL}/en/fiche/coming-to-france`,
  `${BASE_URL}/en/fiche/arriving-in-france`,
  `${BASE_URL}/en/fiche/moving-to-france`,
  `${BASE_URL}/en/fiche/first-steps-in-france`,

  // Visa & residence
  `${BASE_URL}/en/fiche/getting-a-visa`,
  `${BASE_URL}/en/fiche/visa-types`,
  `${BASE_URL}/en/fiche/residence-permit`,
  `${BASE_URL}/en/fiche/renewing-your-residence-permit`,
  `${BASE_URL}/en/fiche/talent-passport`,
  `${BASE_URL}/en/fiche/family-reunification`,
  `${BASE_URL}/en/fiche/eu-citizens`,

  // Working
  `${BASE_URL}/en/fiche/working-in-france`,
  `${BASE_URL}/en/fiche/work-permit`,
  `${BASE_URL}/en/fiche/starting-a-business`,
  `${BASE_URL}/en/fiche/freelance-in-france`,
  `${BASE_URL}/en/fiche/employment-contract`,
  `${BASE_URL}/en/fiche/internship-in-france`,

  // Healthcare
  `${BASE_URL}/en/fiche/healthcare-in-france`,
  `${BASE_URL}/en/fiche/social-security`,
  `${BASE_URL}/en/fiche/health-insurance`,
  `${BASE_URL}/en/fiche/complementary-health-insurance`,
  `${BASE_URL}/en/fiche/registering-with-cpam`,

  // Housing
  `${BASE_URL}/en/fiche/finding-housing`,
  `${BASE_URL}/en/fiche/renting-in-france`,
  `${BASE_URL}/en/fiche/tenants-rights`,
  `${BASE_URL}/en/fiche/housing-assistance`,
  `${BASE_URL}/en/fiche/utilities`,

  // Education
  `${BASE_URL}/en/fiche/education-in-france`,
  `${BASE_URL}/en/fiche/schooling-for-children`,
  `${BASE_URL}/en/fiche/higher-education`,
  `${BASE_URL}/en/fiche/french-language-courses`,

  // Taxes & finance
  `${BASE_URL}/en/fiche/taxes-in-france`,
  `${BASE_URL}/en/fiche/income-tax`,
  `${BASE_URL}/en/fiche/opening-a-bank-account`,
  `${BASE_URL}/en/fiche/social-contributions`,
  `${BASE_URL}/en/fiche/tax-residence`,

  // Transport
  `${BASE_URL}/en/fiche/driving-in-france`,
  `${BASE_URL}/en/fiche/driving-licence`,
  `${BASE_URL}/en/fiche/public-transport`,
  `${BASE_URL}/en/fiche/car-registration`,

  // Daily life
  `${BASE_URL}/en/fiche/daily-life-in-france`,
  `${BASE_URL}/en/fiche/family-benefits`,
  `${BASE_URL}/en/fiche/childcare`,
  `${BASE_URL}/en/fiche/retirement-pension`,

  // French versions for comprehensive coverage
  `${BASE_URL}/fr/fiche/venir-en-france`,
  `${BASE_URL}/fr/fiche/obtenir-un-visa`,
  `${BASE_URL}/fr/fiche/titre-de-sejour`,
  `${BASE_URL}/fr/fiche/travailler-en-france`,
  `${BASE_URL}/fr/fiche/protection-sociale`,
  `${BASE_URL}/fr/fiche/se-loger`,
  `${BASE_URL}/fr/fiche/scolariser-ses-enfants`,
  `${BASE_URL}/fr/fiche/impots`,
  `${BASE_URL}/fr/fiche/permis-de-conduire`,
  `${BASE_URL}/fr/fiche/vie-quotidienne`,
];

// ============================================================
// Link discovery — find additional article links on each page
// ============================================================

function discoverLinks(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html);
  const links: string[] = [];

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;

    let url: string;
    try {
      url = new URL(href, baseUrl).href;
    } catch {
      return;
    }

    // Only keep links on the same domain that look like articles
    if (url.startsWith(BASE_URL) && /\/fiche\//.test(url)) {
      // Strip anchors and query params
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
// Language detection
// ============================================================

function detectLanguage(url: string): string {
  if (url.includes('/en/')) return 'en';
  return 'fr';
}

// ============================================================
// Main pipeline
// ============================================================

export async function crawlWelcomeToFrance(): Promise<IngestStats> {
  log(TAG, 'Starting welcometofrance.com crawl');

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
      const lang = detectLanguage(url);
      const chunks = parseHtmlToChunks(html, url, {
        source: 'welcome-to-france',
        doc_type: 'guide',
        language: lang,
        metadata: { crawler: 'welcome-to-france' },
      });

      allChunks.push(...chunks);
      crawled++;
      log(TAG, `[${crawled}] ${url} -> ${chunks.length} chunks`);

      // Discover new links from this page (up to a reasonable limit)
      if (visited.size < 150) {
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

    // Polite delay
    await sleep(RATE_LIMITS.crawlDelayMs);
  }

  log(TAG, `Crawled ${crawled} pages (${failed} failed), ${allChunks.length} total chunks`);

  return ingestChunks(allChunks);
}

// ============================================================
// Direct execution
// ============================================================

if (process.argv[1]?.includes('welcome-to-france')) {
  crawlWelcomeToFrance()
    .then((stats) => {
      log(TAG, `Completed: ${JSON.stringify(stats)}`);
      process.exit(0);
    })
    .catch((err) => {
      console.error('welcome-to-france crawl failed:', err);
      process.exit(1);
    });
}
