/**
 * LEGI law data parser.
 * Downloads the COLD French Law dataset from HuggingFace (CSV, ~2.3GB),
 * streams + filters for immigration-relevant articles, extracts hierarchy and
 * cross-references, then ingests into Supabase via embed-chunks.
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
config();
import { Readable } from 'node:stream';
import { parse } from 'csv-parse';
import {
  type DocumentChunk,
  type IngestStats,
  LAW_CODES,
  estimateTokens,
  log,
} from './config';
import { ingestChunks } from './embed-chunks';

const TAG = 'legi-parser';

// ============================================================
// HuggingFace dataset URL (Harvard LIL COLD French Law)
// ============================================================

const DATASET_URL =
  'https://huggingface.co/datasets/harvard-lil/cold-french-law/resolve/main/cold-french-law.csv';

// ============================================================
// CSV row type (matches Harvard COLD dataset columns)
// ============================================================

interface LegiRow {
  article_identifier?: string;
  article_num?: string;
  article_etat?: string;
  article_date_debut?: string;
  article_date_fin?: string;
  texte_date_publi?: string;
  texte_nature?: string;
  texte_titre?: string;
  texte_titre_court?: string;
  texte_contexte?: string;
  article_contenu_markdown?: string;
  article_contenu_text?: string;
  [key: string]: string | undefined;
}

// ============================================================
// Hierarchy extraction
// ============================================================

interface Hierarchy {
  livre?: string;
  titre?: string;
  chapitre?: string;
  section?: string;
}

/**
 * Parse hierarchy from texte_contexte field.
 * Example: "Partie législative\nLivre III : CARTES ET TITRES\nTitre II : ..."
 */
function parseHierarchy(texteContexte: string | undefined): Hierarchy {
  if (!texteContexte) return {};
  const hierarchy: Hierarchy = {};

  const livreMatch = texteContexte.match(/Livre\s+([\w]+(?:\s+[\w]+)?)/i);
  if (livreMatch) hierarchy.livre = livreMatch[1].trim();

  const titreMatch = texteContexte.match(/Titre\s+([\w]+(?:\s+[\w]+)?)/i);
  if (titreMatch) hierarchy.titre = titreMatch[1].trim();

  const chapitreMatch = texteContexte.match(/Chapitre\s+([\w]+(?:\s+[\w]+)?)/i);
  if (chapitreMatch) hierarchy.chapitre = chapitreMatch[1].trim();

  const sectionMatch = texteContexte.match(/Section\s+([\w]+(?:\s+[\w]+)?)/i);
  if (sectionMatch) hierarchy.section = sectionMatch[1].trim();

  return hierarchy;
}

function hierarchyPath(h: Hierarchy): string {
  const parts: string[] = [];
  if (h.livre) parts.push(`Livre ${h.livre}`);
  if (h.titre) parts.push(`Titre ${h.titre}`);
  if (h.chapitre) parts.push(`Chapitre ${h.chapitre}`);
  if (h.section) parts.push(`Section ${h.section}`);
  return parts.join(' > ');
}

// ============================================================
// Cross-reference extraction
// ============================================================

const CROSS_REF_PATTERNS = [
  /articles?\s+(L\.?\s*\d+[\w-]*(?:\s*(?:à|et|,)\s*L\.?\s*\d+[\w-]*)*)/gi,
  /articles?\s+(R\.?\s*\d+[\w-]*(?:\s*(?:à|et|,)\s*R\.?\s*\d+[\w-]*)*)/gi,
  /articles?\s+(D\.?\s*\d+[\w-]*(?:\s*(?:à|et|,)\s*D\.?\s*\d+[\w-]*)*)/gi,
];

function extractCrossReferences(content: string): string[] {
  const refs = new Set<string>();

  for (const pattern of CROSS_REF_PATTERNS) {
    let match: RegExpExecArray | null;
    // Reset lastIndex for global regex
    pattern.lastIndex = 0;
    while ((match = pattern.exec(content)) !== null) {
      // Split multiple references: "L421-1, L421-2 et L421-3"
      const raw = match[1];
      const parts = raw.split(/\s*(?:,|et|à)\s*/);
      for (const part of parts) {
        const cleaned = part.replace(/\s+/g, '').replace(/\./g, '');
        if (cleaned.length > 1) {
          refs.add(cleaned);
        }
      }
    }
  }

  return Array.from(refs);
}

// ============================================================
// Code detection
// ============================================================

function detectCodeName(texteTitre: string): string | null {
  const lower = texteTitre.toLowerCase();

  if (
    lower.includes('entrée et du séjour') ||
    lower.includes('ceseda') ||
    lower.includes("droit d'asile")
  ) {
    return LAW_CODES.CESEDA.id;
  }
  if (lower.includes('code du travail') || lower.includes('travail')) {
    return LAW_CODES.CODE_TRAVAIL.id;
  }
  if (lower.includes('sécurité sociale')) {
    return LAW_CODES.CODE_SECURITE_SOCIALE.id;
  }
  if (lower.includes('impôts') || lower.includes('general des impots')) {
    return LAW_CODES.CODE_IMPOTS.id;
  }

  return null;
}

function isRelevantArticle(codeName: string | null, articleNum: string | undefined): boolean {
  // CESEDA: ingest all articles
  if (codeName === LAW_CODES.CESEDA.id) return true;

  // Other codes: only foreigner-relevant sections
  if (!articleNum) return false;
  const num = articleNum.replace(/\s+/g, '').replace(/\./g, '');

  if (codeName === LAW_CODES.CODE_TRAVAIL.id) {
    return LAW_CODES.CODE_TRAVAIL.filterSections.some((prefix) => num.startsWith(prefix));
  }
  if (codeName === LAW_CODES.CODE_SECURITE_SOCIALE.id) {
    return LAW_CODES.CODE_SECURITE_SOCIALE.filterSections.some((prefix) => num.startsWith(prefix));
  }
  if (codeName === LAW_CODES.CODE_IMPOTS.id) {
    return LAW_CODES.CODE_IMPOTS.filterSections.some((prefix) => num.startsWith(prefix));
  }

  return false;
}

