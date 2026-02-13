import { encodingForModel } from 'js-tiktoken';
import OpenAI from 'openai';

const ENCODING = encodingForModel('gpt-4o'); // o200k_base, same family as gpt-5-nano
const PER_MESSAGE_OVERHEAD = 4; // role markers, delimiters
const REPLY_PRIMING = 2;

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

const CONVERSATION_TOKEN_BUDGET = 12_000; // token budget for conversation history
const KEEP_RECENT_TURNS = 4; // keep last 4 messages verbatim (2 user + 2 assistant)

interface Message {
  role: string;
  content: string;
}

/**
 * Compact conversation history if it exceeds the token budget.
 *
 * Strategy: sliding window + LLM summarization
 * - If under budget: return messages as-is
 * - If over budget: summarize older messages, keep recent turns verbatim
 *
 * Returns a compacted message array suitable for LLM input.
 */
export async function compactHistory(
  messages: Message[],
  systemTokenEstimate: number,
): Promise<Message[]> {
  // Budget = total budget minus system prompt tokens minus output buffer
  const available = CONVERSATION_TOKEN_BUDGET - systemTokenEstimate;

  const conversationTokens = estimateTokens(messages);
  if (conversationTokens <= available) {
    return messages;
  }

  // Not enough messages to split — return as-is
  if (messages.length <= KEEP_RECENT_TURNS) {
    return messages;
  }

  // Split: older messages to summarize + recent window to keep
  const recentMessages = messages.slice(-KEEP_RECENT_TURNS);
  const olderMessages = messages.slice(0, -KEEP_RECENT_TURNS);

  // Summarize older messages
  const summary = await summarizeMessages(olderMessages);

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
    instructions:
      'Summarize this conversation concisely in 3-5 bullet points. ' +
      'Preserve: key topics discussed, specific entities (article numbers, ' +
      'document types, dates), decisions made, and any unresolved questions. ' +
      'Use the same language as the conversation. Be factual, no fluff.',
    input: transcript,
  });

  return response.output_text?.trim() || transcript.slice(0, 500);
}
