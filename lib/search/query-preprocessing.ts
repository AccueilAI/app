import OpenAI from 'openai';

let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (openaiClient) return openaiClient;
  openaiClient = new OpenAI();
  return openaiClient;
}

/**
 * Debug helper: log the full output array when output_text is empty.
 * This helps us understand WHY the model returns no text.
 */
function debugEmptyOutput(tag: string, response: OpenAI.Responses.Response): void {
  console.warn(
    `[${tag}] Empty output_text. status=${response.status} | ` +
    `output_items=${response.output.length} | ` +
    `output=${JSON.stringify(response.output).slice(0, 500)}` +
    (response.incomplete_details ? ` | incomplete=${JSON.stringify(response.incomplete_details)}` : ''),
  );
}

// --- Language Detection ---

// Common French words unlikely to appear in English
const FRENCH_MARKERS = new Set([
  'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'et', 'est', 'en',
  'au', 'aux', 'ce', 'cette', 'ces', 'je', 'tu', 'il', 'elle', 'nous',
  'vous', 'ils', 'elles', 'mon', 'ton', 'son', 'ma', 'ta', 'sa', 'mes',
  'ses', 'notre', 'votre', 'leur', 'que', 'qui', 'quoi', 'dans', 'pour',
  'sur', 'avec', 'par', 'pas', 'plus', 'mais', 'ou', 'donc', 'car',
  'comment', 'travail', 'titre', 'carte', 'droit', 'demande',
]);

// Common English words that are NOT also common French words
const ENGLISH_MARKERS = new Set([
  'the', 'is', 'are', 'was', 'were', 'has', 'have', 'had', 'do', 'does',
  'did', 'will', 'would', 'could', 'should', 'can', 'may', 'might',
  'shall', 'this', 'that', 'these', 'those', 'it', 'its', 'my', 'your',
  'his', 'her', 'our', 'their', 'what', 'which', 'who', 'how', 'when',
  'where', 'why', 'not', 'but', 'and', 'with', 'from', 'about', 'into',
  'through', 'during', 'before', 'after', 'above', 'below', 'between',
  'work', 'visa', 'permit', 'residence', 'tax', 'health', 'insurance',
]);

// Hangul Unicode range: U+AC00 to U+D7AF (syllables) + U+1100 to U+11FF (Jamo)
const HANGUL_REGEX = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/;

/**
 * Simple heuristic language detection for en/fr/ko.
 * Returns 'ko' for Korean text, then scores French vs English markers.
 */
export function detectLanguage(text: string): string {
  // Check for Korean characters first
  const hangulCount = (text.match(/[\uAC00-\uD7AF]/g) ?? []).length;
  if (hangulCount > 0 && hangulCount / text.length > 0.1) {
    return 'ko';
  }
  if (HANGUL_REGEX.test(text) && text.length < 20) {
    return 'ko';
  }

  // Tokenize and score French vs English
  const words = text
    .toLowerCase()
    .replace(/[^a-zA-Z\u00C0-\u024F\uAC00-\uD7AF\s]/g, '')
    .split(/\s+/)
    .filter(Boolean);

  let frScore = 0;
  let enScore = 0;

  for (const word of words) {
    if (FRENCH_MARKERS.has(word)) frScore++;
    if (ENGLISH_MARKERS.has(word)) enScore++;
  }

  // Check for French-specific diacritics as a tiebreaker
  const frenchDiacritics = /[éèêëàâäôùûüîïçœæ]/i;
  if (frenchDiacritics.test(text)) frScore += 2;

  if (frScore > enScore) return 'fr';
  if (enScore > frScore) return 'en';

  // Default to French since our corpus is French
  return 'fr';
}

// --- Translation ---

/**
 * Translate a query to French using Responses API. Skips if already French.
 */
export async function translateToFrench(
  text: string,
  sourceLang: string,
): Promise<string> {
  if (sourceLang === 'fr') return text;

  const openai = getOpenAI();
  const t0 = Date.now();

  try {
    const response = await openai.responses.create({
      model: 'gpt-5-mini',
      max_output_tokens: 256,
      instructions:
        'You are a translator. Translate the user message to French. ' +
        'Output ONLY the French translation, nothing else. ' +
        'Use precise French administrative terms (e.g., "titre de séjour" not "permis de résidence").',
      input: text,
    });

    const translated = response.output_text?.trim();
    if (translated) {
      console.log(`[query] Translated in ${Date.now() - t0}ms: "${translated.slice(0, 80)}"`);
      return translated;
    }

    debugEmptyOutput('query:translate', response);
    return text;
  } catch (err) {
    console.error(`[query] Translation error in ${Date.now() - t0}ms: ${(err as Error).message}`);
    return text;
  }
}

