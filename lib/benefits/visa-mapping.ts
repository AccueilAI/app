// Canonical visa types used in eligibility_rules
export type CanonicalVisaType = 'student' | 'talent' | 'salarié' | 'family' | 'visitor' | 'other';

// Map profile visa_type values → canonical for matching
const VISA_TYPE_MAP: Record<string, CanonicalVisaType> = {
  'student': 'student',
  'salarié': 'salarié',
  'talent': 'talent',
  'family': 'family',
  'visitor': 'visitor',
  'other': 'other',
  // Legacy display values from existing profile data
  'Student': 'student',
  'Talent Passport': 'talent',
  'VLS-TS': 'student',
  'APS': 'student',
  'Salarié': 'salarié',
  'Vie Privée et Familiale': 'family',
  'Visiteur': 'visitor',
  'Other': 'other',
};

export function normalizeVisaType(profileVisaType: string | null): CanonicalVisaType | null {
  if (!profileVisaType) return null;
  return VISA_TYPE_MAP[profileVisaType] ?? 'other';
}

export const VISA_TYPE_OPTIONS = [
  { value: 'student', labelKey: 'visaTypes.student' },
  { value: 'talent', labelKey: 'visaTypes.talent' },
  { value: 'salarié', labelKey: 'visaTypes.salaried' },
  { value: 'family', labelKey: 'visaTypes.family' },
  { value: 'visitor', labelKey: 'visaTypes.visitor' },
  { value: 'other', labelKey: 'visaTypes.other' },
] as const;
