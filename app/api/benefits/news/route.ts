import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/client';

export async function GET() {
  try {
    const supabase = getSupabase();

    const { data: updates, error } = await supabase
      .from('benefit_updates')
      .select('*, benefit:benefits(*)')
      .eq('is_relevant', true)
      .order('published_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('[api/benefits/news] query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch news' },
        { status: 500 },
      );
    }

    return NextResponse.json({ updates: updates ?? [] });
  } catch (err) {
    console.error('[api/benefits/news] unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
