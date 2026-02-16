import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@/lib/supabase/server';

let openaiClient: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (openaiClient) return openaiClient;
  openaiClient = new OpenAI();
  return openaiClient;
}

// GET: list user's conversations (newest first, limit 50)
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('conversations')
    .select('id, title, created_at, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('[conversations] List error:', error);
    return NextResponse.json(
      { error: 'Failed to load conversations' },
      { status: 500 },
    );
  }

  return NextResponse.json({ conversations: data });
}

// POST: create new conversation (auto-generate title from first message)
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Generate title from first message
  let title = 'New Conversation';
  if (body.message) {
    title = await generateTitle(body.message);
  }

  const { data, error } = await supabase
    .from('conversations')
    .insert({ user_id: user.id, title })
    .select('id, title, created_at, updated_at')
    .single();

  if (error) {
    console.error('[conversations] Create error:', error);
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 },
    );
  }

  return NextResponse.json({ conversation: data }, { status: 201 });
}

// DELETE: delete a conversation by id (query param)
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json(
      { error: 'Missing conversation id' },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('[conversations] Delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete conversation' },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}

async function generateTitle(message: string): Promise<string> {
  try {
    const openai = getOpenAI();
    const response = await openai.responses.create({
      model: 'gpt-5-mini',
      max_output_tokens: 256,
      instructions:
        'Generate a very short title (3-6 words) for this conversation. Return only the title, no quotes, no punctuation at the end. Use the same language as the message.',
      input: message.slice(0, 200),
    });
    const raw = response.output_text?.trim().replace(/^["']+|["']+$/g, '');
    if (raw && raw.length > 0 && raw !== 'New Conversation') return raw;
  } catch {
    // fall through to fallback
  }
  const fallback = message.trim().slice(0, 40).replace(/\s+\S*$/, '');
  return fallback || 'New Conversation';
}
