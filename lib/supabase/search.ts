import { getSupabase } from './client';
import { embedText } from '@/lib/embeddings';

export interface SearchResult {
  id: string;
  content: string;
  source: string;
  doc_type: string;
  article_number: string | null;
  code_name: string | null;
  source_url: string | null;
  metadata: Record<string, unknown> | null;
}

export interface HybridSearchResult extends SearchResult {
  semantic_rank: number | null;
  keyword_rank: number | null;
  rrf_score: number;
}

export interface VectorSearchResult extends SearchResult {
  similarity: number;
}

export interface SearchFilters {
  source?: string;
  doc_type?: string;
  language?: string;
}

export async function hybridSearch(
  query: string,
  queryEmbedding: number[],
  count = 10,
  filters: SearchFilters = {},
): Promise<HybridSearchResult[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('hybrid_search', {
    query_text: query,
    query_embedding: JSON.stringify(queryEmbedding),
    match_count: count,
    rrf_k: 60,
    filter_source: filters.source ?? null,
    filter_doc_type: filters.doc_type ?? null,
    filter_language: filters.language ?? 'fr',
  });

  if (error) throw new Error(`Hybrid search failed: ${error.message}`);
  return (data ?? []) as HybridSearchResult[];
}

export async function vectorSearch(
  queryEmbedding: number[],
  count = 10,
  filters: SearchFilters = {},
): Promise<VectorSearchResult[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('vector_search', {
    query_embedding: JSON.stringify(queryEmbedding),
    match_count: count,
    filter_source: filters.source ?? null,
    filter_doc_type: filters.doc_type ?? null,
    filter_language: filters.language ?? 'fr',
  });

  if (error) throw new Error(`Vector search failed: ${error.message}`);
  return (data ?? []) as VectorSearchResult[];
}

export async function search(
  query: string,
  count = 8,
  filters: SearchFilters = {},
): Promise<HybridSearchResult[]> {
  const embedding = await embedText(query);
  return hybridSearch(query, embedding, count, filters);
}
