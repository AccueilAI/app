export interface Benefit {
  id: string;
  slug: string;
  category: BenefitCategory;
  name_fr: string;
  name_en: string;
  name_ko: string;
  description_fr: string;
  description_en: string;
  description_ko: string;
  eligibility_rules: EligibilityRules;
  how_to_apply: HowToApply;
  official_url: string | null;
  estimated_amount: string | null;
  processing_time: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type BenefitCategory =
  | 'housing'
  | 'healthcare'
  | 'financial'
  | 'employment'
  | 'legal'
  | 'education';

export const BENEFIT_CATEGORIES: BenefitCategory[] = [
  'housing',
  'healthcare',
  'financial',
  'employment',
  'legal',
  'education',
];

export interface EligibilityRules {
  visa_types?: string[];
  min_residency_months?: number;
  max_income?: number | null;
  age_range?: { min?: number | null; max?: number | null };
  has_children?: boolean | null;
  nationalities_excluded?: string[];
  requires_employment?: boolean;
  requires_legal_residency?: boolean;
}

export interface HowToApply {
  steps_fr?: string[];
  steps_en?: string[];
  steps_ko?: string[];
  documents?: string[];
}

export interface BenefitUpdate {
  id: string;
  source: 'legifrance_rss' | 'service_public_rss' | 'manual';
  title: string;
  summary_fr: string | null;
  summary_en: string | null;
  summary_ko: string | null;
  source_url: string;
  benefit_id: string | null;
  is_relevant: boolean;
  published_at: string;
  created_at: string;
  benefit?: Benefit;
}

export const CATEGORY_COLORS: Record<BenefitCategory, string> = {
  housing: 'bg-green-100 text-green-700',
  healthcare: 'bg-pink-100 text-pink-700',
  financial: 'bg-amber-100 text-amber-700',
  employment: 'bg-purple-100 text-purple-700',
  legal: 'bg-slate-100 text-slate-700',
  education: 'bg-blue-100 text-blue-700',
};

export const CATEGORY_ICONS: Record<BenefitCategory, string> = {
  housing: 'Home',
  healthcare: 'Heart',
  financial: 'Banknote',
  employment: 'Briefcase',
  legal: 'Scale',
  education: 'GraduationCap',
};
