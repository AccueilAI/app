import { getSupabase } from '@/lib/supabase/client';

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
