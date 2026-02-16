import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/client';
import { notifyAdminBenefitReview } from '@/lib/benefits/admin-notifier';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = getSupabase();
    const currentMonth = new Date().getMonth() + 1; // 1-12

    // Find benefits with scheduled updates this month
    const { data: schedules } = await supabase
      .from('benefit_update_schedule')
      .select('benefit_id, description')
      .eq('expected_update_month', currentMonth);

    if (!schedules || schedules.length === 0) {
      return NextResponse.json({ flagged: 0 });
    }

    const benefitIds = schedules.map(s => s.benefit_id).filter(Boolean);

    // Flag benefits for review
    if (benefitIds.length > 0) {
      await supabase
        .from('benefits')
        .update({ needs_review: true })
        .in('id', benefitIds);
    }

    // Update last_checked_at
    await supabase
      .from('benefit_update_schedule')
      .update({ last_checked_at: new Date().toISOString() })
      .eq('expected_update_month', currentMonth);

    // Get benefit details for notification
    const { data: benefits } = await supabase
      .from('benefits')
      .select('id, slug, name_fr')
      .in('id', benefitIds);

    if (benefits && benefits.length > 0) {
      await notifyAdminBenefitReview(
        benefits.map(b => ({
          ...b,
          reason: `Scheduled ${currentMonth === 4 ? 'April revalorisation' : 'monthly update'}`,
        })),
      );
    }

    return NextResponse.json({ flagged: benefitIds.length });
  } catch (err) {
    console.error('[benefit-schedule-check] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
