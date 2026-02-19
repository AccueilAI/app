import type { SearchResultItem } from './pipeline';

export interface QualityAssessment {
  pass: boolean;
  confidence: number;
  reason?: string;
  topScore: number;
  avgScore: number;
  sourceCount: number;
  sourceDiversity: number;
}

// Cohere rerank scores: >0.7 high relevance, 0.5-0.7 relevant, <0.4 off-topic
const THRESHOLDS = {
  MIN_TOP_SCORE: 0.40,
  MIN_AVG_SCORE: 0.20,
  MIN_SOURCES: 1,
} as const;

export function assessRetrievalQuality(
  results: SearchResultItem[],
): QualityAssessment {
  if (results.length === 0) {
    return {
      pass: false,
      confidence: 0,
      reason: 'no_sources_found',
      topScore: 0,
      avgScore: 0,
      sourceCount: 0,
      sourceDiversity: 0,
    };
  }

  const scores = results.map((r) => r.score);
  const topScore = Math.max(...scores);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const sourceDiversity = new Set(results.map((r) => r.doc_type)).size;
  const sourceCount = results.length;

  const confidence =
    topScore * 0.4 +
    Math.min(avgScore * 4, 1) * 0.3 +
    Math.min(sourceCount / 5, 1) * 0.2 +
    Math.min(sourceDiversity / 3, 1) * 0.1;

  const pass =
    topScore >= THRESHOLDS.MIN_TOP_SCORE &&
    avgScore >= THRESHOLDS.MIN_AVG_SCORE &&
    sourceCount >= THRESHOLDS.MIN_SOURCES;

  const reason = !pass
    ? topScore < THRESHOLDS.MIN_TOP_SCORE
      ? 'low_relevance'
      : avgScore < THRESHOLDS.MIN_AVG_SCORE
        ? 'weak_sources'
        : 'insufficient_sources'
    : undefined;

  return { pass, confidence, reason, topScore, avgScore, sourceCount, sourceDiversity };
}
