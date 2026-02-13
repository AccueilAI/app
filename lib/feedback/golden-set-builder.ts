import { getSupabase } from '@/lib/supabase/client';
import type { EvalCase } from '@/lib/eval/test-set';

/**
 * Build evaluation test cases from positively-rated user feedback.
 *
 * Thumbs-up responses with sufficient source coverage become
 * "golden" test cases for the evaluation framework.
 */
export async function buildGoldenTestSet(
  options?: { minSources?: number; limit?: number },
): Promise<EvalCase[]> {
  const minSources = options?.minSources ?? 3;
  const limit = options?.limit ?? 30;

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('chat_feedback')
    .select('*')
    .eq('rating', 'up')
    .gte('source_count', minSources)
    .not('user_query', 'is', null)
    .not('assistant_response', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((row, i) => {
    const query = (row as Record<string, unknown>).user_query as string;
    const response = (row as Record<string, unknown>).assistant_response as string;
    const language = ((row as Record<string, unknown>).language as string) ?? 'en';

    // Extract keywords from the validated response for matching
    const responseKeywords = extractKeywords(response);

    return {
      id: `golden-${i + 1}`,
      query,
      language,
      expectedTopics: [], // Can't infer without sources
      expectedInResponse: responseKeywords.slice(0, 3),
      category: 'general' as const,
    };
  });
}

/**
 * Extract meaningful keywords from a response for evaluation matching.
 */
function extractKeywords(text: string): string[] {
  // Look for French administrative terms, article references, institutions
  const patterns = [
    /(?:article|art\.?)\s+[A-Z]?\d[\d-]*/gi,
    /(?:préfecture|sous-préfecture|mairie|CPAM|CAF|OFII|ANEF|DIRECCTE)/gi,
    /(?:titre de séjour|carte de séjour|visa|récépissé|attestation)/gi,
    /\d+\s*(?:euros?|€|jours?|mois|ans?)/gi,
  ];

  const keywords = new Set<string>();
  for (const pattern of patterns) {
    const matches = text.match(pattern);
    if (matches) {
      for (const match of matches) {
        keywords.add(match.trim());
      }
    }
  }

  return Array.from(keywords);
}