// --- Conversational Query Reformulation ---

/**
 * Rewrite a follow-up message as a standalone search query using conversation context.
 * Skips reformulation for the first message (no prior context).
 */
export async function reformulateQuery(
  messages: { role: string; content: string }[],
): Promise<string> {
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage || lastMessage.role !== 'user') {
    return lastMessage?.content ?? '';
  }

  // First user message — no context needed
  const priorMessages = messages.slice(0, -1);
  if (priorMessages.length === 0) {
    console.log('[query] First message, no reformulation needed');
    return lastMessage.content;
  }

  // Use last 6 messages for context (3 turns)
  const recentHistory = priorMessages.slice(-6);

  const historyBlock = recentHistory
    .map((m) => `${m.role}: ${m.content.slice(0, 300)}`)
    .join('\n');

  const t0 = Date.now();
  const openai = getOpenAI();

  let result: string;
  try {
    const response = await openai.responses.create({
      model: 'gpt-5-mini',
      max_output_tokens: 256,
      instructions:
        'You are a query reformulation assistant. ' +
        'Given a conversation history and the latest user message, rewrite the latest message ' +
        'as a STANDALONE search query that captures the full intent. ' +
        'If the latest message is already self-contained, return it EXACTLY unchanged. ' +
        'Output ONLY the reformulated query, nothing else. ' +
        'Keep the query in the same language as the user message. ' +
        'NEVER truncate or shorten the query.',
      input: `CONVERSATION HISTORY:\n${historyBlock}\n\nLATEST USER MESSAGE:\n${lastMessage.content}`,
    });

    result = response.output_text?.trim() || lastMessage.content;

    if (!response.output_text?.trim()) {
      debugEmptyOutput('query:reformulate', response);
    }
  } catch (err) {
    console.error(`[query] Reformulation error: ${(err as Error).message}`);
    result = lastMessage.content;
  }

  // Safety: if reformulated query is shorter than 50% of original, use original
  if (result.length < lastMessage.content.length * 0.5) {
    console.warn(
      `[query] Reformulation too short (${result.length} vs ${lastMessage.content.length}), using original`,
    );
    result = lastMessage.content;
  }

  console.log(
    `[query] Reformulated in ${Date.now() - t0}ms (${priorMessages.length} prior msgs): "${result.slice(0, 100)}"`,
  );
  return result;
}

// --- Query Expansion ---

/**
 * Generate 2-3 French administrative synonym expansions for a query.
 */
export async function expandQuery(query: string): Promise<string[]> {
  const t0 = Date.now();
  const openai = getOpenAI();

  try {
    const response = await openai.responses.create({
      model: 'gpt-5-mini',
      max_output_tokens: 256,
      instructions:
        'Given a French administrative query, provide 2-3 alternative phrasings using ' +
        'official French legal/administrative terminology. Return ONLY a JSON array of strings. ' +
        'Example: ["visa de travail", "titre de séjour salarié", "autorisation de travail"]',
      input: query,
    });

    const raw = response.output_text?.trim() || '';

    if (!raw) {
      debugEmptyOutput('query:expand', response);
      return [];
    }

    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.every((s) => typeof s === 'string')) {
        console.log(`[query] Expanded in ${Date.now() - t0}ms: ${(parsed as string[]).length} terms`);
        return parsed as string[];
      }
    } catch {
      // If model returns malformed JSON, try to extract strings manually
      const matches = raw.match(/"([^"]+)"/g);
      if (matches) {
        const extracted = matches.map((m) => m.replace(/"/g, '')).slice(0, 3);
        console.log(`[query] Expanded (fallback) in ${Date.now() - t0}ms: ${extracted.length} terms`);
        return extracted;
      }
    }

    console.log(`[query] Expand failed in ${Date.now() - t0}ms: raw="${raw.slice(0, 80)}"`);
    return [];
  } catch (err) {
    console.error(`[query] Expand error in ${Date.now() - t0}ms: ${(err as Error).message}`);
    return [];
  }
}
