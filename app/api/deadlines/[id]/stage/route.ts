import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { DEADLINE_STAGES, type DeadlineStage } from '@/lib/deadlines/types';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const stage = body.stage as DeadlineStage;

    if (!stage || !DEADLINE_STAGES.includes(stage)) {
      return NextResponse.json(
        {
          error: `Invalid stage. Must be one of: ${DEADLINE_STAGES.join(', ')}`,
        },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from('deadlines')
      .update({ stage, stage_updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Deadline not found or not owned by you' },
        { status: 404 },
      );
    }

    return NextResponse.json({ deadline: data });
  } catch (err) {
    console.error('[api/deadlines/[id]/stage] unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
