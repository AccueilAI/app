import { getSupabase } from '@/lib/supabase/client';
import { searchAddress } from '@/lib/apis/ban';
import { getCommuneByPostcode } from '@/lib/apis/geo';
import { getHolidays } from '@/lib/apis/jours-feries';
import { buildExpatSituation, calculate } from '@/lib/apis/openfisca';

export function getFunctionTools() {
  return [
    {
      type: 'function' as const,
      name: 'search_prefecture',
      description:
        'Find prefecture or government office contact info by city or department name. Returns address, phone, hours, appointment URL.',
      strict: true,
      parameters: {
        type: 'object' as const,
        properties: {
          query: {
            type: 'string' as const,
            description: 'City name, department name, or department number',
          },
        },
        required: ['query'],
        additionalProperties: false,
      },
    },
    {
      type: 'function' as const,
      name: 'get_user_profile',
      description:
        'Get the current user profile including nationality, visa type, prefecture, and arrival date. Use this to personalize advice.',
      strict: true,
      parameters: {
        type: 'object' as const,
        properties: {},
        additionalProperties: false,
      },
    },
    {
      type: 'function' as const,
      name: 'search_address',
      description:
        'Search for a French address. Returns matching addresses with postal code, city, and department context. Useful for finding offices, prefectures, or verifying addresses.',
      strict: true,
      parameters: {
        type: 'object' as const,
        properties: {
          query: {
            type: 'string' as const,
            description:
              'Address text to search (e.g., "Préfecture de Paris", "10 rue de la Paix 75002")',
          },
        },
        required: ['query'],
        additionalProperties: false,
      },
    },
    {
      type: 'function' as const,
      name: 'lookup_commune',
      description:
        'Look up French communes by postal code. Returns commune name, department code, region, and population. One postal code can map to multiple communes.',
      strict: true,
      parameters: {
        type: 'object' as const,
        properties: {
          postcode: {
            type: 'string' as const,
            description: 'French postal code (e.g., "75001", "69003")',
          },
        },
        required: ['postcode'],
        additionalProperties: false,
      },
    },
    {
      type: 'function' as const,
      name: 'get_french_holidays',
      description:
        'Get French public holidays for a given year. Useful for deadline calculations and checking if government offices are open.',
      strict: true,
      parameters: {
        type: 'object' as const,
        properties: {
          year: {
            type: 'number' as const,
            description: 'Year to check (e.g., 2026)',
          },
        },
        required: ['year'],
        additionalProperties: false,
      },
    },
    {
      type: 'function' as const,
      name: 'check_benefit_eligibility',
      description:
        'Estimate eligibility for French social benefits (RSA, APL, prime d\'activité) using OpenFisca microsimulation. Results are indicative — actual eligibility may vary.',
      strict: true,
      parameters: {
        type: 'object' as const,
        properties: {
          age: {
            type: 'number' as const,
            description: 'Age of the person',
          },
          nationality: {
            type: 'string' as const,
            description: 'ISO country code (e.g., "FR", "US", "KR")',
          },
          monthly_income: {
            type: 'number' as const,
            description: 'Monthly net income in euros',
          },
          has_children: {
            type: 'boolean' as const,
            description: 'Whether the person has children',
          },
        },
        required: ['age', 'nationality', 'monthly_income', 'has_children'],
        additionalProperties: false,
      },
    },
  ];
}

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  userId: string | null,
): Promise<unknown> {
  const t0 = Date.now();
  let result: unknown;
  switch (name) {
    case 'search_prefecture':
      result = await searchPrefecture(args.query as string);
      break;
    case 'get_user_profile':
      result = await getUserProfile(userId);
      break;
    case 'search_address':
      result = await toolSearchAddress(args.query as string);
      break;
    case 'lookup_commune':
      result = await toolLookupCommune(args.postcode as string);
      break;
    case 'get_french_holidays':
      result = await toolGetHolidays(args.year as number);
      break;
    case 'check_benefit_eligibility':
      result = await toolCheckBenefits(
        args as {
          age: number;
          nationality: string;
          monthly_income: number;
          has_children: boolean;
        },
      );
      break;
    default:
      result = { error: 'Unknown function' };
  }
  console.log(
    `[tools] ${name} executed in ${Date.now() - t0}ms | args=${JSON.stringify(args).slice(0, 100)}`,
  );
  return result;
}

