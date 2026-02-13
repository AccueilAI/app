/**
 * Shared HTML-to-chunks utility.
 * Extracts main content from HTML using Cheerio, then splits into
 * token-sized chunks suitable for embedding.
 */

import * as cheerio from 'cheerio';
import { type DocumentChunk, CHUNK_CONFIG } from '../ingest/config';

// ============================================================
// Content extraction
// ============================================================

/** Elements to strip before extracting text */
const STRIP_SELECTORS = [
  'nav',
  'header',
  'footer',
  'aside',
  'script',
  'style',
  'noscript',
  'iframe',
  '.breadcrumb',
  '.sidebar',
  '.menu',
  '.navigation',
  '.footer',
  '.header',
  '#menu',
  '#nav',
  '#footer',
  '#header',
  '#sidebar',
  '[role="navigation"]',
  '[role="banner"]',
  '[role="contentinfo"]',
];

/** Selectors to try for main content, in priority order */
const CONTENT_SELECTORS = [
  'main',
  '[role="main"]',
  'article',
  '.content',
  '#content',
  '.main-content',
  '#main-content',
  '.article-content',
  '.page-content',
];

interface ExtractedContent {
  title: string;
  body: string;
  sections: ContentSection[];
}

interface ContentSection {
  heading: string;
  text: string;
}

function extractContent(html: string): ExtractedContent {
  const $ = cheerio.load(html);

  // Remove unwanted elements
  for (const selector of STRIP_SELECTORS) {
    $(selector).remove();
  }

  // Extract page title
  const title =
    $('h1').first().text().trim() ||
    $('title').text().trim() ||
    '';

  // Find main content container
  let mainSelector = 'body';
  for (const selector of CONTENT_SELECTORS) {
    if ($(selector).length > 0) {
      mainSelector = selector;
      break;
    }
  }
  const $main = $(mainSelector);

  // Extract sections based on headings
  const sections: ContentSection[] = [];
  let currentHeading = '';
  let currentText = '';

  $main.children().each((_, el) => {
    const $el = $(el);
    const tagName = ('tagName' in el ? String((el as unknown as { tagName: string }).tagName) : '').toLowerCase();

    if (['h2', 'h3', 'h4'].includes(tagName)) {
      // Save previous section
      if (currentText.trim()) {
        sections.push({ heading: currentHeading, text: currentText.trim() });
      }
      currentHeading = $el.text().trim();
      currentText = '';
    } else {
      const text = $el.text().trim();
      if (text) {
        currentText += text + '\n\n';
      }
    }
  });

  // Push final section
  if (currentText.trim()) {
    sections.push({ heading: currentHeading, text: currentText.trim() });
  }

  // If no sections were extracted, fall back to full text
  if (sections.length === 0) {
    const fullText = $main.text().replace(/\s+/g, ' ').trim();
    if (fullText) {
      sections.push({ heading: '', text: fullText });
    }
  }

  const body = sections.map((s) => (s.heading ? `## ${s.heading}\n\n${s.text}` : s.text)).join('\n\n');

  return { title, body, sections };
}

// ============================================================
// Recursive character text splitter
// ============================================================

const SPLIT_SEPARATORS = ['\n## ', '\n### ', '\n\n', '\n', '. '];

function splitText(
  text: string,
  maxChars: number,
  overlapChars: number,
  separatorIndex = 0,
): string[] {
  if (text.length <= maxChars) {
    return [text];
  }

  // Find the best separator that exists in the text
  let separator = SPLIT_SEPARATORS[separatorIndex];
  while (separatorIndex < SPLIT_SEPARATORS.length - 1 && !text.includes(separator)) {
    separatorIndex++;
    separator = SPLIT_SEPARATORS[separatorIndex];
  }

  const parts = text.split(separator);
  const chunks: string[] = [];
  let current = '';

  for (const part of parts) {
    const candidate = current ? current + separator + part : part;

    if (candidate.length > maxChars && current) {
      chunks.push(current.trim());
      // Overlap: start next chunk with tail of current
      const overlapStart = Math.max(0, current.length - overlapChars);
      current = current.slice(overlapStart) + separator + part;
    } else {
      current = candidate;
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  // Recursively split any chunks that are still too large
  const result: string[] = [];
  for (const chunk of chunks) {
    if (chunk.length > maxChars && separatorIndex < SPLIT_SEPARATORS.length - 1) {
      result.push(...splitText(chunk, maxChars, overlapChars, separatorIndex + 1));
    } else {
      result.push(chunk);
    }
  }

  return result;
}

// ============================================================
// HTML -> DocumentChunk[] pipeline
// ============================================================

export interface ParseOptions {
  source: string;
  doc_type: string;
  language?: string;
  metadata?: Record<string, unknown>;
}

export function parseHtmlToChunks(
  html: string,
  pageUrl: string,
  options: ParseOptions,
): DocumentChunk[] {
  const { title, body, sections } = extractContent(html);

  if (!body || body.length < 50) {
    return [];
  }

  const maxChars = CHUNK_CONFIG.procedureMaxTokens * CHUNK_CONFIG.charsPerToken;
  const overlapChars = CHUNK_CONFIG.overlapChars;
  const chunks: DocumentChunk[] = [];

  // Try section-aware splitting first
  for (const section of sections) {
    const sectionText = section.text;
    if (!sectionText || sectionText.length < 30) continue;

    const textChunks = splitText(sectionText, maxChars, overlapChars);

    for (const chunkText of textChunks) {
      // Prepend title + section heading for context-rich embeddings
      const prefix = [title, section.heading].filter(Boolean).join(' > ');
      const enrichedContent = prefix ? `${prefix}\n\n${chunkText}` : chunkText;

      chunks.push({
        content: enrichedContent,
        source: options.source,
        doc_type: options.doc_type,
        language: options.language ?? 'fr',
        source_url: pageUrl,
        metadata: {
          ...options.metadata,
          page_title: title || undefined,
          section_heading: section.heading || undefined,
        },
      });
    }
  }

  // Fallback: if section parsing yielded nothing, split the whole body
  if (chunks.length === 0) {
    const textChunks = splitText(body, maxChars, overlapChars);
    for (const chunkText of textChunks) {
      const enrichedContent = title ? `${title}\n\n${chunkText}` : chunkText;
      chunks.push({
        content: enrichedContent,
        source: options.source,
        doc_type: options.doc_type,
        language: options.language ?? 'fr',
        source_url: pageUrl,
        metadata: {
          ...options.metadata,
          page_title: title || undefined,
        },
      });
    }
  }

  return chunks;
}
