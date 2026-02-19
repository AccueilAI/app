import OpenAI from 'openai';

let client: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (client) return client;
  client = new OpenAI();
  return client;
}

/**
 * Debug helper: log the full output array when output_text is empty.
 */
function debugEmptyOutput(tag: string, response: OpenAI.Responses.Response): void {
  console.warn(
    `[${tag}] Empty output_text. status=${response.status} | ` +
    `output_items=${response.output.length} | ` +
    `output=${JSON.stringify(response.output).slice(0, 500)}` +
    (response.incomplete_details ? ` | incomplete=${JSON.stringify(response.incomplete_details)}` : ''),
  );
}

export async function generateFollowUps(
  userMessage: string,
  assistantResponse: string,
  language: string,
): Promise<string[]> {
  if (!assistantResponse.trim()) return [];

  const t0 = Date.now();
  const openai = getOpenAI();
  const langName =
    language === 'fr' ? 'French' : language === 'ko' ? 'Korean' : 'English';
  try {
    const response = await openai.responses.create({
      model: 'gpt-5-mini',
      max_output_tokens: 256,
      instructions:
        `Generate exactly 3 brief follow-up questions the user might ask next. ` +
        `Each question should be concise (under 60 chars). ` +
        `Questions must be in ${langName}. ` +
        `Return as JSON array of strings, nothing else.`,
      input: `User: ${userMessage.slice(0, 300)}\nAssistant: ${assistantResponse.slice(0, 500)}`,
    });

    const raw = response.output_text?.trim() || '';

    if (!raw) {
      debugEmptyOutput('followups', response);
      return [];
    }

    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const results = parsed.slice(0, 3);
      console.log(`[followups] Generated ${results.length} questions in ${Date.now() - t0}ms`);
      return results;
    }
  } catch (err) {
    console.error(`[followups] Error in ${Date.now() - t0}ms:`, (err as Error).message);
  }
  return [];
}
