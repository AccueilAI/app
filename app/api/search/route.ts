import { NextRequest, NextResponse } from 'next/server';
import { ragSearch } from '@/lib/search/pipeline';

// --- Rate Limiting ---

const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 10;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return false;
  }

  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

// --- Disclaimer ---

const DISCLAIMER =
  'Les informations fournies sont à titre indicatif. ' +
  'La législation peut évoluer. ' +
  'Vérifiez toujours auprès des sources officielles.';

// --- Request Validation ---

interface SearchRequestBody {
  query: string;
  language?: string;
  filters?: {
    source?: string;
    doc_type?: string;
  };
  count?: number;
}

function validateBody(body: unknown): { valid: true; data: SearchRequestBody } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object.' };
  }

  const b = body as Record<string, unknown>;

  // query: required non-empty string
  if (typeof b.query !== 'string' || b.query.trim().length === 0) {
    return { valid: false, error: 'Field "query" must be a non-empty string.' };
  }

  // language: optional string
  if (b.language !== undefined && typeof b.language !== 'string') {
    return { valid: false, error: 'Field "language" must be a string.' };
  }

  // count: optional number 1-20
  if (b.count !== undefined) {
    if (typeof b.count !== 'number' || !Number.isInteger(b.count) || b.count < 1 || b.count > 20) {
      return { valid: false, error: 'Field "count" must be an integer between 1 and 20.' };
    }
  }

  // filters: optional object with optional string fields
  if (b.filters !== undefined) {
    if (typeof b.filters !== 'object' || b.filters === null || Array.isArray(b.filters)) {
      return { valid: false, error: 'Field "filters" must be an object.' };
    }
    const f = b.filters as Record<string, unknown>;
    if (f.source !== undefined && typeof f.source !== 'string') {
      return { valid: false, error: 'Field "filters.source" must be a string.' };
    }
    if (f.doc_type !== undefined && typeof f.doc_type !== 'string') {
      return { valid: false, error: 'Field "filters.doc_type" must be a string.' };
    }
  }

  return {
    valid: true,
    data: {
      query: b.query as string,
      language: b.language as string | undefined,
      filters: b.filters as SearchRequestBody['filters'],
      count: b.count as number | undefined,
    },
  };
}

// --- Route Handler ---

export async function POST(request: NextRequest) {
  // Rate limit by IP
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 },
    );
  }

  // Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON in request body.' },
      { status: 400 },
    );
  }

  // Validate
  const validation = validateBody(body);
  if (!validation.valid) {
    return NextResponse.json(
      { error: validation.error },
      { status: 400 },
    );
  }

  const { query, language, filters, count } = validation.data;

  // Execute search
  try {
    const response = await ragSearch(query.trim(), {
      language,
      count: count ?? 8,
      filters,
    });

    return NextResponse.json({
      ...response,
      disclaimer: DISCLAIMER,
    });
  } catch (err) {
    console.error('Search API error:', err);
    return NextResponse.json(
      { error: 'An internal error occurred. Please try again later.' },
      { status: 500 },
    );
  }
}
