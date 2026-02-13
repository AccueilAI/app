import OpenAI from 'openai';

const MODEL = 'text-embedding-3-large';
const DIMENSIONS = 1024;
const MAX_BATCH_SIZE = 20; // Keep small to stay within TPM limits

let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (openaiClient) return openaiClient;
  openaiClient = new OpenAI();
  return openaiClient;
}

/**
 * Sleep helper for rate limit backoff.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Call OpenAI embeddings with retry + exponential backoff for 429 errors.
 */
async function callWithRetry(
  batch: string[],
  maxRetries = 5,
): Promise<OpenAI.Embeddings.CreateEmbeddingResponse> {
  const openai = getOpenAI();

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await openai.embeddings.create({
        model: MODEL,
        input: batch,
        dimensions: DIMENSIONS,
      });
    } catch (err: unknown) {
      const isRateLimit =
        err instanceof Error &&
        (err.message.includes('429') || err.message.includes('Rate limit'));

      if (isRateLimit && attempt < maxRetries) {
        // Exponential backoff: 15s, 30s, 60s, 120s, 240s
        const waitMs = 15_000 * Math.pow(2, attempt);
        const tag = new Date().toISOString().slice(11, 19);
        console.log(
          `[${tag}] [embeddings] Rate limited (attempt ${attempt + 1}/${maxRetries}), waiting ${waitMs / 1000}s...`,
        );
        await sleep(waitMs);
        continue;
      }
      throw err;
    }
  }

  throw new Error('Max retries exceeded');
}

export async function embedText(text: string): Promise<number[]> {
  const response = await callWithRetry([text]);
  return response.data[0].embedding;
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += MAX_BATCH_SIZE) {
    const batch = texts.slice(i, i + MAX_BATCH_SIZE);
    const response = await callWithRetry(batch);
    for (const item of response.data) {
      results.push(item.embedding);
    }

    // Rate limit delay: wait between batches to respect TPM limits
    if (i + MAX_BATCH_SIZE < texts.length) {
      await sleep(3_000);
    }
  }

  return results;
}

export { DIMENSIONS, MODEL };
