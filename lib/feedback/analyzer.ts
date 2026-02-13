import { getSupabase } from '@/lib/supabase/client';

// --- Types ---

export interface FeedbackStats {
  total: number;
  thumbsUp: number;
  thumbsDown: number;
  satisfactionRate: number;
}

export interface ContentGap {
  query: string;
  language: string;
  sourceCount: number;
  occurrences: number;
}

export interface QualityInsight {
  type: 'content_gap' | 'low_satisfaction' | 'frequent_topic' | 'language_gap';
  severity: 'high' | 'medium' | 'low';
  description: string;
  data: Record<string, unknown>;
}

export interface FeedbackReport {
  timestamp: string;
  period: { from: string; to: string };
  stats: FeedbackStats;
  contentGaps: ContentGap[];
  insights: QualityInsight[];
  goldenExamples: { query: string; response: string; sourceCount: number }[];
  topQueries: { query: string; count: number }[];
  languageBreakdown: Record<string, FeedbackStats>;
}

// --- Data Fetchers ---

async function fetchFeedback(daysBack: number) {
  const supabase = getSupabase();
  const since = new Date(
    Date.now() - daysBack * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data, error } = await supabase
    .from('chat_feedback')
    .select('*')
    .gte('created_at', since)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Feedback fetch error: ${error.message}`);
  return data ?? [];
}

async function fetchChatLogs(daysBack: number) {
  const supabase = getSupabase();
  const since = new Date(
    Date.now() - daysBack * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data, error } = await supabase
    .from('chat_logs')
    .select('*')
    .gte('created_at', since)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Chat logs fetch error: ${error.message}`);
  return data ?? [];
}

// --- Analysis Functions ---

function computeStats(
  feedback: { rating: string }[],
): FeedbackStats {
  const total = feedback.length;
  const thumbsUp = feedback.filter((f) => f.rating === 'up').length;
  const thumbsDown = feedback.filter((f) => f.rating === 'down').length;
  return {
    total,
    thumbsUp,
    thumbsDown,
    satisfactionRate: total > 0 ? Math.round((thumbsUp / total) * 100) : 0,
  };
}

function findContentGaps(
  feedback: { rating: string; user_query: string | null; source_count: number | null; language: string | null }[],
): ContentGap[] {
  // Queries with thumbs-down AND low source count = content gaps
  const downvoted = feedback.filter(
    (f) => f.rating === 'down' && f.user_query,
  );

  // Group similar queries (simple normalization)
  const queryMap = new Map<
    string,
    { queries: string[]; language: string; sourceCount: number; count: number }
  >();

  for (const f of downvoted) {
    const normalized = (f.user_query ?? '')
      .toLowerCase()
      .replace(/[?!.,]/g, '')
      .trim();
    if (!normalized) continue;

    // Simple grouping by first 5 words
    const key = normalized.split(/\s+/).slice(0, 5).join(' ');
    const existing = queryMap.get(key);
    if (existing) {
      existing.count++;
      existing.sourceCount = Math.min(
        existing.sourceCount,
        f.source_count ?? 0,
      );
    } else {
      queryMap.set(key, {
        queries: [f.user_query ?? ''],
        language: f.language ?? 'unknown',
        sourceCount: f.source_count ?? 0,
        count: 1,
      });
    }
  }

  return Array.from(queryMap.values())
    .filter((g) => g.sourceCount <= 3 || g.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, 20)
    .map((g) => ({
      query: g.queries[0],
      language: g.language,
      sourceCount: g.sourceCount,
      occurrences: g.count,
    }));
}

function findGoldenExamples(
  feedback: { rating: string; user_query: string | null; assistant_response: string | null; source_count: number | null }[],
) {
  return feedback
    .filter(
      (f) =>
        f.rating === 'up' &&
        f.user_query &&
        f.assistant_response &&
        (f.source_count ?? 0) >= 3,
    )
    .slice(0, 20)
    .map((f) => ({
      query: f.user_query!,
      response: f.assistant_response!.slice(0, 500),
      sourceCount: f.source_count ?? 0,
    }));
}

