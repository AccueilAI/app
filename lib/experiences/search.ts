import { getSupabase } from '@/lib/supabase/client';
import type { Experience, ProcedureType } from './types';

const KEYWORD_MAP: Record<string, ProcedureType[]> = {
  visa: ['visa_renewal', 'first_visa'],
  'titre de séjour': ['visa_renewal'],
  renewal: ['visa_renewal'],
  renew: ['visa_renewal'],
  renouvellement: ['visa_renewal'],
  caf: ['caf'],
  apl: ['caf'],
  housing: ['caf', 'housing'],
  logement: ['caf', 'housing'],
  cpam: ['cpam'],
  'carte vitale': ['cpam'],
  healthcare: ['cpam'],
  santé: ['cpam'],
  tax: ['tax_declaration'],
  impôt: ['tax_declaration'],
  fiscal: ['tax_declaration'],
  prefecture: ['prefecture_rdv'],
  préfecture: ['prefecture_rdv'],
  appointment: ['prefecture_rdv'],
  'rendez-vous': ['prefecture_rdv'],
  bank: ['banking'],
  banque: ['banking'],
  nationality: ['nationality'],
  nationalité: ['nationality'],
};

export function detectProcedureTypes(query: string): ProcedureType[] {
  const lower = query.toLowerCase();
  const detected = new Set<ProcedureType>();
  for (const [keyword, types] of Object.entries(KEYWORD_MAP)) {
    if (lower.includes(keyword)) {
      types.forEach((t) => detected.add(t));
    }
  }
  return [...detected];
}

export async function searchExperiences(
  procedureTypes: ProcedureType[],
  limit = 5,
): Promise<Experience[]> {
  if (procedureTypes.length === 0) return [];

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('experiences')
    .select('*')
    .in('procedure_type', procedureTypes)
    .not('tips', 'is', null)
    .order('helpful_count', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[experiences/search] Error:', error);
    return [];
  }
  return data ?? [];
}

export function formatExperiencesForPrompt(experiences: Experience[]): string {
  if (experiences.length === 0) return '';

  return experiences
    .map((exp, i) => {
      const parts = [`[Experience ${i + 1}]`];
      parts.push(`Procedure: ${exp.procedure_type}`);
      if (exp.prefecture)
        parts.push(
          `Location: ${exp.prefecture}${exp.city ? `, ${exp.city}` : ''}`,
        );
      if (exp.wait_time_days != null)
        parts.push(`Processing time: ${exp.wait_time_days} days`);
      if (exp.difficulty != null)
        parts.push(`Difficulty: ${exp.difficulty}/5`);
      if (exp.outcome) parts.push(`Outcome: ${exp.outcome}`);
      if (exp.tips) parts.push(`Tips: ${exp.tips}`);
      if (exp.documents_used?.length)
        parts.push(`Documents used: ${exp.documents_used.join(', ')}`);
      if (exp.experience_date) parts.push(`Date: ${exp.experience_date}`);
      return parts.join('\n');
    })
    .join('\n\n');
}
