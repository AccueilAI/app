/**
 * france-visas.gouv.fr crawler.
 * Uses Playwright (headed) to bypass Cloudflare Managed Challenge.
 * Crawls visa information pages and ingests into Supabase.
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
config();
import { chromium, type Page } from 'playwright';
import { type DocumentChunk, type IngestStats, sleep, log } from '../ingest/config';
import { ingestChunks } from '../ingest/embed-chunks';
import { parseHtmlToChunks } from './parser';

const TAG = 'france-visas';

// ============================================================
// Configuration
// ============================================================

const BASE_URL = 'https://france-visas.gouv.fr';

/** Content pages discovered from the 2026 site structure */
const SEED_URLS = [
  // General info
  `${BASE_URL}/web/france-visas/informations-generales`,
  `${BASE_URL}/web/france-visas/les-etapes-de-la-demande-de-visa`,
  `${BASE_URL}/web/france-visas/la-france-dans-l-espace-schengen`,

  // Short-stay & transit
  `${BASE_URL}/web/france-visas/visa-de-court-sejour`,
  `${BASE_URL}/web/france-visas/visa-de-transit-aeroportuaire`,

  // Long-stay
  `${BASE_URL}/web/france-visas/visa-de-long-sejour`,

  // Tourism / Private
  `${BASE_URL}/web/france-visas/tourisme-sejour-prive`,
  `${BASE_URL}/web/france-visas/sejour-touristique-ou-prive`,
  `${BASE_URL}/web/france-visas/jeune-voyageur-vacances-travail`,
  `${BASE_URL}/web/france-visas/volontariat`,

  // Professional
  `${BASE_URL}/web/france-visas/motif-professionnel`,
  `${BASE_URL}/web/france-visas/voyages-d-affaires`,
  `${BASE_URL}/web/france-visas/activite-non-salariee-ou-liberale`,
  `${BASE_URL}/web/france-visas/recherche-d-emploi-creation-d-entreprise`,
  `${BASE_URL}/web/france-visas/activite-salariee`,
  `${BASE_URL}/web/france-visas/passeport-talents`,
  `${BASE_URL}/web/france-visas/jeunes-salaries`,

  // Study / Training
  `${BASE_URL}/web/france-visas/etudier-se-former`,
  `${BASE_URL}/web/france-visas/etudiant`,
  `${BASE_URL}/web/france-visas/stagiaire-etudiant`,
  `${BASE_URL}/web/france-visas/jeune-au-pair`,
  `${BASE_URL}/web/france-visas/mineur-scolarise`,

  // Family
  `${BASE_URL}/web/france-visas/motif-familial`,
  `${BASE_URL}/web/france-visas/famille-de-citoyen-europeen`,
  `${BASE_URL}/web/france-visas/famille-de-francais`,
  `${BASE_URL}/web/france-visas/famille-d-etranger-residant-en-france`,
  `${BASE_URL}/web/france-visas/familial-adoption`,

  // Arrival & Practical
  `${BASE_URL}/web/france-visas/votre-arrivee-en-france`,
  `${BASE_URL}/web/france-visas/lieu-de-depot`,
  `${BASE_URL}/web/france-visas/questions-frequentes`,
  `${BASE_URL}/web/france-visas/contact-assistance`,
];

// ============================================================
// Playwright page fetcher
// ============================================================

async function fetchPage(page: Page, url: string): Promise<string | null> {
  try {
    const resp = await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 20000,
    });

    if (!resp || resp.status() >= 400) {
      log(TAG, `HTTP ${resp?.status() ?? 'null'} for ${url}`);
      return null;
    }

    // Wait for main content to render
    await page.waitForTimeout(2000);

    const title = await page.title();
    if (title.includes('404') || title === 'Just a moment...') {
      log(TAG, `Blocked or 404: ${url} (title: ${title})`);
      return null;
    }

    return page.content();
  } catch (err) {
    log(TAG, `Fetch failed for ${url}: ${(err as Error).message?.slice(0, 100)}`);
    return null;
  }
}

// ============================================================
// Link discovery — find additional content pages
// ============================================================

async function discoverLinks(page: Page): Promise<string[]> {
  const links = await page.evaluate((base: string) => {
    return Array.from(document.querySelectorAll('a[href]'))
      .map((a) => a.getAttribute('href') ?? '')
      .filter((h) => h.startsWith('/web/france-visas/') || h.startsWith(base + '/web/france-visas/'))
      .map((h) => (h.startsWith('/') ? base + h : h));
  }, BASE_URL);

  // Filter to content pages only
  const SKIP_PATTERNS = [
    'demande-en-ligne',
    'suivre-votre-demande',
    'assistant-visa',
    'mentions-legales',
    'actualites',
    'rechercher',
    'accueil',
  ];

  return links.filter(
    (url) => !SKIP_PATTERNS.some((p) => url.includes(p)),
  );
}

// ============================================================
// Main pipeline
// ============================================================

export async function crawlFranceVisas(): Promise<IngestStats> {
  log(TAG, 'Starting france-visas.gouv.fr crawl (Playwright)');

  const browser = await chromium.launch({
    headless: false,
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    locale: 'fr-FR',
  });

  const page = await context.newPage();

  // Remove webdriver flag
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });

  // Step 1: Solve Cloudflare challenge on homepage
  log(TAG, 'Navigating to homepage to solve Cloudflare challenge...');
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(5000);
  const homeTitle = await page.title();
  log(TAG, `Homepage loaded: "${homeTitle}"`);

  if (homeTitle.includes('moment')) {
    log(TAG, 'Still on Cloudflare challenge, waiting longer...');
    await page.waitForTimeout(10000);
  }

  // Step 2: Discover additional links from homepage
  const discoveredLinks = await discoverLinks(page);
  const allUrls = [...new Set([...SEED_URLS, ...discoveredLinks])];
  log(TAG, `${SEED_URLS.length} seed + ${discoveredLinks.length} discovered = ${allUrls.length} unique URLs`);

  // Step 3: Crawl all pages
  const allChunks: DocumentChunk[] = [];
  let crawled = 0;
  let failed = 0;

  for (const url of allUrls) {
    const html = await fetchPage(page, url);

    if (html) {
      const chunks = parseHtmlToChunks(html, url, {
        source: 'france-visas',
        doc_type: 'visa_info',
        language: 'fr',
        metadata: { crawler: 'france-visas-playwright' },
      });

      // Also discover links from each page
      const pageLinks = await discoverLinks(page);
      for (const link of pageLinks) {
        if (!allUrls.includes(link)) {
          allUrls.push(link);
        }
      }

      allChunks.push(...chunks);
      crawled++;
      log(TAG, `[${crawled}/${allUrls.length}] ${url} -> ${chunks.length} chunks`);
    } else {
      failed++;
    }

    // Polite delay between requests
    await sleep(2000);
  }

  await browser.close();
  log(TAG, `Crawled ${crawled} pages (${failed} failed), ${allChunks.length} total chunks`);

  if (allChunks.length === 0) {
    log(TAG, 'No chunks collected — skipping ingest');
    return { source: TAG, chunksCreated: 0, chunksSkipped: 0, durationMs: 0 };
  }

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
