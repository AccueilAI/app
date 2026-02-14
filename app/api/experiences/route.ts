import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabase } from '@/lib/supabase/client';
import { PROCEDURE_TYPES } from '@/lib/experiences/types';
import type { ProcedureType } from '@/lib/experiences/types';
import { feedbackRateLimit } from '@/lib/rate-limit';
import { getRateLimitKey } from '@/lib/session';

const VALID_OUTCOMES = ['approved', 'rejected', 'pending', 'other'];
const PAGE_SIZE = 20;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mine = searchParams.get('mine');

  // Return only the authenticated user's experiences
  if (mine === 'true') {
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
    const { data, error } = await supabase
      .from('experiences')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch.' },
        { status: 500 },
      );
    }
    return NextResponse.json({ experiences: data ?? [], nextCursor: null });
  }

  const procedureType = searchParams.get('procedure_type');
  const prefecture = searchParams.get('prefecture');
  const cursor = searchParams.get('cursor');
  const sort = searchParams.get('sort') || 'recent';

  const supabase = getSupabase();

  let query = supabase.from('experiences').select('*').limit(PAGE_SIZE);

  if (
    procedureType &&
    PROCEDURE_TYPES.includes(procedureType as ProcedureType)
  ) {
    query = query.eq('procedure_type', procedureType);
  }
  if (prefecture) {
    query = query.ilike('prefecture', `%${prefecture}%`);
  }

  if (sort === 'helpful') {
    query = query
      .order('helpful_count', { ascending: false })
      .order('created_at', { ascending: false });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data: experiences, error } = await query;

  if (error) {
    console.error('[experiences] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch experiences.' },
      { status: 500 },
    );
  }

  const items = experiences ?? [];
  let enriched = items;

  if (items.length > 0) {
    const userIds = [...new Set(items.map((e) => e.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', userIds);

    if (profiles) {
      const profileMap = new Map(profiles.map((p) => [p.id, p]));
      enriched = items.map((exp) => ({
        ...exp,
        profiles: profileMap.get(exp.user_id) || { display_name: null },
      }));
    }
  }

  return NextResponse.json({
    experiences: enriched,
    nextCursor:
      items.length === PAGE_SIZE ? items[items.length - 1].created_at : null,
  });
}

export async function POST(request: NextRequest) {
  const { key } = getRateLimitKey(request);
  const { success: rateLimitOk } = await feedbackRateLimit.limit(key);
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
    return NextResponse.json(
      { error: 'Invalid JSON in request body.' },
      { status: 400 },
    );
  }

  const procedureType = String(body.procedure_type ?? '');
  if (
    !PROCEDURE_TYPES.includes(
      procedureType as (typeof PROCEDURE_TYPES)[number],
    )
  ) {
    return NextResponse.json(
      { error: 'Invalid procedure_type.' },
      { status: 400 },
    );
  }

  const difficulty = body.difficulty != null ? Number(body.difficulty) : null;
  if (
    difficulty != null &&
    (difficulty < 1 || difficulty > 5 || !Number.isInteger(difficulty))
  ) {
    return NextResponse.json(
      { error: 'Difficulty must be between 1 and 5.' },
      { status: 400 },
    );
  }

  const outcome = body.outcome ? String(body.outcome) : null;
  if (outcome && !VALID_OUTCOMES.includes(outcome)) {
    return NextResponse.json({ error: 'Invalid outcome.' }, { status: 400 });
  }

  const tips = body.tips ? String(body.tips).slice(0, 2000) : null;
  const waitTimeDays =
    body.wait_time_days != null ? Number(body.wait_time_days) : null;
  const documentsUsed = Array.isArray(body.documents_used)
    ? body.documents_used.map(String).slice(0, 20)
    : null;

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('experiences')
    .insert({
      user_id: user.id,
      procedure_type: procedureType,
      prefecture: body.prefecture ? String(body.prefecture) : null,
      city: body.city ? String(body.city) : null,
      nationality: body.nationality ? String(body.nationality) : null,
      visa_type: body.visa_type ? String(body.visa_type) : null,
      wait_time_days: waitTimeDays,
      difficulty,
      documents_used: documentsUsed,
      tips,
      outcome,
      experience_date: body.experience_date
        ? String(body.experience_date)
        : null,
    })
    .select()
    .single();

  if (error) {
    console.error('[experiences] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create experience.' },
      { status: 500 },
    );
  }

  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(request: NextRequest) {
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

  let body: { id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  if (!body.id) {
    return NextResponse.json(
      { error: 'Experience ID required.' },
      { status: 400 },
    );
  }

  const supabase = getSupabase();

  // Verify ownership
  const { data: existing } = await supabase
    .from('experiences')
    .select('user_id')
    .eq('id', body.id)
    .single();

  if (!existing || existing.user_id !== user.id) {
    return NextResponse.json(
      { error: 'Not found or not authorized.' },
      { status: 404 },
    );
  }

  const { error } = await supabase
    .from('experiences')
    .delete()
    .eq('id', body.id);
  if (error) {
    return NextResponse.json(
      { error: 'Failed to delete.' },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(request: NextRequest) {
  const { key } = getRateLimitKey(request);
  const { success: rateLimitOk } = await feedbackRateLimit.limit(
    `helpful:${key}`,
  );
  if (!rateLimitOk) {
    return NextResponse.json(
      { error: 'Too many requests.' },
      { status: 429 },
    );
  }

  let body: { id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  if (!body.id) {
    return NextResponse.json(
      { error: 'Experience ID required.' },
      { status: 400 },
    );
  }

  const supabase = getSupabase();

  const { data: existing } = await supabase
    .from('experiences')
    .select('helpful_count')
    .eq('id', body.id)
    .single();

  if (!existing) {
    return NextResponse.json(
      { error: 'Experience not found.' },
      { status: 404 },
    );
  }

  const { error: updateError } = await supabase
    .from('experiences')
    .update({ helpful_count: existing.helpful_count + 1 })
    .eq('id', body.id);

  if (updateError) {
    console.error('[experiences] PATCH error:', updateError);
    return NextResponse.json(
      { error: 'Failed to update.' },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
