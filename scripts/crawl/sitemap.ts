/**
 * Sitemap parser.
 * Fetches and parses XML sitemaps (including sitemap index files).
 * Filters URLs by pattern for targeted crawling.
 */

import * as cheerio from 'cheerio';
import { log } from '../ingest/config';

const TAG = 'sitemap';

export interface SitemapEntry {
  url: string;
  lastmod?: string;
}

// ============================================================
// Sitemap XML parsing
// ============================================================

async function fetchXml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'AccueilAI-Ingest/1.0 (bot; +https://accueilai.com)',
      Accept: 'application/xml, text/xml',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch sitemap ${url}: ${response.status}`);
  }

  return response.text();
}

function parseSitemapXml(xml: string): { urls: SitemapEntry[]; sitemaps: string[] } {
  const $ = cheerio.load(xml, { xmlMode: true });
  const urls: SitemapEntry[] = [];
  const sitemaps: string[] = [];

  // Check for sitemap index (nested sitemaps)
  $('sitemapindex > sitemap > loc').each((_, el) => {
    const loc = $(el).text().trim();
    if (loc) sitemaps.push(loc);
  });

  // Parse URL entries
  $('urlset > url').each((_, el) => {
    const loc = $(el).find('loc').text().trim();
    const lastmod = $(el).find('lastmod').text().trim() || undefined;
    if (loc) urls.push({ url: loc, lastmod });
  });

  return { urls, sitemaps };
}

// ============================================================
// Public API
// ============================================================

/**
 * Fetches and parses a sitemap (or sitemap index).
 * @param sitemapUrl - URL of the sitemap XML
 * @param urlPattern - Optional regex to filter URLs
 * @param maxDepth - Maximum nesting depth for sitemap indexes
 */
export async function parseSitemap(
  sitemapUrl: string,
  urlPattern?: RegExp,
  maxDepth = 2,
): Promise<SitemapEntry[]> {
  log(TAG, `Fetching sitemap: ${sitemapUrl}`);

  const xml = await fetchXml(sitemapUrl);
  const { urls, sitemaps } = parseSitemapXml(xml);

  let allUrls = [...urls];

  // Recursively fetch nested sitemaps
  if (sitemaps.length > 0 && maxDepth > 0) {
    log(TAG, `Found ${sitemaps.length} nested sitemaps`);

    for (const nestedUrl of sitemaps) {
      try {
        const nestedUrls = await parseSitemap(nestedUrl, undefined, maxDepth - 1);
        allUrls.push(...nestedUrls);
      } catch (err) {
        log(TAG, `Warning: failed to parse nested sitemap ${nestedUrl}: ${err}`);
      }
    }
  }

  // Filter by pattern if provided
  if (urlPattern) {
    const before = allUrls.length;
    allUrls = allUrls.filter((entry) => urlPattern.test(entry.url));
    log(TAG, `Filtered ${before} URLs to ${allUrls.length} matching pattern`);
  }

  log(TAG, `Total URLs from sitemap: ${allUrls.length}`);
  return allUrls;
}

/**
 * Tries common sitemap locations for a domain.
 */
export async function discoverSitemap(baseUrl: string): Promise<SitemapEntry[]> {
  const candidates = [
    `${baseUrl}/sitemap.xml`,
    `${baseUrl}/sitemap_index.xml`,
    `${baseUrl}/sitemap/sitemap.xml`,
  ];

  for (const candidate of candidates) {
    try {
      const entries = await parseSitemap(candidate);
      if (entries.length > 0) {
        log(TAG, `Discovered sitemap at ${candidate}`);
        return entries;
      }
    } catch {
      // Try next candidate
    }
  }

  log(TAG, `No sitemap found for ${baseUrl}`);
  return [];
}