function findTopQueries(
  logs: { user_message: string }[],
): { query: string; count: number }[] {
  const queryCount = new Map<string, number>();

  for (const log of logs) {
    const normalized = log.user_message
      .toLowerCase()
      .replace(/[?!.,]/g, '')
      .trim()
      .split(/\s+/)
      .slice(0, 8)
      .join(' ');
    if (!normalized) continue;
    queryCount.set(normalized, (queryCount.get(normalized) ?? 0) + 1);
  }

  return Array.from(queryCount.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 15)
    .map(([query, count]) => ({ query, count }));
}

function generateInsights(
  stats: FeedbackStats,
  contentGaps: ContentGap[],
  languageBreakdown: Record<string, FeedbackStats>,
  logs: { source_count: number }[],
): QualityInsight[] {
  const insights: QualityInsight[] = [];

  // Overall satisfaction check
  if (stats.total >= 10 && stats.satisfactionRate < 70) {
    insights.push({
      type: 'low_satisfaction',
      severity: 'high',
      description: `Overall satisfaction rate is ${stats.satisfactionRate}% (target: 70%+). Review thumbs-down feedback for improvement areas.`,
      data: { satisfactionRate: stats.satisfactionRate },
    });
  }

  // Content gaps
  const highPriorityGaps = contentGaps.filter(
    (g) => g.occurrences >= 3 || g.sourceCount === 0,
  );
  if (highPriorityGaps.length > 0) {
    insights.push({
      type: 'content_gap',
      severity: 'high',
      description: `${highPriorityGaps.length} content gaps detected — queries getting downvoted with low/zero source matches. Consider crawling more content for these topics.`,
      data: {
        gaps: highPriorityGaps.map((g) => g.query),
      },
    });
  }

  // Language-specific issues
  for (const [lang, langStats] of Object.entries(languageBreakdown)) {
    if (langStats.total >= 5 && langStats.satisfactionRate < 60) {
      insights.push({
        type: 'language_gap',
        severity: 'medium',
        description: `${lang} users have ${langStats.satisfactionRate}% satisfaction — significantly below average. Check translation quality and language-specific search performance.`,
        data: { language: lang, stats: langStats },
      });
    }
  }

  // Low source count pattern
  const lowSourceLogs = logs.filter((l) => l.source_count <= 2);
  if (logs.length > 0 && lowSourceLogs.length / logs.length > 0.3) {
    insights.push({
      type: 'content_gap',
      severity: 'medium',
      description: `${Math.round((lowSourceLogs.length / logs.length) * 100)}% of queries return ≤2 sources. The knowledge base may need expansion.`,
      data: { lowSourceRate: lowSourceLogs.length / logs.length },
    });
  }

  return insights;
}

// --- Main Analysis ---

export async function analyzeFeedback(
  daysBack = 30,
): Promise<FeedbackReport> {
  const [feedback, logs] = await Promise.all([
    fetchFeedback(daysBack),
    fetchChatLogs(daysBack),
  ]);

  const since = new Date(
    Date.now() - daysBack * 24 * 60 * 60 * 1000,
  ).toISOString();

  // Overall stats
  const stats = computeStats(feedback);

  // Language breakdown
  const byLang = new Map<string, { rating: string }[]>();
  for (const f of feedback) {
    const lang = (f as Record<string, unknown>).language as string ?? 'unknown';
    const arr = byLang.get(lang) ?? [];
    arr.push(f as { rating: string });
    byLang.set(lang, arr);
  }
  const languageBreakdown: Record<string, FeedbackStats> = {};
  for (const [lang, entries] of byLang) {
    languageBreakdown[lang] = computeStats(entries);
  }

  // Content gaps
  const contentGaps = findContentGaps(
    feedback as { rating: string; user_query: string | null; source_count: number | null; language: string | null }[],
  );

  // Golden examples
  const goldenExamples = findGoldenExamples(
    feedback as { rating: string; user_query: string | null; assistant_response: string | null; source_count: number | null }[],
  );

  // Top queries
  const topQueries = findTopQueries(
    logs as { user_message: string }[],
  );

  // Insights
  const insights = generateInsights(
    stats,
    contentGaps,
    languageBreakdown,
    logs as { source_count: number }[],
  );

  return {
    timestamp: new Date().toISOString(),
    period: { from: since, to: new Date().toISOString() },
    stats,
    contentGaps,
    insights,
    goldenExamples,
    topQueries,
    languageBreakdown,
  };
}
