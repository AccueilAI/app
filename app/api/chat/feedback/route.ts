import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/client';

interface FeedbackBody {
  messageId: string;
  rating: 'up' | 'down';
  userQuery?: string;
  assistantResponse?: string;
  sourceCount?: number;
  language?: string;
}

export async function POST(request: NextRequest) {
  let body: FeedbackBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  if (!body.messageId || !['up', 'down'].includes(body.rating)) {
    return NextResponse.json(
      { error: 'messageId and rating (up|down) are required.' },
      { status: 400 },
    );
  }

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';

  const ipHash = await hashIP(ip);

  const supabase = getSupabase();
  const { error } = await supabase.from('chat_feedback').insert({
    message_id: body.messageId,
    rating: body.rating,
    user_query: body.userQuery ?? null,
    assistant_response: body.assistantResponse?.slice(0, 2000) ?? null,
    source_count: body.sourceCount ?? null,
    language: body.language ?? null,
    ip_hash: ipHash,
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error('Feedback insert error:', error);
    return NextResponse.json(
      { error: 'Failed to save feedback.' },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

async function hashIP(ip: string): Promise<string> {
  const data = new TextEncoder().encode(ip + (process.env.IP_HASH_SALT ?? ''));
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16);
}
