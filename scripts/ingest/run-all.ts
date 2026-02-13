/**
 * Master ingest script.
 * Runs all ingest pipelines in sequence, logs stats.
 *
 * Usage:
 *   pnpm tsx scripts/ingest/run-all.ts                  # Run all sources
 *   pnpm tsx scripts/ingest/run-all.ts --source legi    # Run specific source
 *   pnpm tsx scripts/ingest/run-all.ts --source service-public --source annuaire
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
config(); // fallback to .env
import { type IngestStats, log } from './config';
import { ingestLegi } from './legi-parser';
import { crawlServicePublic } from '../crawl/service-public';
import { crawlFranceVisas } from '../crawl/france-visas';
import { crawlWelcomeToFrance } from '../crawl/welcome-to-france';
import { crawlImmigrationInterieur } from '../crawl/immigration-interieur';
import { crawlAmeli } from '../crawl/ameli';
import { ingestAnnuaire } from './annuaire';

const TAG = 'run-all';

// ============================================================
// Pipeline registry
// ============================================================

interface Pipeline {
  name: string;
  description: string;
  run: () => Promise<IngestStats>;
}

const PIPELINES: Pipeline[] = [
  {
    name: 'legi',
    description: 'LEGI French law data (CESEDA + related codes)',
    run: ingestLegi,
  },
  {
    name: 'service-public',
    description: 'service-public.gouv.fr procedures',
    run: crawlServicePublic,
  },
  {
    name: 'france-visas',
    description: 'france-visas.gouv.fr visa information',
    run: crawlFranceVisas,
  },
  {
    name: 'welcome-to-france',
    description: 'welcometofrance.com expat guides',
    run: crawlWelcomeToFrance,
  },
  {
    name: 'annuaire',
    description: 'API Annuaire government offices',
    run: ingestAnnuaire,
  },
  {
    name: 'immigration-interieur',
    description: 'immigration.interieur.gouv.fr procedures',
    run: crawlImmigrationInterieur,
  },
  {
    name: 'ameli',
    description: 'ameli.fr health insurance guides',
    run: crawlAmeli,
  },
];

// ============================================================
// CLI argument parsing
// ============================================================

function parseArgs(): { sources: string[] } {
  const args = process.argv.slice(2);
  const sources: string[] = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--source' && args[i + 1]) {
      sources.push(args[i + 1]);
      i++; // skip next arg
    }
  }

  return { sources };
}

// ============================================================
// Main orchestrator
// ============================================================

async function main(): Promise<void> {
  const globalStart = Date.now();
  const { sources } = parseArgs();

  // Determine which pipelines to run
  let selectedPipelines: Pipeline[];

  if (sources.length > 0) {
    selectedPipelines = [];
    for (const source of sources) {
      const pipeline = PIPELINES.find((p) => p.name === source);
      if (!pipeline) {
        console.error(`Unknown source: "${source}". Available: ${PIPELINES.map((p) => p.name).join(', ')}`);
        process.exit(1);
      }
      selectedPipelines.push(pipeline);
    }
  } else {
    selectedPipelines = PIPELINES;
  }

  log(TAG, `Running ${selectedPipelines.length} pipeline(s): ${selectedPipelines.map((p) => p.name).join(', ')}`);
  log(TAG, '='.repeat(60));

  const allStats: IngestStats[] = [];

  for (const pipeline of selectedPipelines) {
    log(TAG, '');
    log(TAG, `--- ${pipeline.name}: ${pipeline.description} ---`);

    try {
      const stats = await pipeline.run();
      allStats.push(stats);

      log(TAG, `${pipeline.name}: ${stats.chunksCreated} created, ${stats.chunksSkipped} skipped, ${(stats.durationMs / 1000).toFixed(1)}s`);
    } catch (err) {
      log(TAG, `FAILED: ${pipeline.name} — ${err}`);
      allStats.push({
        source: pipeline.name,
        chunksCreated: 0,
        chunksSkipped: 0,
        durationMs: 0,
      });
    }
  }

  // Summary
  const totalDuration = Date.now() - globalStart;
  const totalCreated = allStats.reduce((sum, s) => sum + s.chunksCreated, 0);
  const totalSkipped = allStats.reduce((sum, s) => sum + s.chunksSkipped, 0);

  log(TAG, '');
  log(TAG, '='.repeat(60));
  log(TAG, 'INGEST SUMMARY');
  log(TAG, '='.repeat(60));

  for (const stats of allStats) {
    const status = stats.chunksCreated > 0 || stats.chunksSkipped > 0 ? 'OK' : 'EMPTY/FAILED';
    log(
      TAG,
      `  ${stats.source.padEnd(22)} ${String(stats.chunksCreated).padStart(6)} created  ${String(stats.chunksSkipped).padStart(6)} skipped  ${(stats.durationMs / 1000).toFixed(1).padStart(8)}s  [${status}]`,
    );
  }

  log(TAG, '-'.repeat(60));
  log(TAG, `  ${'TOTAL'.padEnd(22)} ${String(totalCreated).padStart(6)} created  ${String(totalSkipped).padStart(6)} skipped  ${(totalDuration / 1000).toFixed(1).padStart(8)}s`);
  log(TAG, '');
}

// ============================================================
// Execute
// ============================================================

main()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
