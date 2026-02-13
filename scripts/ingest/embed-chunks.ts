/**
 * Embedding + DB insertion utility.
 * Takes DocumentChunk[], generates embeddings via OpenAI, inserts into Supabase.
 * Idempotent: skips chunks that already exist (matched by source + article_id or source + source_url).
 */

import { getSupabase } from '@/lib/supabase/client';
import { embedBatch } from '@/lib/embeddings';
import {
  type DocumentChunk,
  type IngestStats,
  BATCH_SIZES,
  RATE_LIMITS,
  sleep,
  log,
} from './config';

const TAG = 'embed-chunks';

// ============================================================
// Existing-chunk deduplication
// ============================================================

interface ExistingKey {
  source: string;
  article_id: string | null;
  source_url: string | null;
}

async function fetchExistingKeys(source: string): Promise<Set<string>> {
  const supabase = getSupabase();
  const keys = new Set<string>();
  let offset = 0;
  const pageSize = 1000;

  // Paginate through all existing chunks for this source
  while (true) {
    const { data, error } = await supabase
      .from('document_chunks')
      .select('source, article_id, source_url')
      .eq('source', source)
      .range(offset, offset + pageSize - 1);

    if (error) {
      log(TAG, `Warning: failed to fetch existing keys — ${error.message}`);
      break;
    }

    if (!data || data.length === 0) break;

    for (const row of data as ExistingKey[]) {
      keys.add(makeKey(row.source, row.article_id, row.source_url));
    }

    if (data.length < pageSize) break;
    offset += pageSize;
  }

  return keys;
}

function makeKey(
  source: string,
  articleId: string | null | undefined,
  sourceUrl: string | null | undefined,
): string {
  if (articleId) return `${source}::aid::${articleId}`;
  if (sourceUrl) return `${source}::url::${sourceUrl}`;
  return `${source}::content::${Math.random()}`; // no dedup key — always insert
}

// ============================================================
// Core ingest function
// ============================================================

export async function ingestChunks(chunks: DocumentChunk[]): Promise<IngestStats> {
  const startTime = Date.now();

  if (chunks.length === 0) {
    log(TAG, 'No chunks to ingest.');
    return { source: 'unknown', chunksCreated: 0, chunksSkipped: 0, durationMs: 0 };
  }

  const source = chunks[0].source;
  log(TAG, `Starting ingest for source="${source}" — ${chunks.length} chunks`);

  // Step 1: Fetch existing keys for deduplication
  log(TAG, 'Fetching existing keys for deduplication...');
  const existingKeys = await fetchExistingKeys(source);
  log(TAG, `Found ${existingKeys.size} existing chunks in DB`);

  // Step 2: Filter out already-existing chunks
  const newChunks = chunks.filter((chunk) => {
    const key = makeKey(chunk.source, chunk.article_id, chunk.source_url);
    return !existingKeys.has(key);
  });

  const skipped = chunks.length - newChunks.length;
  if (skipped > 0) {
    log(TAG, `Skipping ${skipped} already-existing chunks`);
  }

  if (newChunks.length === 0) {
    log(TAG, 'All chunks already exist. Nothing to do.');
    return {
      source,
      chunksCreated: 0,
      chunksSkipped: skipped,
      durationMs: Date.now() - startTime,
    };
  }

  log(TAG, `Embedding ${newChunks.length} new chunks...`);

  // Step 3: Generate embeddings in batches
  // OpenAI text-embedding-3-large has 8191 token limit per input.
  // French legal text can be ~2.5-3 chars/token due to special chars/numbers.
  // 20,000 chars ≈ ~6,500-8,000 tokens — safe margin.
  const MAX_EMBED_CHARS = 20_000;
  const allEmbeddings: number[][] = [];
  for (let i = 0; i < newChunks.length; i += BATCH_SIZES.embed) {
    const batchEnd = Math.min(i + BATCH_SIZES.embed, newChunks.length);
    const texts = newChunks.slice(i, batchEnd).map((c) =>
      c.content.length > MAX_EMBED_CHARS ? c.content.slice(0, MAX_EMBED_CHARS) : c.content,
    );

    const embeddings = await embedBatch(texts);
    allEmbeddings.push(...embeddings);

    log(TAG, `Embedded ${allEmbeddings.length}/${newChunks.length} chunks`);

    if (batchEnd < newChunks.length) {
      await sleep(RATE_LIMITS.embedDelayMs);
    }
  }

  // Step 4: Insert into Supabase in batches
  log(TAG, `Inserting ${newChunks.length} chunks into Supabase...`);
  const supabase = getSupabase();
  let insertedCount = 0;

  for (let i = 0; i < newChunks.length; i += BATCH_SIZES.insert) {
    const batchEnd = Math.min(i + BATCH_SIZES.insert, newChunks.length);
    const rows = newChunks.slice(i, batchEnd).map((chunk, idx) => ({
      content: chunk.content,
      embedding: JSON.stringify(allEmbeddings[i + idx]),
      source: chunk.source,
      doc_type: chunk.doc_type,
      language: chunk.language ?? 'fr',
      article_id: chunk.article_id ?? null,
      article_number: chunk.article_number ?? null,
      code_name: chunk.code_name ?? null,
      hierarchy: chunk.hierarchy ?? null,
      cross_references: chunk.cross_references ?? null,
      source_url: chunk.source_url ?? null,
      last_modified: chunk.last_modified ?? null,
      metadata: chunk.metadata ?? null,
    }));

    const { error } = await supabase.from('document_chunks').insert(rows);

    if (error) {
      log(TAG, `Error inserting batch at offset ${i}: ${error.message}`);
      // Continue with remaining batches
    } else {
      insertedCount += rows.length;
    }

    log(TAG, `Inserted ${insertedCount}/${newChunks.length} chunks`);

    if (batchEnd < newChunks.length) {
      await sleep(RATE_LIMITS.insertDelayMs);
    }
  }

  const durationMs = Date.now() - startTime;
  log(TAG, `Done: ${insertedCount} created, ${skipped} skipped in ${(durationMs / 1000).toFixed(1)}s`);

  return {
    source,
    chunksCreated: insertedCount,
    chunksSkipped: skipped,
    durationMs,
  };
}
