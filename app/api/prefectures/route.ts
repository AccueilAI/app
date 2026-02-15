import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/client';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim() ?? '';

  const supabase = getSupabase();

  let query = supabase
    .from('government_offices')
    .select('name, department, city')
    .eq('office_type', 'prefecture')
    .order('department', { ascending: true })
    .limit(200);

  if (q) {
    query = query.or(`name.ilike.%${q}%,department.ilike.%${q}%,city.ilike.%${q}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[prefectures] Query error:', error.message);
    return NextResponse.json([], { status: 500 });
  }

  const prefectures = (data ?? []).map((row) => ({
    value: row.name,
    label: row.name,
    detail: row.department ? `${row.department}${row.city ? ` - ${row.city}` : ''}` : undefined,
  }));

  return NextResponse.json(prefectures);
}
