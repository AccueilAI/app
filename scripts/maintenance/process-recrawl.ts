/**
 * Process recrawl candidates: re-fetch URLs, replace stale chunks, re-embed.
 * Run manually: pnpm tsx scripts/maintenance/process-recrawl.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
config();

import { createClient } from '@supabase/supabase-js';
import { parseHtmlToChunks } from '../crawl/parser';
import { ingestChunks } from '../ingest/embed-chunks';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
);

async function main() {
  console.log('[process-recrawl] Starting...');

  const { data: candidates, error } = await supabase
    .from('recrawl_candidates')
    .select('*')
    .eq('processed', false)
    .order('detected_at', { ascending: true })
    .limit(50);

  if (error) {
    console.error('[process-recrawl] Error fetching candidates:', error);
    process.exit(1);
  }

  if (!candidates || candidates.length === 0) {
    console.log('[process-recrawl] No pending candidates.');
    return;
  }

  console.log(`[process-recrawl] Found ${candidates.length} candidates`);

  // Group by source_url to avoid processing the same URL twice
  const byUrl = new Map<string, typeof candidates>();
  for (const c of candidates) {
    if (!byUrl.has(c.source_url)) byUrl.set(c.source_url, []);
    byUrl.get(c.source_url)!.push(c);
  }

  let processed = 0;
  let failed = 0;

  for (const [url, urlCandidates] of byUrl) {
    try {
      console.log(`[process-recrawl] Processing: ${url}`);

      const res = await fetch(url, {
        signal: AbortSignal.timeout(30000),
        headers: { 'User-Agent': 'AccueilAI-Recrawler/1.0' },
      });

      if (!res.ok) {
        console.error(`[process-recrawl] HTTP ${res.status} for ${url}`);
        failed++;
        continue;
      }

      const html = await res.text();
      const source = urlCandidates[0].source;
      const chunks = parseHtmlToChunks(html, url, source);

      if (chunks.length === 0) {
        console.warn(`[process-recrawl] No chunks parsed from ${url}`);
        failed++;
        continue;
      }

      // Set last_modified for new chunks
      for (const chunk of chunks) {
        chunk.last_modified = new Date().toISOString();
      }

      // Delete old chunks for this URL
      const { error: delError } = await supabase
        .from('document_chunks')
        .delete()
        .eq('source_url', url);

      if (delError) {
        console.error(`[process-recrawl] Delete error for ${url}:`, delError);
        failed++;
        continue;
      }

      // Ingest new chunks with embeddings
      await ingestChunks(chunks);
      console.log(`[process-recrawl] Replaced ${chunks.length} chunks for ${url}`);

      // Mark candidates as processed
      const ids = urlCandidates.map(c => c.id);
      await supabase
        .from('recrawl_candidates')
        .update({ processed: true })
        .in('id', ids);

      processed++;
    } catch (err) {
      console.error(`[process-recrawl] Error processing ${url}:`, err);
      failed++;
    }
  }

  console.log(`[process-recrawl] Done: ${processed} URLs processed, ${failed} failed`);
}

main().catch(console.error);
