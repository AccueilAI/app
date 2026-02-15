import { embedText } from '@/lib/embeddings';
import {
  hybridSearch,
  vectorSearch,
  type HybridSearchResult,
  type SearchFilters,
} from '@/lib/supabase/search';
import { detectLanguage, translateToFrench, expandQuery } from './query-preprocessing';
import { rerankDocuments } from './reranker';

// --- Types ---

export interface SearchOptions {
  language?: string;
  count?: number;
  filters?: SearchFilters;
}

export interface SearchResultItem {
  id: string;
  content: string;
  source: string;
  doc_type: string;
  article_number?: string;
  code_name?: string;
  source_url?: string;
  score: number;
}

export interface SearchResponse {
  results: SearchResultItem[];
  query_info: {
    original_query: string;
    detected_language: string;
    french_query: string;
  };
  total: number;
}

// --- RRF Merge ---

const RRF_K = 60;

/**
 * Merge two result sets using Reciprocal Rank Fusion.
 * Each result gets score = 1/(k + rank) from each list, summed across lists.
 */
function mergeWithRRF(
  primary: HybridSearchResult[],
  secondary: { id: string; content: string; source: string; doc_type: string; article_number: string | null; code_name: string | null; source_url: string | null; metadata: Record<string, unknown> | null; similarity: number }[],
  maxResults: number,
): HybridSearchResult[] {
  const scoreMap = new Map<string, { result: HybridSearchResult; score: number }>();

  // Score from primary (hybrid search) results
  for (let i = 0; i < primary.length; i++) {
    const r = primary[i];
    scoreMap.set(r.id, {
      result: r,
      score: 1 / (RRF_K + i + 1),
    });
  }

  // Score from secondary (vector search) results
  for (let i = 0; i < secondary.length; i++) {
    const r = secondary[i];
    const existing = scoreMap.get(r.id);
    const secondaryScore = 1 / (RRF_K + i + 1);

    if (existing) {
      existing.score += secondaryScore;
    } else {
      scoreMap.set(r.id, {
        result: {
          id: r.id,
          content: r.content,
          source: r.source,
          doc_type: r.doc_type,
          article_number: r.article_number,
          code_name: r.code_name,
          source_url: r.source_url,
          metadata: r.metadata,
          semantic_rank: null,
          keyword_rank: null,
          rrf_score: secondaryScore,
        },
        score: secondaryScore,
      });
    }
  }

  return Array.from(scoreMap.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map((entry) => ({
      ...entry.result,
      rrf_score: entry.score,
    }));
}

// --- Cross-Reference Expansion ---

/**
 * For law_article results, look up cross-referenced articles from metadata.
 * Returns up to `limit` additional results.
 */
async function expandCrossReferences(
  results: HybridSearchResult[],
  limit: number,
): Promise<HybridSearchResult[]> {
  const referencedIds = new Set<string>();
  const existingIds = new Set(results.map((r) => r.id));

  for (const result of results) {
    if (result.doc_type !== 'law_article' || !result.metadata) continue;

    const crossRefs = result.metadata['cross_references'];
    if (!Array.isArray(crossRefs)) continue;

    for (const ref of crossRefs) {
      if (typeof ref === 'string' && !existingIds.has(ref) && !referencedIds.has(ref)) {
        referencedIds.add(ref);
        if (referencedIds.size >= limit) break;
      }
    }
    if (referencedIds.size >= limit) break;
  }

  if (referencedIds.size === 0) return [];

  // Fetch cross-referenced articles by embedding-based similarity to their own content
  // Since we don't have a direct ID lookup via the search functions,
  // we use the Supabase client directly for a simple select
  const { getSupabase } = await import('@/lib/supabase/client');
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('document_chunks')
    .select('id, content, source, doc_type, article_number, code_name, source_url, metadata')
    .in('article_number', Array.from(referencedIds));

  if (error || !data) return [];

  return data.map((doc) => ({
    id: doc.id as string,
    content: doc.content as string,
    source: doc.source as string,
    doc_type: doc.doc_type as string,
    article_number: (doc.article_number as string | null) ?? null,
    code_name: (doc.code_name as string | null) ?? null,
    source_url: (doc.source_url as string | null) ?? null,
    metadata: (doc.metadata as Record<string, unknown> | null) ?? null,
    semantic_rank: null,
    keyword_rank: null,
    rrf_score: 0,
  }));
}

// --- Main Pipeline ---

/**
 * RAG search pipeline: detect language, translate, embed, search, merge, expand.
 */
export async function ragSearch(
  query: string,
  options: SearchOptions = {},
): Promise<SearchResponse> {
  const t0 = Date.now();
  const count = options.count ?? 8;
  const filters: SearchFilters = {
    ...options.filters,
    language: options.filters?.language ?? 'fr',
  };

  // 1. Detect query language
  const detectedLang = options.language ?? detectLanguage(query);

  // 2. Translate to French if needed
  const frenchQuery = detectedLang === 'fr' ? query : await translateToFrench(query, detectedLang);
  console.log(
    `[rag] Lang=${detectedLang}, french="${frenchQuery.slice(0, 80)}"${detectedLang !== 'fr' ? ' (translated)' : ''} +${Date.now() - t0}ms`,
  );

  // 3. Expand query with administrative synonyms (parallel with embedding)
  const [expansions, frenchEmbedding, ...optionalEmbeddings] = await Promise.all([
    expandQuery(frenchQuery),
    embedText(frenchQuery),
    ...(detectedLang !== 'fr' ? [embedText(query)] : []),
  ]);
  const originalEmbedding = optionalEmbeddings[0] ?? null;
  console.log(
    `[rag] Expanded: [${expansions.slice(0, 3).join(', ')}] +${Date.now() - t0}ms`,
  );

  // 4. Build combined keyword query (original + expansions) for BM25
  const keywordQueries = [frenchQuery, ...expansions.slice(0, 2)];
  const combinedKeywordQuery = keywordQueries.join(' | ');

  // 5. Fetch extra candidates for reranking (2x count, capped at 20)
  const candidateCount = Math.min(count * 2, 20);

  // 6. Run hybrid search with expanded French query + French embedding
  const primaryResults = await hybridSearch(combinedKeywordQuery, frenchEmbedding, candidateCount, filters);
  console.log(
    `[rag] Hybrid search: ${primaryResults.length} results +${Date.now() - t0}ms`,
  );

  // 7. If original query was not French, also run vector search with original embedding and merge
  let mergedResults: HybridSearchResult[];
  if (originalEmbedding) {
    const secondaryResults = await vectorSearch(originalEmbedding, candidateCount, filters);
    mergedResults = mergeWithRRF(primaryResults, secondaryResults, candidateCount);
    console.log(
      `[rag] Bilingual merge: ${primaryResults.length}+${secondaryResults.length} → ${mergedResults.length} (RRF) +${Date.now() - t0}ms`,
    );
  } else {
    mergedResults = primaryResults;
  }

  // 8. Cross-encoder reranking (Cohere) — uses French query since docs are French
  const reranked = await rerankDocuments(
    frenchQuery,
    mergedResults.map((r) => ({ ...r, id: r.id, content: r.content })),
    count,
  );
  const rerankedResults: HybridSearchResult[] = reranked.map((r) => ({
    ...(r.document as unknown as HybridSearchResult),
    rrf_score: r.relevanceScore,
  }));
  console.log(
    `[rag] Reranked: ${mergedResults.length} → ${rerankedResults.length} results +${Date.now() - t0}ms`,
  );

  // 9. Expand cross-references from top reranked results (up to 3 extra)
  const crossRefResults = await expandCrossReferences(rerankedResults, 3);
  const allResults = [...rerankedResults, ...crossRefResults];
  if (crossRefResults.length > 0) {
    console.log(
      `[rag] Cross-refs: +${crossRefResults.length} articles +${Date.now() - t0}ms`,
    );
  }

  // 10. Map to response format
  const results: SearchResultItem[] = allResults.map((r) => ({
    id: r.id,
    content: r.content,
    source: r.source,
    doc_type: r.doc_type,
    ...(r.article_number && { article_number: r.article_number }),
    ...(r.code_name && { code_name: r.code_name }),
    ...(r.source_url && { source_url: r.source_url }),
    score: r.rrf_score,
  }));

  console.log(
    `[rag] === DONE === ${Date.now() - t0}ms | ${results.length} results | sources: ${[...new Set(results.map((r) => r.doc_type))].join(',')}`,
  );

  return {
    results,
    query_info: {
      original_query: query,
      detected_language: detectedLang,
      french_query: frenchQuery,
    },
    total: results.length,
  };
}
