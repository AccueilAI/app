import type { Benefit, EligibilityRules } from './types';
import type { UserProfile } from '@/lib/auth/types';
import { normalizeVisaType } from './visa-mapping';

export function matchBenefits(
  benefits: Benefit[],
  profile: UserProfile,
): { matched: string[]; partial: string[] } {
  const matched: string[] = [];
  const partial: string[] = [];

  for (const b of benefits) {
    const result = checkEligibility(b.eligibility_rules, profile);
    if (result === 'eligible') matched.push(b.id);
    else if (result === 'maybe') partial.push(b.id);
  }

  return { matched, partial };
}

type EligibilityResult = 'eligible' | 'maybe' | 'ineligible';

function checkEligibility(
  rules: EligibilityRules,
  profile: UserProfile,
): EligibilityResult {
  let hasUnchecked = false;

  // 1. Visa type check
  if (rules.visa_types?.length && !rules.visa_types.includes('any')) {
    const normalized = normalizeVisaType(profile.visa_type);
    if (!normalized) {
      hasUnchecked = true;
    } else if (!rules.visa_types.includes(normalized)) {
      return 'ineligible';
    }
  }

  // 2. Minimum residency months
  if (rules.min_residency_months) {
    if (!profile.arrival_date) {
      hasUnchecked = true;
    } else {
      const months = monthsSince(profile.arrival_date);
      if (months < rules.min_residency_months) return 'ineligible';
    }
  }

  // 3. Nationality exclusions
  if (rules.nationalities_excluded?.length) {
    if (!profile.nationality) {
      hasUnchecked = true;
    } else if (rules.nationalities_excluded.includes(profile.nationality)) {
      return 'ineligible';
    }
  }

  // 4. Age range
  if (rules.age_range && (rules.age_range.min != null || rules.age_range.max != null)) {
    if (!profile.birth_date) {
      hasUnchecked = true;
    } else {
      const age = calculateAge(profile.birth_date);
      if (rules.age_range.min != null && age < rules.age_range.min) return 'ineligible';
      if (rules.age_range.max != null && age > rules.age_range.max) return 'ineligible';
    }
  }

  // 5. Has children
  if (rules.has_children === true) {
    if (!profile.has_children) return 'ineligible';
  }

  // 6. Requires employment
  if (rules.requires_employment === true) {
    if (profile.employment_status === 'unknown') {
      hasUnchecked = true;
    } else if (
      profile.employment_status !== 'employed' &&
      profile.employment_status !== 'self_employed'
    ) {
      return 'ineligible';
    }
  }

  // 7. Requires legal residency — infer from visa_type
  if (rules.requires_legal_residency === true) {
    if (!profile.visa_type) {
      hasUnchecked = true;
    }
  }

  return hasUnchecked ? 'maybe' : 'eligible';
}

function monthsSince(dateStr: string): number {
  const d = new Date(dateStr);
  const now = new Date();
  return (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
}

function calculateAge(birthDateStr: string): number {
  const birth = new Date(birthDateStr);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}
