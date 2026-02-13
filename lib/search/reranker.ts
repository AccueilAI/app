import { CohereClientV2 } from 'cohere-ai';

const MODEL = 'rerank-v3.5';
const MAX_TOKENS_PER_DOC = 4096;

let cohereClient: CohereClientV2 | null = null;

function getCohere(): CohereClientV2 {
  if (cohereClient) return cohereClient;
  cohereClient = new CohereClientV2({
    token: process.env.COHERE_API_KEY,
  });
  return cohereClient;
}

export interface RerankableDocument {
  id: string;
  content: string;
  [key: string]: unknown;
}

export interface RerankResult<T extends RerankableDocument> {
  document: T;
  relevanceScore: number;
}

/**
 * Rerank documents using Cohere cross-encoder.
 * Returns documents sorted by relevance with scores.
 *
 * Skips reranking if COHERE_API_KEY is not set (graceful degradation).
 */
export async function rerankDocuments<T extends RerankableDocument>(
  query: string,
  documents: T[],
  topN?: number,
): Promise<RerankResult<T>[]> {
  if (documents.length === 0) return [];

  // Graceful degradation: skip reranking if no API key
  if (!process.env.COHERE_API_KEY) {
    return documents.map((doc, i) => ({
      document: doc,
      relevanceScore: 1 - i / documents.length,
    }));
  }

  const cohere = getCohere();

  const response = await cohere.rerank({
    model: MODEL,
    query,
    documents: documents.map((d) => d.content),
    topN: topN ?? documents.length,
    maxTokensPerDoc: MAX_TOKENS_PER_DOC,
  });

  return response.results.map((r) => ({
    document: documents[r.index],
    relevanceScore: r.relevanceScore,
  }));
}
