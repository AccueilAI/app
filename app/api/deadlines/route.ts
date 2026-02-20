import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabase } from '@/lib/supabase/client';
import { DEADLINE_TYPES } from '@/lib/deadlines/types';
import type { DeadlineType } from '@/lib/deadlines/types';
import { deadlineRateLimit } from '@/lib/rate-limit';
import { getRateLimitKey } from '@/lib/session';
import { TIER_LIMITS, type SubscriptionTier } from '@/lib/auth/types';

/** Resolve effective tier from profiles table, checking expiration. */
async function resolveUserTier(userId: string): Promise<SubscriptionTier> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('profiles')
    .select('subscription_tier, subscription_expires_at')
    .eq('id', userId)
    .single();
  if (!data?.subscription_tier || data.subscription_tier === 'free') return 'free';
  if (data.subscription_tier === 'admin') return 'admin';
  if (data.subscription_expires_at && new Date(data.subscription_expires_at) <= new Date()) {
    return 'free';
  }
  return data.subscription_tier as SubscriptionTier;
}

export async function GET() {
  const authSupabase = await createClient();
  const {
    data: { user },
  } = await authSupabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required.' },
      { status: 401 },
    );
  }

  const supabase = getSupabase();
  const { data: deadlines, error } = await supabase
    .from('deadlines')
    .select('*')
    .eq('user_id', user.id)
    .order('deadline_date', { ascending: true });

  if (error) {
    console.error('[deadlines] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch deadlines.' },
      { status: 500 },
    );
  }

  return NextResponse.json({ deadlines: deadlines ?? [] });
}

export async function POST(request: NextRequest) {
  const { key } = getRateLimitKey(request);
  const { success: rateLimitOk } = await deadlineRateLimit.limit(key);
  if (!rateLimitOk) {
    return NextResponse.json(
      { error: 'Too many requests.' },
      { status: 429 },
    );
  }

  const authSupabase = await createClient();
  const {
    data: { user },
  } = await authSupabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required.' },
      { status: 401 },
    );
  }

  // Tier enforcement: check maxDeadlines
  const tier = await resolveUserTier(user.id);
  const maxDeadlines = TIER_LIMITS[tier].maxDeadlines;

  if (maxDeadlines === 0) {
    return NextResponse.json(
      { error: 'tier_required', tier },
      { status: 403 },
    );
  }

  if (maxDeadlines !== Infinity) {
    const supabaseCount = getSupabase();
    const { count } = await supabaseCount
      .from('deadlines')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);
    if ((count ?? 0) >= maxDeadlines) {
      return NextResponse.json(
        { error: 'deadline_limit', limit: maxDeadlines, tier },
        { status: 429 },
      );
    }
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON in request body.' },
      { status: 400 },
    );
  }

  const deadlineType = String(body.deadline_type ?? '');
  if (!DEADLINE_TYPES.includes(deadlineType as DeadlineType)) {
    return NextResponse.json(
      { error: 'Invalid deadline_type.' },
      { status: 400 },
    );
  }

  const title = String(body.title ?? '').trim();
  if (!title) {
    return NextResponse.json(
      { error: 'Title is required.' },
      { status: 400 },
    );
  }

  const deadlineDate = String(body.deadline_date ?? '').trim();
  if (!deadlineDate) {
    return NextResponse.json(
      { error: 'Deadline date is required.' },
      { status: 400 },
    );
  }

  const daysBefore =
    body.days_before_reminder != null
      ? Number(body.days_before_reminder)
      : 7;
  if (daysBefore < 0 || daysBefore > 365 || !Number.isInteger(daysBefore)) {
    return NextResponse.json(
      { error: 'days_before_reminder must be between 0 and 365.' },
      { status: 400 },
    );
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('deadlines')
    .insert({
      user_id: user.id,
      title: title.slice(0, 200),
      deadline_type: deadlineType,
      deadline_date: deadlineDate,
      description: body.description
        ? String(body.description).slice(0, 1000)
        : null,
      days_before_reminder: daysBefore,
    })
    .select()
    .single();

  if (error) {
    console.error('[deadlines] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create deadline.' },
      { status: 500 },
    );
  }

  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const { key } = getRateLimitKey(request);
  const { success: rateLimitOk } = await deadlineRateLimit.limit(
    `patch:${key}`,
  );
  if (!rateLimitOk) {
    return NextResponse.json(
      { error: 'Too many requests.' },
      { status: 429 },
    );
  }

  const authSupabase = await createClient();
  const {
    data: { user },
  } = await authSupabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required.' },
      { status: 401 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const id = String(body.id ?? '');
  if (!id) {
    return NextResponse.json(
      { error: 'Deadline ID required.' },
      { status: 400 },
    );
  }

  const supabase = getSupabase();

  // Verify ownership
  const { data: existing } = await supabase
    .from('deadlines')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!existing) {
    return NextResponse.json(
      { error: 'Deadline not found.' },
      { status: 404 },
    );
  }

  // Build update payload
  const updates: Record<string, unknown> = {};
  if (typeof body.completed === 'boolean') updates.completed = body.completed;
  if (typeof body.title === 'string')
    updates.title = String(body.title).slice(0, 200);
  if (typeof body.deadline_type === 'string') {
    if (!DEADLINE_TYPES.includes(body.deadline_type as DeadlineType)) {
      return NextResponse.json(
        { error: 'Invalid deadline_type.' },
        { status: 400 },
      );
    }
    updates.deadline_type = body.deadline_type;
  }
  if (typeof body.deadline_date === 'string')
    updates.deadline_date = body.deadline_date;
  if (body.description !== undefined)
    updates.description = body.description
      ? String(body.description).slice(0, 1000)
      : null;
  if (body.days_before_reminder != null) {
    const d = Number(body.days_before_reminder);
    if (d >= 0 && d <= 365 && Number.isInteger(d))
      updates.days_before_reminder = d;
  }

  // Reset reminder when date changes
  if (updates.deadline_date) updates.reminder_sent = false;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: 'No valid fields to update.' },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from('deadlines')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[deadlines] PATCH error:', error);
    return NextResponse.json(
      { error: 'Failed to update deadline.' },
      { status: 500 },
    );
  }

  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const { key } = getRateLimitKey(request);
  const { success: rateLimitOk } = await deadlineRateLimit.limit(
    `delete:${key}`,
  );
  if (!rateLimitOk) {
    return NextResponse.json(
      { error: 'Too many requests.' },
      { status: 429 },
    );
  }

  const authSupabase = await createClient();
  const {
    data: { user },
  } = await authSupabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required.' },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { error: 'Deadline ID required.' },
      { status: 400 },
    );
  }

  const supabase = getSupabase();

  // Verify ownership and delete
  const { error } = await supabase
    .from('deadlines')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('[deadlines] DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete deadline.' },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
