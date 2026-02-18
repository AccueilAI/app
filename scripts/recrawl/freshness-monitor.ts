/**
 * Freshness monitor for data sources in Supabase.
 * Queries document_chunks to determine how stale each source is
 * based on per-source freshness thresholds.
 *
 * Usage:
 *   pnpm tsx scripts/recrawl/freshness-monitor.ts
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
config();

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
);

// ============================================================
// Types
// ============================================================

export interface SourceFreshness {
  source: string;
  chunk_count: number;
  oldest_crawl: string | null;
  newest_crawl: string | null;
  age_days: number;
  stale: boolean;
}

// ============================================================
// Freshness thresholds (days before source is considered stale)
// ============================================================

export const FRESHNESS_THRESHOLDS: Record<string, number> = {
  legi: 30,
  'service-public': 14,
  'welcome-to-france': 30,
  'france-visas': 14,
  annuaire: 90,
  'immigration-interieur': 14,
  ameli: 30,
};

/** Default threshold for sources not listed above */
const DEFAULT_THRESHOLD_DAYS = 30;

// ============================================================
// Core freshness check
// ============================================================

export async function checkFreshness(): Promise<SourceFreshness[]> {
  // Query document_chunks grouped by source with min/max last_crawled_at
  const { data, error } = await supabase.rpc('check_source_freshness').select();

  // If the RPC doesn't exist, fall back to a raw query approach
  if (error) {
    return checkFreshnessFallback();
  }

  return (data as Array<{ source: string; chunk_count: number; oldest_crawl: string; newest_crawl: string }>).map(
    (row) => {
      const ageDays = row.newest_crawl
        ? Math.floor((Date.now() - new Date(row.newest_crawl).getTime()) / (1000 * 60 * 60 * 24))
        : Infinity;

      const threshold = FRESHNESS_THRESHOLDS[row.source] ?? DEFAULT_THRESHOLD_DAYS;

      return {
        source: row.source,
        chunk_count: row.chunk_count,
        oldest_crawl: row.oldest_crawl,
        newest_crawl: row.newest_crawl,
        age_days: ageDays,
        stale: ageDays > threshold,
      };
    },
  );
}

/**
 * Fallback: query each known source individually since Supabase JS client
 * does not support GROUP BY natively. Uses separate count + min/max queries.
 */
async function checkFreshnessFallback(): Promise<SourceFreshness[]> {
  // First, get distinct sources
  const { data: sourcesData, error: sourcesError } = await supabase
    .from('document_chunks')
    .select('source')
    .limit(1000);

  if (sourcesError) {
    throw new Error(`Failed to query document_chunks: ${sourcesError.message}`);
  }

  // Deduplicate sources
  const uniqueSources = [...new Set((sourcesData ?? []).map((row) => row.source))];

  const results: SourceFreshness[] = [];

  for (const source of uniqueSources) {
    // Get count
    const { count } = await supabase
      .from('document_chunks')
      .select('*', { count: 'exact', head: true })
      .eq('source', source);

    // Get oldest crawl date
    const { data: oldestData } = await supabase
      .from('document_chunks')
      .select('last_crawled_at')
      .eq('source', source)
      .not('last_crawled_at', 'is', null)
      .order('last_crawled_at', { ascending: true })
      .limit(1);

    // Get newest crawl date
    const { data: newestData } = await supabase
      .from('document_chunks')
      .select('last_crawled_at')
      .eq('source', source)
      .not('last_crawled_at', 'is', null)
      .order('last_crawled_at', { ascending: false })
      .limit(1);

    const oldestCrawl = oldestData?.[0]?.last_crawled_at ?? null;
    const newestCrawl = newestData?.[0]?.last_crawled_at ?? null;

    const ageDays = newestCrawl
      ? Math.floor((Date.now() - new Date(newestCrawl).getTime()) / (1000 * 60 * 60 * 24))
      : Infinity;

    const threshold = FRESHNESS_THRESHOLDS[source] ?? DEFAULT_THRESHOLD_DAYS;

    results.push({
      source,
      chunk_count: count ?? 0,
      oldest_crawl: oldestCrawl,
      newest_crawl: newestCrawl,
      age_days: ageDays,
      stale: ageDays > threshold,
    });
  }

  return results;
}

// ============================================================
// Standalone execution
// ============================================================

async function main(): Promise<void> {
  console.log('Checking data source freshness...\n');

  const freshness = await checkFreshness();

  // Sort: stale sources first, then by age descending
  freshness.sort((a, b) => {
    if (a.stale !== b.stale) return a.stale ? -1 : 1;
    return b.age_days - a.age_days;
  });

  console.log('Source'.padEnd(26) + 'Chunks'.padStart(8) + '  Age (days)' + '  Threshold' + '  Status');
  console.log('-'.repeat(72));

  for (const src of freshness) {
    const status = src.stale ? '\u{1F534} STALE' : '\u{1F7E2} Fresh';
    const threshold = FRESHNESS_THRESHOLDS[src.source] ?? DEFAULT_THRESHOLD_DAYS;
    const ageStr = src.age_days === Infinity ? '    N/A' : String(src.age_days).padStart(7);

    console.log(
      `${src.source.padEnd(26)}${String(src.chunk_count).padStart(8)}  ${ageStr}     ${String(threshold).padStart(5)}  ${status}`,
    );
  }

  const staleCount = freshness.filter((s) => s.stale).length;
  console.log(`\n${staleCount} of ${freshness.length} sources are stale.`);
}

// Run standalone if executed directly
const isMain = process.argv[1]?.endsWith('freshness-monitor.ts') || process.argv[1]?.endsWith('freshness-monitor');
if (isMain) {
  main()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Fatal error:', err);
      process.exit(1);
    });
}
