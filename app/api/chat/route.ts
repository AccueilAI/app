import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { ragSearch } from '@/lib/search/pipeline';
import { reformulateQuery } from '@/lib/search/query-preprocessing';
import { buildSystemPrompt } from '@/lib/chat/system-prompt';
import { getSupabase } from '@/lib/supabase/client';
import {
  compactHistory,
  estimateTokens,
  trimRagContext,
  MAX_INPUT_TOKENS,
  MAX_COMPLETION_TOKENS,
} from '@/lib/chat/token-manager';
import { verifyResponse } from '@/lib/chat/hallucination-detector';
import {
  detectProcedureTypes,
  searchExperiences,
  formatExperiencesForPrompt,
} from '@/lib/experiences/search';
import { chatRateLimit, chatDailyLimit, chatDailyLimitFree } from '@/lib/rate-limit';
import { getRateLimitKey, sessionCookieHeader } from '@/lib/session';
import { createClient } from '@/lib/supabase/server';
import { getFunctionTools, executeTool } from '@/lib/chat/tools';
import { assessRetrievalQuality } from '@/lib/search/quality-gate';
import { extractWebSources } from '@/lib/chat/web-sources';
import { generateFollowUps } from '@/lib/chat/follow-ups';
import type { ChatRequestBody, ChatSource, ProgressStage } from '@/lib/chat/types';

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

function sseProgress(stage: ProgressStage): Uint8Array {
  return sseEvent('progress', { stage });
}

// --- Constants ---

const MAX_TOOL_ROUNDS = 3;

/**
 * Extract only the last assistant message text from response output.
 * Skips intermediate text that appears before/between web search calls.
 */
