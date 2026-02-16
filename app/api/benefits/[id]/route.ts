import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = getSupabase();

    // Fetch benefit first to get category for experience matching
    const { data: benefit, error: benefitError } = await supabase
      .from('benefits')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (benefitError || !benefit) {
      return NextResponse.json(
        { error: 'Benefit not found' },
        { status: 404 },
      );
    }

    const [updatesResult, experienceResult] = await Promise.all([
      supabase
        .from('benefit_updates')
        .select('*')
        .eq('benefit_id', id)
        .eq('is_relevant', true)
        .order('published_at', { ascending: false })
        .limit(10),
      supabase
        .from('experiences')
        .select('id', { count: 'exact', head: true })
        .ilike('procedure_type', `%${benefit.category}%`),
    ]);

    return NextResponse.json({
      benefit,
      updates: updatesResult.data ?? [],
      experienceCount: experienceResult.count ?? 0,
    });
  } catch (err) {
    console.error('[api/benefits/[id]] unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
