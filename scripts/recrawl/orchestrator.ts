/**
 * Recrawl orchestrator.
 * Checks freshness of all data sources and re-crawls stale ones.
 *
 * Usage:
 *   pnpm tsx scripts/recrawl/orchestrator.ts              # Recrawl all stale sources
 *   pnpm tsx scripts/recrawl/orchestrator.ts --dry-run    # Report only, no recrawl
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
config();

import { checkFreshness, FRESHNESS_THRESHOLDS, type SourceFreshness } from './freshness-monitor';
import { log } from '../ingest/config';

const TAG = 'recrawl';

// ============================================================
// Source → crawl handler mapping
// ============================================================

interface CrawlHandler {
  module: string;
  exportName: string;
}

const CRAWL_HANDLERS: Record<string, CrawlHandler> = {
  'service-public': {
    module: '../crawl/service-public',
    exportName: 'crawlServicePublic',
  },
  'france-visas': {
    module: '../crawl/france-visas',
    exportName: 'crawlFranceVisas',
  },
  'welcome-to-france': {
    module: '../crawl/welcome-to-france',
    exportName: 'crawlWelcomeToFrance',
  },
  legi: {
    module: '../ingest/run-all',
    exportName: 'ingestLegi',
  },
  'immigration-interieur': {
    module: '../crawl/immigration-interieur',
    exportName: 'crawlImmigrationInterieur',
  },
  ameli: {
    module: '../crawl/ameli',
    exportName: 'crawlAmeli',
  },
  annuaire: {
    module: '../ingest/annuaire',
    exportName: 'ingestAnnuaire',
  },
};

// ============================================================
// CLI argument parsing
// ============================================================

function parseArgs(): { dryRun: boolean } {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes('--dry-run'),
  };
}

// ============================================================
// Main orchestrator
// ============================================================

async function main(): Promise<void> {
  const { dryRun } = parseArgs();
  const globalStart = Date.now();

  log(TAG, '='.repeat(60));
  log(TAG, 'RECRAWL ORCHESTRATOR');
  log(TAG, `Mode: ${dryRun ? 'DRY RUN (report only)' : 'LIVE (will recrawl stale sources)'}`);
  log(TAG, '='.repeat(60));
  log(TAG, '');

  // Step 1: Check freshness
  log(TAG, 'Checking source freshness...');
  const freshness = await checkFreshness();

  // Step 2: Log status for each source
  log(TAG, '');
  log(TAG, 'Source freshness report:');
  log(TAG, '-'.repeat(60));

  for (const src of freshness) {
    const icon = src.stale ? '\u{1F534}' : '\u{1F7E2}';
    const threshold = FRESHNESS_THRESHOLDS[src.source] ?? 30;
    const ageStr = src.age_days === Infinity ? 'N/A' : `${src.age_days}d`;

    log(
      TAG,
      `  ${icon} ${src.source.padEnd(24)} ${String(src.chunk_count).padStart(6)} chunks  age: ${ageStr.padStart(6)}  threshold: ${threshold}d`,
    );
  }

  const staleSources = freshness.filter((s) => s.stale);
  log(TAG, '');
  log(TAG, `${staleSources.length} of ${freshness.length} sources are stale.`);

  if (staleSources.length === 0) {
    log(TAG, 'All sources are fresh. Nothing to do.');
    return;
  }

  if (dryRun) {
    log(TAG, '');
    log(TAG, 'Dry run complete. Stale sources that would be recrawled:');
    for (const src of staleSources) {
      const hasHandler = src.source in CRAWL_HANDLERS;
      log(TAG, `  - ${src.source} ${hasHandler ? '(handler available)' : '(no handler)'}`);
    }
    return;
  }

  // Step 3: Recrawl stale sources
  log(TAG, '');
  log(TAG, '='.repeat(60));
  log(TAG, 'RECRAWLING STALE SOURCES');
  log(TAG, '='.repeat(60));

  const results: Array<{ source: string; success: boolean; error?: string }> = [];

  for (const src of staleSources) {
    const handler = CRAWL_HANDLERS[src.source];

    if (!handler) {
      log(TAG, `\u{26A0}\u{FE0F}  ${src.source}: no handler configured, skipping.`);
      results.push({ source: src.source, success: false, error: 'no handler' });
      continue;
    }

    log(TAG, '');
    log(TAG, `--- Recrawling: ${src.source} ---`);

    try {
      // Dynamically import the crawl module
      const mod = await import(handler.module);
      const crawlFn = mod[handler.exportName];

      if (typeof crawlFn !== 'function') {
        throw new Error(`Export "${handler.exportName}" not found or not a function in ${handler.module}`);
      }

      const stats = await crawlFn();
      log(
        TAG,
        `\u{2705} ${src.source}: ${stats.chunksCreated} created, ${stats.chunksSkipped} skipped, ${(stats.durationMs / 1000).toFixed(1)}s`,
      );
      results.push({ source: src.source, success: true });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      log(TAG, `\u{274C} ${src.source}: FAILED — ${errorMsg}`);
      results.push({ source: src.source, success: false, error: errorMsg });
    }
  }

  // Step 4: Summary
  const totalDuration = Date.now() - globalStart;
  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  log(TAG, '');
  log(TAG, '='.repeat(60));
  log(TAG, 'RECRAWL SUMMARY');
  log(TAG, '='.repeat(60));

  for (const result of results) {
    const icon = result.success ? '\u{2705}' : '\u{274C}';
    const detail = result.error ? ` (${result.error})` : '';
    log(TAG, `  ${icon} ${result.source}${detail}`);
  }

  log(TAG, '-'.repeat(60));
  log(TAG, `  ${successCount} succeeded, ${failCount} failed, ${(totalDuration / 1000).toFixed(1)}s total`);
  log(TAG, '');
}

// ============================================================
// Execute
// ============================================================

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
