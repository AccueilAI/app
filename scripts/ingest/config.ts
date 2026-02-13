/**
 * Shared configuration for data ingest pipeline.
 * Defines target law codes, chunk settings, rate limits, and shared types.
 */

// ============================================================
// Target law codes for ingestion
// ============================================================

export const LAW_CODES = {
  CESEDA: {
    id: 'CESEDA',
    fullName: "Code de l'entrée et du séjour des étrangers et du droit d'asile",
    keywords: ['ceseda', 'étranger', 'séjour', 'asile', 'visa', 'immigration'],
    priority: 1,
  },
  CODE_TRAVAIL: {
    id: 'Code du travail',
    fullName: 'Code du travail',
    keywords: ['travail', 'emploi', 'salarié', 'contrat'],
    /** Only foreigner-relevant sections (Livre II, Titre II mostly) */
    filterSections: ['L1262', 'L1263', 'L5221', 'L5222', 'L5223', 'L8251', 'L8252', 'L8253', 'L8254', 'L8256'],
    priority: 2,
  },
  CODE_SECURITE_SOCIALE: {
    id: 'Code de la sécurité sociale',
    fullName: 'Code de la sécurité sociale',
    keywords: ['sécurité sociale', 'assurance maladie', 'prestations'],
    filterSections: ['L160', 'L161', 'L380', 'L381', 'L512', 'L811', 'L815', 'L816'],
    priority: 3,
  },
  CODE_IMPOTS: {
    id: 'Code général des impôts',
    fullName: 'Code général des impôts',
    keywords: ['impôt', 'fiscal', 'résidence fiscale'],
    filterSections: ['4B', '4A', '164', '165', '166', '167', '170', '197A', '197B'],
    priority: 4,
  },
} as const;

export type LawCodeId = keyof typeof LAW_CODES;

// ============================================================
// Chunk settings
// ============================================================

export const CHUNK_CONFIG = {
  /** Law articles are kept whole — one article = one chunk */
  lawArticleMaxTokens: 2000,
  /** Procedure / guide content split target */
  procedureMinTokens: 300,
  procedureMaxTokens: 600,
  /** French: ~1 token per 4 characters */
  charsPerToken: 4,
  /** Overlap between adjacent procedure chunks (in characters) */
  overlapChars: 100,
} as const;

// ============================================================
// Rate limiting
// ============================================================

export const RATE_LIMITS = {
  /** Delay between HTTP requests to the same domain (ms) */
  crawlDelayMs: 1500,
  /** Max concurrent HTTP requests */
  maxConcurrentRequests: 2,
  /** Delay between OpenAI embedding batches (ms) */
  embedDelayMs: 200,
  /** Delay between Supabase insert batches (ms) */
  insertDelayMs: 100,
} as const;

// ============================================================
// Batch sizes
// ============================================================

export const BATCH_SIZES = {
  /** Texts per OpenAI embedBatch call (aligns with embeddings.ts MAX_BATCH_SIZE) */
  embed: 100,
  /** Rows per Supabase insert */
  insert: 500,
} as const;

// ============================================================
// Document chunk type (mirrors DB schema)
// ============================================================

export interface DocumentChunk {
  content: string;
  source: string;
  doc_type: string;
  language?: string;

  // Law-specific
  article_id?: string | null;
  article_number?: string | null;
  code_name?: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  hierarchy?: Record<string, any> | null;
  cross_references?: string[] | null;

  // Common
  source_url?: string | null;
  last_modified?: string | null;
  metadata?: Record<string, unknown> | null;
}

// ============================================================
// Crawl page result
// ============================================================

export interface CrawlPage {
  url: string;
  lastmod?: string;
  html: string;
}

// ============================================================
// Ingest stats
// ============================================================

export interface IngestStats {
  source: string;
  chunksCreated: number;
  chunksSkipped: number;
  durationMs: number;
}

// ============================================================
// Helpers
// ============================================================

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHUNK_CONFIG.charsPerToken);
}

export function log(tag: string, message: string): void {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] [${tag}] ${message}`);
}
