import OpenAI from 'openai';
import { ragSearch } from '@/lib/search/pipeline';
import { buildSystemPrompt } from '@/lib/chat/system-prompt';
import { evaluateResponse, type EvalMetrics } from './metrics';
import { type EvalCase } from './test-set';

// --- Types ---

export interface EvalResult {
  caseId: string;
  query: string;
  language: string;
  category: string;
  metrics: EvalMetrics;
  topicHits: { expected: string[]; found: string[]; missing: string[] };
  responseHits: { expected: string[]; found: string[]; missing: string[] };
  forbiddenHits: string[];
  sourceCount: number;
  responseLength: number;
  latencyMs: number;
}

export interface EvalReport {
  timestamp: string;
  totalCases: number;
  results: EvalResult[];
  averages: EvalMetrics;
  byCategory: Record<string, EvalMetrics>;
  failures: { caseId: string; reason: string }[];
}

// --- OpenAI Singleton ---

let client: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (client) return client;
  client = new OpenAI();
  return client;
}

// --- Keyword Matching ---

function findKeywords(
  text: string,
  keywords: string[],
): { found: string[]; missing: string[] } {
  const lower = text.toLowerCase();
  const found: string[] = [];
  const missing: string[] = [];
  for (const kw of keywords) {
    if (lower.includes(kw.toLowerCase())) {
      found.push(kw);
    } else {
      missing.push(kw);
    }
  }
  return { found, missing };
}

// --- Run Single Case ---

async function runCase(evalCase: EvalCase): Promise<EvalResult> {
  const start = Date.now();

  // 1. RAG search
  const searchResponse = await ragSearch(evalCase.query, {
    language: evalCase.language,
    count: 8,
  });

  // 2. Build system prompt
  const systemPrompt = buildSystemPrompt(
    searchResponse.results,
    evalCase.language,
  );

  // 3. Generate response
  const openai = getOpenAI();
  const res = await openai.responses.create({
    model: 'gpt-5-nano',
    instructions: systemPrompt,
    input: [{ role: 'user', content: evalCase.query }],
    max_output_tokens: 2048,
  });
  const response = res.output_text ?? '';

  const latencyMs = Date.now() - start;

  // 4. Build sources text for evaluation
  const sourcesText = searchResponse.results
    .map(
      (r, i) =>
        `[Source ${i + 1}] (${r.doc_type}: ${r.source})\n${r.content}`,
    )
    .join('\n\n');

  // 5. Evaluate with LLM-as-judge metrics
  const metrics = await evaluateResponse({
    query: evalCase.query,
    response,
    sourcesText,
  });

  // 6. Keyword checks
  const allSourcesText = searchResponse.results
    .map((r) => r.content)
    .join(' ');
  const topicHits = findKeywords(allSourcesText, evalCase.expectedTopics);
  const responseHits = findKeywords(response, evalCase.expectedInResponse);

  const forbiddenHits: string[] = [];
  if (evalCase.forbiddenInResponse) {
    const lower = response.toLowerCase();
    for (const f of evalCase.forbiddenInResponse) {
      if (lower.includes(f.toLowerCase())) forbiddenHits.push(f);
    }
  }

  return {
    caseId: evalCase.id,
    query: evalCase.query,
    language: evalCase.language,
    category: evalCase.category,
    metrics,
    topicHits: { expected: evalCase.expectedTopics, ...topicHits },
    responseHits: { expected: evalCase.expectedInResponse, ...responseHits },
    forbiddenHits,
    sourceCount: searchResponse.results.length,
    responseLength: response.length,
    latencyMs,
  };
}

// --- Run Full Evaluation ---

export async function runEvaluation(
  cases: EvalCase[],
  options?: { concurrency?: number },
): Promise<EvalReport> {
  const concurrency = options?.concurrency ?? 2;
  const results: EvalResult[] = [];
  const failures: { caseId: string; reason: string }[] = [];

  // Run with limited concurrency
  for (let i = 0; i < cases.length; i += concurrency) {
    const batch = cases.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(
      batch.map((c) => runCase(c)),
    );

    for (let j = 0; j < batchResults.length; j++) {
      const result = batchResults[j];
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        failures.push({
          caseId: batch[j].id,
          reason: String(result.reason),
        });
      }
    }
  }

  // Compute averages
  const averages = computeAverages(results.map((r) => r.metrics));

  // Compute by category
  const categories = [...new Set(results.map((r) => r.category))];
  const byCategory: Record<string, EvalMetrics> = {};
  for (const cat of categories) {
    const catResults = results
      .filter((r) => r.category === cat)
      .map((r) => r.metrics);
    byCategory[cat] = computeAverages(catResults);
  }

  return {
    timestamp: new Date().toISOString(),
    totalCases: cases.length,
    results,
    averages,
    byCategory,
    failures,
  };
}

function computeAverages(metrics: EvalMetrics[]): EvalMetrics {
  if (metrics.length === 0) {
    return {
      faithfulness: 0,
      contextRelevance: 0,
      answerRelevance: 0,
      citationAccuracy: 0,
      overall: 0,
    };
  }
  const sum = metrics.reduce(
    (acc, m) => ({
      faithfulness: acc.faithfulness + m.faithfulness,
      contextRelevance: acc.contextRelevance + m.contextRelevance,
      answerRelevance: acc.answerRelevance + m.answerRelevance,
      citationAccuracy: acc.citationAccuracy + m.citationAccuracy,
      overall: acc.overall + m.overall,
    }),
    { faithfulness: 0, contextRelevance: 0, answerRelevance: 0, citationAccuracy: 0, overall: 0 },
  );
  const n = metrics.length;
  return {
    faithfulness: Math.round((sum.faithfulness / n) * 100) / 100,
    contextRelevance: Math.round((sum.contextRelevance / n) * 100) / 100,
    answerRelevance: Math.round((sum.answerRelevance / n) * 100) / 100,
    citationAccuracy: Math.round((sum.citationAccuracy / n) * 100) / 100,
    overall: Math.round((sum.overall / n) * 100) / 100,
  };
}