async function searchPrefecture(query: string) {
  const supabase = getSupabase();
  const sanitized = query.replace(/[%_]/g, '');
  const { data } = await supabase
    .from('government_offices')
    .select('name, address, phone, email, hours, url, service_types')
    .or(
      `name.ilike.%${sanitized}%,city.ilike.%${sanitized}%,address.ilike.%${sanitized}%,department.ilike.%${sanitized}%`,
    )
    .limit(3);
  return data ?? [];
}

async function getUserProfile(userId: string | null) {
  if (!userId) return { error: 'User not authenticated' };
  const supabase = getSupabase();
  const { data } = await supabase
    .from('profiles')
    .select('nationality, visa_type, arrival_date, prefecture, language')
    .eq('id', userId)
    .single();
  return data ?? { error: 'Profile not found' };
}

async function toolSearchAddress(query: string) {
  try {
    const results = await searchAddress(query, { limit: 3 });
    return results.map((r) => ({
      address: r.label,
      postcode: r.postcode,
      city: r.city,
      context: r.context,
    }));
  } catch (err) {
    return { error: (err as Error).message };
  }
}

async function toolLookupCommune(postcode: string) {
  try {
    const communes = await getCommuneByPostcode(postcode);
    return communes.map((c) => ({
      name: c.nom,
      code: c.code,
      department: c.codeDepartement,
      region: c.codeRegion,
      population: c.population,
    }));
  } catch (err) {
    return { error: (err as Error).message };
  }
}

async function toolGetHolidays(year: number) {
  try {
    const holidays = await getHolidays(year || undefined);
    return Object.entries(holidays).map(([date, name]) => ({ date, name }));
  } catch (err) {
    return { error: (err as Error).message };
  }
}

async function toolCheckBenefits(params: {
  age: number;
  nationality: string;
  monthly_income: number;
  has_children: boolean;
}) {
  try {
    const situation = buildExpatSituation({
      age: params.age,
      nationality: params.nationality,
      income: params.monthly_income,
      hasChildren: params.has_children,
    });

    // Add benefit variables to compute at appropriate entity levels
    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Family-level benefits
    for (const v of ['rsa', 'prime_activite']) {
      situation.familles.famille1[v] = { [period]: null };
    }
    // Housing benefits
    situation.menages.menage1['apl'] = { [period]: null };
    // Individual benefits
    for (const v of ['aah', 'aspa']) {
      situation.individus.demandeur[v] = { [period]: null };
    }

    const result = await calculate(situation);
    if (!result) return { error: 'OpenFisca calculation failed' };

    const benefits: Record<string, number> = {};

    // Extract family-level results
    for (const v of ['rsa', 'prime_activite']) {
      const val = (result.familles.famille1[v] as Record<string, number>)?.[period];
      if (val && val > 0) benefits[v] = Math.round(val * 100) / 100;
    }
    // Housing results
    const aplVal = (result.menages.menage1['apl'] as Record<string, number>)?.[period];
    if (aplVal && aplVal > 0) benefits['apl'] = Math.round(aplVal * 100) / 100;
    // Individual results
    for (const v of ['aah', 'aspa']) {
      const val = (result.individus.demandeur[v] as Record<string, number>)?.[period];
      if (val && val > 0) benefits[v] = Math.round(val * 100) / 100;
    }

    return {
      eligible_benefits: benefits,
      note: 'Estimates only. Actual eligibility depends on many factors. Consult CAF or local social services.',
    };
  } catch (err) {
    return { error: (err as Error).message };
  }
}