function extractLastMessageText(
  output: OpenAI.Responses.ResponseOutputItem[],
): string {
  for (let i = output.length - 1; i >= 0; i--) {
    const item = output[i];
    if (item.type === 'message' && 'content' in item) {
      const msg = item as OpenAI.Responses.ResponseOutputMessage;
      const texts: string[] = [];
      for (const part of msg.content) {
        if (part.type === 'output_text' && part.text) {
          texts.push(part.text);
        }
      }
      if (texts.length > 0) return texts.join('');
    }
  }
  return '';
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
  const conversationId = body.conversationId ?? null;

  // Check authentication for daily limit
  let userId: string | null = null;
  let dailyRemaining: number | null = null;
  let effectiveTier: string = 'free';
  try {
    const authSupabase = await createClient();
    const {
      data: { user: authUser },
    } = await authSupabase.auth.getUser();
    userId = authUser?.id ?? null;
  } catch {
    // Auth check failed — treat as unauthenticated
  }

  // Resolve subscription tier for authenticated users
  if (userId) {
    try {
      const supabase = getSupabase();
      const { data: tierData } = await supabase
        .from('profiles')
        .select('subscription_tier, subscription_expires_at')
        .eq('id', userId)
        .single();
      if (tierData?.subscription_tier && tierData.subscription_tier !== 'free') {
        if (tierData.subscription_tier === 'admin') {
          effectiveTier = 'admin';
        } else if (tierData.subscription_expires_at) {
          effectiveTier = new Date(tierData.subscription_expires_at) > new Date()
            ? tierData.subscription_tier
            : 'free';
        } else {
          effectiveTier = tierData.subscription_tier;
        }
      }
    } catch {
      // Tier lookup failed — default to free
    }
  }

  // Daily limits based on auth state + tier
  if (!userId) {
    // Unauthenticated: 3 messages/day
    const { success: dailyOk, remaining } = await chatDailyLimit.limit(key);
    dailyRemaining = remaining;
    if (!dailyOk) {
      return NextResponse.json(
        { error: 'daily_limit', remaining: 0 },
        { status: 429 },
      );
    }
  } else if (effectiveTier === 'free') {
    // Free tier (authenticated): 5 messages/day
    const { success: dailyOk, remaining } = await chatDailyLimitFree.limit(userId);
    dailyRemaining = remaining;
    if (!dailyOk) {
      return NextResponse.json(
        { error: 'daily_limit', remaining: 0, tier: 'free' },
        { status: 429 },
      );
    }
  }
  // essential/premium/admin: no daily limit

  // Create SSE stream
  const stream = new ReadableStream({
    async start(controller) {
      const t0 = Date.now();
      const timings: Record<string, number> = {};
      const mark = (label: string) => { timings[label] = Date.now() - t0; };

      try {
        console.log(
          `[chat] === START === user=${userId ?? 'anon'} lang=${language} msgs=${body.messages.length} convId=${conversationId ?? 'new'}`,
        );
        console.log(
          `[chat] Query: "${lastMessage.content.slice(0, 120)}"`,
        );

        // 1. RAG Search
        controller.enqueue(sseProgress('searching_rag'));
        const searchQuery = await reformulateQuery(
          body.messages.map((m) => ({ role: m.role, content: m.content })),
        );
        mark('reformulate');
        console.log('[chat] Reformulated query:', searchQuery);
        const searchResponse = await ragSearch(searchQuery, {
          language,
          count: 8,
        });
        mark('rag_search');
        console.log(
          `[chat] RAG: ${searchResponse.results.length} results, lang=${searchResponse.query_info.detected_language}, french="${searchResponse.query_info.french_query.slice(0, 80)}"`,
        );

        // 2. Trim RAG results to fit within token budget
        const maxSystemTokens = Math.floor(MAX_INPUT_TOKENS * 0.75);
        const trimmedResults = trimRagContext(
          searchResponse.results,
          (items) => buildSystemPrompt(items, language, ''),
          maxSystemTokens,
        );
        mark('rag_trim');
        console.log(
          `[chat] RAG trim: ${searchResponse.results.length} → ${trimmedResults.length} results (budget=${maxSystemTokens} tokens)`,
        );

        // 2.5. Quality gate: check if sources are sufficient
        const quality = assessRetrievalQuality(trimmedResults);
        mark('quality_gate');
        console.log(
          `[chat] Quality gate: pass=${quality.pass} confidence=${quality.confidence.toFixed(2)} top=${quality.topScore.toFixed(3)} avg=${quality.avgScore.toFixed(3)} sources=${quality.sourceCount} diversity=${quality.sourceDiversity}`,
        );

        if (!quality.pass) {
          controller.enqueue(sseEvent('sources', { sources: [] }));
          controller.enqueue(sseProgress('generating'));

          const insufficientMsg = language === 'fr'
            ? "Je n'ai pas trouvé de sources suffisamment fiables pour répondre à cette question. Je préfère vous le dire plutôt que de risquer une information incorrecte. Essayez de reformuler votre question ou consultez directement service-public.fr."
            : language === 'ko'
            ? '이 질문에 대해 충분히 신뢰할 수 있는 출처를 찾지 못했습니다. 잘못된 정보를 드리는 것보다 솔직하게 말씀드리는 게 낫다고 생각합니다. 질문을 다시 표현해보시거나 service-public.fr를 직접 확인해주세요.'
            : "I couldn't find sufficiently reliable sources to answer this question. I'd rather be honest about this than risk giving you incorrect information. Try rephrasing your question or check service-public.fr directly.";

          controller.enqueue(sseEvent('token', { text: insufficientMsg }));
          controller.enqueue(sseEvent('quality', quality));
          controller.enqueue(sseEvent('done', {
            ...(dailyRemaining !== null ? { remaining: dailyRemaining } : {}),
            ...(conversationId ? { conversationId } : {}),
          }));

          // Log the blocked query
          logConversation({
            userMessage: lastMessage.content.trim(),
            assistantMessage: insufficientMsg,
            language,
            sourceCount: 0,
            ip,
            userId,
            conversationId,
          }).catch((err) => console.error('[chat] DB log error:', err));

          console.log(`[chat] === BLOCKED === Quality gate failed: ${quality.reason}`);
          controller.close();
          return;
        }

        controller.enqueue(sseEvent('quality', quality));

        // 3. Send sources event
        const sources: ChatSource[] = trimmedResults.map((r) => ({
          content: r.content,
          source: r.source,
          doc_type: r.doc_type,
          ...(r.article_number && { article_number: r.article_number }),
          ...(r.source_url && { source_url: r.source_url }),
          ...(r.last_crawled_at && { last_crawled_at: r.last_crawled_at }),
          score: r.score,
        }));
        controller.enqueue(sseEvent('sources', { sources }));

        // 3.5. Search community experiences
        let experienceContext = '';
        const detectedTypes = detectProcedureTypes(searchQuery);
        if (detectedTypes.length > 0) {
          const experiences = await searchExperiences(detectedTypes, 5);
          mark('experiences');
          if (experiences.length > 0) {
            experienceContext = formatExperiencesForPrompt(experiences);
            console.log(
              `[chat] Experiences: ${experiences.length} found for types=[${detectedTypes.join(', ')}]`,
            );
          } else {
            console.log(
              `[chat] Experiences: 0 found for types=[${detectedTypes.join(', ')}]`,
            );
          }
        } else {
          console.log('[chat] Experiences: no procedure types detected, skipped');
        }

        // 3.6. Get user profile for personalization
        let profileContext: string | undefined;
        if (userId) {
          try {
            const supabase = getSupabase();
            const { data: profile } = await supabase
              .from('profiles')
              .select(
                'nationality, visa_type, arrival_date, prefecture, language',
              )
              .eq('id', userId)
              .single();
            if (profile) {
              const parts: string[] = [];
              if (profile.nationality)
                parts.push(`Nationality: ${profile.nationality}`);
              if (profile.visa_type)
                parts.push(`Visa type: ${profile.visa_type}`);
              if (profile.arrival_date)
                parts.push(`Arrival date: ${profile.arrival_date}`);
              if (profile.prefecture)
                parts.push(`Prefecture: ${profile.prefecture}`);
              if (parts.length > 0) profileContext = parts.join(', ');
            }
            mark('profile');
            console.log(
              `[chat] Profile: ${profileContext ? profileContext : 'no profile data'}`,
            );
          } catch (err) {
            mark('profile');
            console.log(`[chat] Profile: lookup failed — ${(err as Error).message}`);
          }
        } else {
          console.log('[chat] Profile: anonymous user, skipped');
        }

        // 4. Build system prompt with RAG context + experiences + profile
        const systemPrompt = buildSystemPrompt(
          trimmedResults,
          language,
          experienceContext,
          profileContext,
        );

        // 5. Compact conversation history if exceeding token budget
        mark('system_prompt');
        const systemTokenEstimate = estimateTokens([], systemPrompt);
        console.log(
          `[chat] System prompt: ~${systemTokenEstimate} tokens (RAG=${trimmedResults.length}, exp=${experienceContext ? 'yes' : 'no'}, profile=${profileContext ? 'yes' : 'no'})`,
        );
        const originalMsgCount = body.messages.length;
        const compacted = await compactHistory(
          body.messages.map((m) => ({ role: m.role, content: m.content })),
          systemTokenEstimate,
        );
        mark('compaction');
        const conversationInput: Array<{
          role: 'user' | 'assistant';
          content: string;
        }> = compacted.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));
        const wasCompacted = compacted.length !== originalMsgCount;
        console.log(
          `[chat] History: ${originalMsgCount} msgs → ${compacted.length} msgs${wasCompacted ? ' (compacted)' : ''}, ~${estimateTokens(conversationInput)} tokens`,
        );

        // 6. Two-pass generation: silent first pass → verify → stream
        controller.enqueue(sseProgress('thinking'));
        const openai = getOpenAI();

        const tools = [
          {
            type: 'web_search' as const,
            filters: {
              allowed_domains: [
                'service-public.fr',
                'legifrance.gouv.fr',
                'france-visas.gouv.fr',
                'welcome-to-france.com',
                'prefectures-regions.gouv.fr',
              ],
            },
            user_location: {
              type: 'approximate' as const,
              country: 'FR',
            },
          },
          ...getFunctionTools(),
        ];

        // Build initial input for the Responses API
        let input: OpenAI.Responses.ResponseInputItem[] = conversationInput.map(
          (m) => ({
            type: 'message' as const,
            role: m.role,
            content: m.content,
          }),
        );

        let assistantResponse = '';
        let allWebSources: Array<{
          url: string;
          title: string;
          snippet: string;
          domain: string;
        }> = [];

        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
          const totalInputTokens =
            systemTokenEstimate + estimateTokens(conversationInput);
          console.log(
            `[chat] Round ${round + 1}/${MAX_TOOL_ROUNDS}. Input tokens: ~${totalInputTokens}`,
          );

          // Non-streaming first pass — response hidden until verified
          const firstPassResponse = await openai.responses.create({
            model: 'gpt-5-mini',
            instructions: systemPrompt,
            input,
            tools,
            max_output_tokens: MAX_COMPLETION_TOKENS,
            reasoning: { effort: 'medium' },
          });

          // Accumulate only the final message text (skip intermediate web search descriptions)
          const roundText = extractLastMessageText(firstPassResponse.output);
          if (roundText) {
            assistantResponse += roundText;
          }

          // Extract web sources from response annotations
          const webSources = extractWebSources(
            firstPassResponse as Parameters<typeof extractWebSources>[0],
          );
          if (webSources.length > 0) {
            allWebSources = [...allWebSources, ...webSources];
            console.log(`[chat] Round ${round + 1}: ${webSources.length} web sources extracted`);
          }

          // Check for function calls
          const functionCalls: Array<{
            callId: string;
            name: string;
            args: string;
          }> = [];
          for (const item of firstPassResponse.output) {
            if (
              item.type === 'function_call' &&
              item.name &&
              item.call_id
            ) {
              functionCalls.push({
                callId: item.call_id,
                name: item.name,
                args: item.arguments ?? '{}',
              });
            }
          }

          // If no function calls, we're done
          if (functionCalls.length === 0) {
            console.log(`[chat] Round ${round + 1}: complete (no tool calls)`);
            break;
          }

          // Execute function calls and feed results back
          console.log(
            `[chat] Round ${round + 1}: ${functionCalls.length} tool call(s) — [${functionCalls.map((fc) => fc.name).join(', ')}]`,
          );
          controller.enqueue(sseProgress('looking_up'));
          input = [
            ...input,
            ...firstPassResponse.output.map(
              (item) =>
                item as unknown as OpenAI.Responses.ResponseInputItem,
            ),
          ];

          for (const fc of functionCalls) {
            controller.enqueue(
              sseEvent('tool_call', { name: fc.name, status: 'start' }),
            );
            let args: Record<string, unknown> = {};
            try {
              args = JSON.parse(fc.args);
            } catch {
              /* empty args */
            }
            console.log(`[chat] Tool ${fc.name}: args=${JSON.stringify(args).slice(0, 200)}`);
            const result = await executeTool(fc.name, args, userId);
            const resultStr = JSON.stringify(result);
            console.log(`[chat] Tool ${fc.name}: result=${resultStr.slice(0, 200)}${resultStr.length > 200 ? '...' : ''}`);
            controller.enqueue(
              sseEvent('tool_call', { name: fc.name, status: 'complete' }),
            );
            input.push({
              type: 'function_call_output',
              call_id: fc.callId,
              output: resultStr,
            });
          }
        }
        // Fallback: if agentic loop exhausted all rounds with no text, generate without tools
        if (!assistantResponse.trim()) {
          console.log('[chat] Empty response after agentic loop — generating fallback without tools');
          controller.enqueue(sseProgress('thinking'));
          const fallbackResponse = await openai.responses.create({
            model: 'gpt-5-mini',
            instructions: systemPrompt,
            input,
            max_output_tokens: MAX_COMPLETION_TOKENS,
            reasoning: { effort: 'medium' },
            // No tools — forces text generation
          });
          assistantResponse = fallbackResponse.output_text || '';
          console.log(`[chat] Fallback generated: ${assistantResponse.length} chars`);
        }
        mark('agentic_loop');

        // Send web sources if any were found
        if (allWebSources.length > 0) {
          // Deduplicate
          const uniqueWebSources = [
            ...new Map(allWebSources.map((s) => [s.url, s])).values(),
          ];
          controller.enqueue(
            sseEvent('web_sources', { sources: uniqueWebSources }),
          );
          console.log(
            `[chat] Web sources: ${uniqueWebSources.length} unique (from ${allWebSources.length} total)`,
          );
        }

        console.log(
          `[chat] First pass done: ${assistantResponse.length} chars, web_sources=${allWebSources.length}`,
        );

        // 7. Verify response BEFORE streaming (pre-streaming hallucination detection)
        controller.enqueue(sseProgress('verifying'));
        const sourcesTextForVerification = sources
          .map(
            (s, i) =>
              `[Source ${i + 1}] (${s.doc_type}: ${s.source})\n${s.content}`,
          )
          .join('\n\n');
        let verification = await verifyResponse(
          assistantResponse,
          sourcesTextForVerification,
        );
        mark('verification');
        console.log(
          `[chat] Verification: status=${verification.status} confidence=${verification.confidence} flagged=${verification.flaggedClaims.length}`,
        );

        // 8. Stream to user — regenerate if hallucination detected
        if (verification.status === 'error') {
          console.log('[chat] Hallucination detected — regenerating with corrections');
          controller.enqueue(sseProgress('regenerating'));

          const flaggedList = verification.flaggedClaims
            .map((c) => `- "${c.claim}" — ${c.reason}`)
            .join('\n');

          const correctionInput: OpenAI.Responses.ResponseInputItem[] = [
            ...input,
            {
              type: 'message' as const,
              role: 'assistant' as const,
              content: assistantResponse,
            },
            {
              type: 'message' as const,
              role: 'user' as const,
              content: `SYSTEM: The following claims were flagged as unsupported by sources:\n${flaggedList}\n\nRegenerate your response, removing or correcting these claims. Only include information directly supported by the provided sources. If unsure, say you don't have enough information.`,
            },
          ];

          assistantResponse = '';
          const correctionStream = await openai.responses.create({
            model: 'gpt-5-mini',
            instructions: systemPrompt,
            input: correctionInput,
            max_output_tokens: MAX_COMPLETION_TOKENS,
            reasoning: { effort: 'medium' },
            stream: true,
          });

          controller.enqueue(sseProgress('generating'));
          for await (const event of correctionStream) {
            if (event.type === 'response.output_text.delta') {
              assistantResponse += event.delta;
              controller.enqueue(sseEvent('token', { text: event.delta }));
            }
          }
          mark('regeneration');

          // Re-verify the corrected response
          verification = await verifyResponse(
            assistantResponse,
            sourcesTextForVerification,
          );
          mark('re_verification');
          console.log(
            `[chat] Re-verification: status=${verification.status} confidence=${verification.confidence} flagged=${verification.flaggedClaims.length}`,
          );
        } else {
          // Verified — stream the pre-generated response to user
          controller.enqueue(sseProgress('generating'));
          controller.enqueue(sseEvent('token', { text: assistantResponse }));
        }

        controller.enqueue(sseEvent('verification', verification));

        // 8. Generate follow-up questions
        const followUps = await generateFollowUps(
          lastMessage.content,
          assistantResponse,
          language,
        );
        mark('followups');
        console.log(`[chat] Follow-ups: ${followUps.length} generated`);
        if (followUps.length > 0) {
          controller.enqueue(sseEvent('followups', { questions: followUps }));
        }

        // 9. Auto-create or update conversation for authenticated users
        let finalConversationId = conversationId;
        if (userId && !finalConversationId) {
          try {
            const supabase = getSupabase();
            const title = await generateConversationTitle(lastMessage.content);
            const { data } = await supabase
              .from('conversations')
              .insert({ user_id: userId, title })
              .select('id')
              .single();
            if (data) {
              finalConversationId = data.id;
              console.log(`[chat] Auto-created conversation: ${data.id} title="${title}"`);
            }
          } catch (err) {
            console.error('[chat] Auto-create conversation failed:', (err as Error).message);
          }
        } else if (userId && finalConversationId) {
          // Touch updated_at so sidebar ordering stays correct
          getSupabase()
            .from('conversations')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', finalConversationId)
            .then(() => {}, () => {});
        }

        // 10. Done — include remaining daily count and conversationId
        mark('done');
        controller.enqueue(
          sseEvent('done', {
            ...(dailyRemaining !== null ? { remaining: dailyRemaining } : {}),
            ...(finalConversationId ? { conversationId: finalConversationId } : {}),
          }),
        );

        // Summary log with all timings
        console.log(
          `[chat] === DONE === ${Date.now() - t0}ms total | timings=${JSON.stringify(timings)} | response=${assistantResponse.length} chars | rag=${sources.length} | web=${allWebSources.length} | verify=${verification.status} | followups=${followUps.length}`,
        );

        // 11. Log conversation to Supabase (fire-and-forget)
        logConversation({
          userMessage: lastMessage.content.trim(),
          assistantMessage: assistantResponse,
          language,
          sourceCount: sources.length,
          ip,
          userId,
          conversationId: finalConversationId,
        }).catch((err) => console.error('[chat] DB log error:', err));
      } catch (err) {
        const elapsed = Date.now() - t0;
        console.error(
          `[chat] === ERROR === ${elapsed}ms | timings=${JSON.stringify(timings)} | stage=${Object.keys(timings).pop() ?? 'init'}`,
        );
        console.error(
          '[chat] Error:',
          (err as Error).message,
          (err as Error).stack,
        );
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
  userId: string | null;
  conversationId: string | null;
}) {
  const supabase = getSupabase();
  await supabase.from('chat_logs').insert({
    user_message: params.userMessage,
    assistant_message: params.assistantMessage,
    language: params.language,
    source_count: params.sourceCount,
    ip_hash: await hashIP(params.ip),
    user_id: params.userId,
    conversation_id: params.conversationId,
    created_at: new Date().toISOString(),
  });
}

async function generateConversationTitle(message: string): Promise<string> {
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
  } catch (err) {
    console.error('[chat] Title generation failed:', (err as Error).message);
  }
  // Fallback: use truncated user message
  const fallback = message.trim().slice(0, 40).replace(/\s+\S*$/, '');
  return fallback || 'New Conversation';
}

async function hashIP(ip: string): Promise<string> {
  const data = new TextEncoder().encode(
    ip + (process.env.IP_HASH_SALT ?? ''),
  );
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16);
}
