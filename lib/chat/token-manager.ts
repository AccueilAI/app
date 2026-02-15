import { encodingForModel } from 'js-tiktoken';
import OpenAI from 'openai';

const ENCODING = encodingForModel('gpt-4o'); // o200k_base, same family as gpt-5-nano
const PER_MESSAGE_OVERHEAD = 4; // role markers, delimiters
const REPLY_PRIMING = 2;

// Model limits — gpt-5-mini: 1M context, 128K max output (reasoning model)
// Reasoning tokens count against max_output_tokens, so budget generously
const MODEL_CONTEXT_LIMIT = 1_000_000;
const MAX_OUTPUT_TOKENS = 32_768; // reasoning + visible output
const MAX_INPUT_TOKENS = 80_000; // higher input budget for gpt-5-mini
/** @deprecated alias — use MAX_OUTPUT_TOKENS */
const MAX_COMPLETION_TOKENS = MAX_OUTPUT_TOKENS;

/**
 * Estimate token count for a set of messages.
 * Uses local tiktoken for fast estimation without API calls.
 */
export function estimateTokens(
  messages: { role: string; content: string }[],
  instructions?: string,
): number {
  let total = 0;
  if (instructions) {
    total += ENCODING.encode(instructions).length + PER_MESSAGE_OVERHEAD;
  }
  for (const msg of messages) {
    total += ENCODING.encode(msg.content).length + PER_MESSAGE_OVERHEAD;
  }
  total += REPLY_PRIMING;
  return total;
}

// --- Conversation Compaction ---

const KEEP_RECENT_TURNS = 4; // keep last 4 messages verbatim (2 user + 2 assistant)

interface Message {
  role: string;
  content: string;
}

/**
 * Compact conversation history to fit within the model's input budget.
 *
 * Strategy: sliding window + LLM summarization
 * - Calculate available budget = MAX_INPUT_TOKENS - systemTokenEstimate
 * - If conversation fits: return as-is
 * - If over budget: summarize older messages, keep recent turns verbatim
 */
export async function compactHistory(
  messages: Message[],
  systemTokenEstimate: number,
): Promise<Message[]> {
  const available = MAX_INPUT_TOKENS - systemTokenEstimate;

  const conversationTokens = estimateTokens(messages);
  if (conversationTokens <= available) {
    console.log(
      `[tokens] History fits: ${conversationTokens}/${available} tokens (${messages.length} msgs)`,
    );
    return messages;
  }

  // Not enough messages to split — return as-is
  if (messages.length <= KEEP_RECENT_TURNS) {
    console.log(
      `[tokens] Over budget but too few msgs to compact: ${conversationTokens}/${available} (${messages.length} msgs)`,
    );
    return messages;
  }

  // Split: older messages to summarize + recent window to keep
  const recentMessages = messages.slice(-KEEP_RECENT_TURNS);
  const olderMessages = messages.slice(0, -KEEP_RECENT_TURNS);

  console.log(
    `[tokens] Compacting: ${olderMessages.length} older msgs → summary, keeping ${recentMessages.length} recent (${conversationTokens}/${available} tokens)`,
  );

  // Summarize older messages
  const t0 = Date.now();
  const summary = await summarizeMessages(olderMessages);
  console.log(
    `[tokens] Summarized ${olderMessages.length} msgs in ${Date.now() - t0}ms (${summary.length} chars)`,
  );

  return [
    {
      role: 'user',
      content: `[Previous conversation summary]\n${summary}`,
    },
    {
      role: 'assistant',
      content:
        'Understood. I have the context from our previous conversation.',
    },
    ...recentMessages,
  ];
}

/**
 * Trim RAG context to fit within token budget.
 * Progressively removes results until system prompt fits.
 */
export function trimRagContext<T extends { content: string }>(
  results: T[],
  buildPrompt: (items: T[]) => string,
  maxSystemTokens: number,
): T[] {
  let items = [...results];

  while (items.length > 0) {
    const prompt = buildPrompt(items);
    const tokens = estimateTokens([], prompt);
    if (tokens <= maxSystemTokens) {
      return items;
    }
    // Remove the last (lowest-ranked) result
    items = items.slice(0, -1);
  }

  return items;
}

/** Maximum tokens the system prompt should use */
export { MAX_INPUT_TOKENS, MAX_COMPLETION_TOKENS };

// --- Summarization ---

let openaiClient: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (openaiClient) return openaiClient;
  openaiClient = new OpenAI();
  return openaiClient;
}

/**
 * Summarize a list of messages into a concise paragraph.
 */
async function summarizeMessages(messages: Message[]): Promise<string> {
  const openai = getOpenAI();

  const transcript = messages
    .map((m) => `${m.role}: ${m.content.slice(0, 500)}`)
    .join('\n');

  const response = await openai.responses.create({
    model: 'gpt-5-nano',
    max_output_tokens: 512,
    reasoning: { effort: 'low' },
    instructions:
      'Summarize this conversation concisely in 3-5 bullet points. ' +
      'Preserve: key topics discussed, specific entities (article numbers, ' +
      'document types, dates), decisions made, and any unresolved questions. ' +
      'Use the same language as the conversation. Be factual, no fluff.',
    input: transcript,
  });

  return response.output_text?.trim() || transcript.slice(0, 500);
}
