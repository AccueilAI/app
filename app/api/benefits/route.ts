import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/client';
import { createClient } from '@/lib/supabase/server';
import { matchBenefits } from '@/lib/benefits/eligibility';
import type { BenefitCategory } from '@/lib/benefits/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const category = searchParams.get('category') as BenefitCategory | null;
    const matched = searchParams.get('matched') === 'true';

    const supabase = getSupabase();
    let query = supabase.from('benefits').select('*').eq('is_active', true);

    if (category) {
      query = query.eq('category', category);
    }

    const { data: benefits, error } = await query.order('category');

    if (error) {
      console.error('[api/benefits] query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch benefits' },
        { status: 500 },
      );
    }

    let matchedIds: string[] = [];
    let partialIds: string[] = [];

    if (matched) {
      try {
        const authSupabase = await createClient();
        const {
          data: { user },
        } = await authSupabase.auth.getUser();

        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (profile) {
            const result = matchBenefits(benefits ?? [], profile);
            matchedIds = result.matched;
            partialIds = result.partial;
          }
        }
      } catch {
        // Not authenticated — return all without matches
      }
    }

    return NextResponse.json({ benefits: benefits ?? [], matchedIds, partialIds });
  } catch (err) {
    console.error('[api/benefits] unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
