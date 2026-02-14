import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { ragSearch } from '@/lib/search/pipeline';
import { reformulateQuery } from '@/lib/search/query-preprocessing';
import { buildSystemPrompt } from '@/lib/chat/system-prompt';
import { getSupabase } from '@/lib/supabase/client';
import { compactHistory, estimateTokens } from '@/lib/chat/token-manager';
import { verifyResponse } from '@/lib/chat/hallucination-detector';
import { chatRateLimit } from '@/lib/rate-limit';
import { getRateLimitKey, sessionCookieHeader } from '@/lib/session';
import type { ChatRequestBody, ChatSource } from '@/lib/chat/types';

// --- OpenAI Singleton ---

let openaiClient: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (openaiClient) return openaiClient;
  openaiClient = new OpenAI();
  return openaiClient;
}

// --- SSE Helpers ---

const encoder = new TextEncoder();

function sseEvent(event: string, data: unknown): Uint8Array {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

// --- Route Handler ---

export async function POST(request: NextRequest) {
  // Session + rate limiting
  const { key, sessionId, isNewSession } = getRateLimitKey(request);
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';

  const { success } = await chatRateLimit.limit(key);
  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 },
    );
  }

  // Parse body
  let body: ChatRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON in request body.' },
      { status: 400 },
    );
  }

  // Validate messages
  if (
    !body.messages ||
    !Array.isArray(body.messages) ||
    body.messages.length === 0
  ) {
    return NextResponse.json(
      { error: 'Field "messages" must be a non-empty array.' },
      { status: 400 },
    );
  }

  const lastMessage = body.messages[body.messages.length - 1];
  if (lastMessage.role !== 'user' || !lastMessage.content?.trim()) {
    return NextResponse.json(
      { error: 'Last message must be a non-empty user message.' },
      { status: 400 },
    );
  }

  // Input length limits
  const MAX_MESSAGE_LENGTH = 2000;
  const MAX_MESSAGES = 50;

  if (lastMessage.content.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      { error: `Message exceeds ${MAX_MESSAGE_LENGTH} character limit.` },
      { status: 400 },
    );
  }

  if (body.messages.length > MAX_MESSAGES) {
    return NextResponse.json(
      { error: `Conversation exceeds ${MAX_MESSAGES} message limit.` },
      { status: 400 },
    );
  }

  // Truncate older messages to limit total token cost
  body.messages = body.messages.map((m) => ({
    ...m,
    content: m.content.slice(0, MAX_MESSAGE_LENGTH),
  }));

  const language = body.language || 'en';

  // Create SSE stream
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // 1. Reformulate query with conversation context, then RAG search
        console.log('[chat] Reformulating query...');
        const searchQuery = await reformulateQuery(
          body.messages.map((m) => ({ role: m.role, content: m.content })),
        );
        console.log('[chat] Search query:', searchQuery);
        const searchResponse = await ragSearch(searchQuery, {
          language,
          count: 8,
        });
        console.log('[chat] RAG results:', searchResponse.results.length);

        // 2. Send sources event
        const sources: ChatSource[] = searchResponse.results.map((r) => ({
          content: r.content,
          source: r.source,
          doc_type: r.doc_type,
          ...(r.article_number && { article_number: r.article_number }),
          ...(r.source_url && { source_url: r.source_url }),
          score: r.score,
        }));
        controller.enqueue(sseEvent('sources', { sources }));

        // 3. Build system prompt with RAG context
        const systemPrompt = buildSystemPrompt(
          searchResponse.results,
          language,
        );

        // 4. Compact conversation history if exceeding token budget
        const systemTokenEstimate = estimateTokens([], systemPrompt);
        const compacted = await compactHistory(
          body.messages.map((m) => ({ role: m.role, content: m.content })),
          systemTokenEstimate,
        );
        const conversationInput = compacted.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));

        // 5. Stream response
        const openai = getOpenAI();
        console.log('[chat] Starting OpenAI stream...');
        console.log('[chat] Input messages:', conversationInput.length, 'System prompt tokens:', systemTokenEstimate);
        const completionStream = await openai.chat.completions.create({
          model: 'gpt-5-nano',
          messages: [
            { role: 'system' as const, content: systemPrompt },
            ...conversationInput,
          ],
          max_completion_tokens: 2048,
          stream: true,
        });

        let assistantResponse = '';
        let finishReason = '';
        for await (const chunk of completionStream) {
          const delta = chunk.choices[0]?.delta?.content;
          if (delta) {
            assistantResponse += delta;
            controller.enqueue(sseEvent('token', { text: delta }));
          }
          if (chunk.choices[0]?.finish_reason) {
            finishReason = chunk.choices[0].finish_reason;
          }
        }
        console.log('[chat] Stream done. Response length:', assistantResponse.length, 'chars, finish_reason:', finishReason);

        // 6. Verify response against sources (hallucination detection)
        const sourcesTextForVerification = sources
          .map((s, i) => `[Source ${i + 1}] (${s.doc_type}: ${s.source})\n${s.content}`)
          .join('\n\n');
        const verification = await verifyResponse(
          assistantResponse,
          sourcesTextForVerification,
        );
        controller.enqueue(sseEvent('verification', verification));

        // 7. Done
        controller.enqueue(sseEvent('done', {}));

        // 8. Log conversation to Supabase (fire-and-forget)
        logConversation({
          userMessage: lastMessage.content.trim(),
          assistantMessage: assistantResponse,
          language,
          sourceCount: sources.length,
          ip,
        }).catch((err) => console.error('Chat log error:', err));
      } catch (err) {
        console.error('[chat] Stream error:', err);
        console.error('[chat] Error details:', (err as Error).message, (err as Error).stack);
        controller.enqueue(
          sseEvent('error', {
            message: 'An error occurred while generating a response.',
          }),
        );
      } finally {
        controller.close();
      }
    },
  });

  const headers: HeadersInit = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  };
  if (isNewSession) {
    headers['Set-Cookie'] = sessionCookieHeader(sessionId);
  }

  return new Response(stream, { headers });
}

// --- Conversation Logging ---

async function logConversation(params: {
  userMessage: string;
  assistantMessage: string;
  language: string;
  sourceCount: number;
  ip: string;
}) {
  const supabase = getSupabase();
  await supabase.from('chat_logs').insert({
    user_message: params.userMessage,
    assistant_message: params.assistantMessage,
    language: params.language,
    source_count: params.sourceCount,
    ip_hash: await hashIP(params.ip),
    created_at: new Date().toISOString(),
  });
}

async function hashIP(ip: string): Promise<string> {
  const data = new TextEncoder().encode(ip + (process.env.IP_HASH_SALT ?? ''));
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16);
}
