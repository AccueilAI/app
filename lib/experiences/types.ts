export interface Experience {
  id: string;
  user_id: string;
  procedure_type: string;
  prefecture: string | null;
  city: string | null;
  nationality: string | null;
  visa_type: string | null;
  wait_time_days: number | null;
  difficulty: number | null;
  documents_used: string[] | null;
  tips: string | null;
  outcome: 'approved' | 'rejected' | 'pending' | 'other' | null;
  experience_date: string | null;
  helpful_count: number;
  created_at: string;
  updated_at: string;
  profiles?: { display_name: string | null };
}

export type ProcedureType =
  | 'visa_renewal'
  | 'first_visa'
  | 'caf'
  | 'cpam'
  | 'tax_declaration'
  | 'prefecture_rdv'
  | 'housing'
  | 'banking'
  | 'nationality'
  | 'other';

export const PROCEDURE_TYPES: ProcedureType[] = [
  'visa_renewal',
  'first_visa',
  'caf',
  'cpam',
  'tax_declaration',
  'prefecture_rdv',
  'housing',
  'banking',
  'nationality',
  'other',
];

export const OUTCOMES = ['approved', 'rejected', 'pending', 'other'] as const;