// ============================================================
// CSV streaming download + parse
// ============================================================

async function downloadAndParseCsv(): Promise<LegiRow[]> {
  log(TAG, `Downloading COLD dataset from HuggingFace (streaming ~2.3GB)...`);
  log(TAG, `Only immigration-relevant rows are kept in memory.`);

  const response = await fetch(DATASET_URL, {
    headers: { 'User-Agent': 'AccueilAI-Ingest/1.0' },
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`Failed to download CSV: ${response.status} ${response.statusText}`);
  }

  if (!response.body) {
    throw new Error('Response body is null');
  }

  // Convert Web ReadableStream to Node.js Readable
  const nodeStream = Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0]);

  return new Promise<LegiRow[]>((resolve, reject) => {
    const relevantRows: LegiRow[] = [];
    let totalProcessed = 0;
    let columnsLogged = false;

    const parser = parse({
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
      trim: true,
    });

    nodeStream.pipe(parser);

    parser.on('readable', () => {
      let record: LegiRow;
      while ((record = parser.read()) !== null) {
        totalProcessed++;

        // Log columns from first row
        if (!columnsLogged) {
          log(TAG, `CSV columns: ${Object.keys(record).join(', ')}`);
          columnsLogged = true;
        }

        // Progress logging every 100K rows
        if (totalProcessed % 100_000 === 0) {
          log(TAG, `Streamed ${totalProcessed} rows, ${relevantRows.length} relevant so far...`);
        }

        // Skip abrogated articles early
        if (record.article_etat && record.article_etat.toLowerCase().includes('abroge')) {
          continue;
        }

        // Early filter: only keep rows from target codes
        const codeName = detectCodeName(record.texte_titre ?? '');
        if (codeName && isRelevantArticle(codeName, record.article_num)) {
          relevantRows.push(record);
        }
      }
    });

    parser.on('error', (err) => {
      log(TAG, `CSV parse error at row ${totalProcessed}: ${err.message}`);
      // Resolve with what we have so far instead of failing
      if (relevantRows.length > 0) {
        log(TAG, `Recovering with ${relevantRows.length} rows parsed so far`);
        resolve(relevantRows);
      } else {
        reject(err);
      }
    });

    parser.on('end', () => {
      log(TAG, `Streamed ${totalProcessed} total rows, kept ${relevantRows.length} relevant rows`);
      resolve(relevantRows);
    });
  });
}

// ============================================================
// Row -> DocumentChunk conversion
// ============================================================

function rowToChunk(row: LegiRow): DocumentChunk | null {
  // Prefer markdown content, fall back to plain text
  const content = (row.article_contenu_text ?? row.article_contenu_markdown)?.trim();
  if (!content || content.length < 20) return null;

  const codeName = detectCodeName(row.texte_titre ?? '');
  if (!codeName) return null;

  if (!isRelevantArticle(codeName, row.article_num)) return null;

  const hierarchy = parseHierarchy(row.texte_contexte);
  const crossRefs = extractCrossReferences(content);
  const path = hierarchyPath(hierarchy);

  // Prepend hierarchy path for richer embeddings
  const enrichedContent = path
    ? `${codeName} > ${path}\nArticle ${row.article_num ?? '?'}\n\n${content}`
    : `${codeName}\nArticle ${row.article_num ?? '?'}\n\n${content}`;

  // Warn on extremely long articles
  const tokens = estimateTokens(enrichedContent);
  if (tokens > 2000) {
    log(TAG, `Warning: article ${row.article_num} has ${tokens} estimated tokens`);
  }

  const articleId = row.article_identifier ?? null;

  return {
    content: enrichedContent,
    source: 'legi',
    doc_type: 'law_article',
    language: 'fr',
    article_id: articleId,
    article_number: row.article_num ?? null,
    code_name: codeName,
    hierarchy: Object.keys(hierarchy).length > 0 ? hierarchy : null,
    cross_references: crossRefs.length > 0 ? crossRefs : null,
    source_url: articleId
      ? `https://www.legifrance.gouv.fr/codes/article_lc/${articleId}`
      : null,
    metadata: {
      texte_titre: row.texte_titre,
      texte_contexte: row.texte_contexte,
    },
  };
}

// ============================================================
// Main pipeline
// ============================================================

export async function ingestLegi(): Promise<IngestStats> {
  log(TAG, 'Starting LEGI law data ingestion');

  const rows = await downloadAndParseCsv();
  const chunks: DocumentChunk[] = [];

  for (const row of rows) {
    const chunk = rowToChunk(row);
    if (chunk) {
      chunks.push(chunk);
    }
  }

  // Log breakdown by code
  const byCode: Record<string, number> = {};
  for (const c of chunks) {
    const code = c.code_name ?? 'unknown';
    byCode[code] = (byCode[code] ?? 0) + 1;
  }

  log(TAG, `Chunks by code: ${JSON.stringify(byCode)}`);
  log(TAG, `Total chunks to ingest: ${chunks.length}`);

  return ingestChunks(chunks);
}

// ============================================================
// Direct execution
// ============================================================

if (process.argv[1]?.includes('legi-parser')) {
  ingestLegi()
    .then((stats) => {
      log(TAG, `Completed: ${JSON.stringify(stats)}`);
      process.exit(0);
    })
    .catch((err) => {
      console.error('LEGI ingestion failed:', err);
      process.exit(1);
    });
}
