import OpenAI from 'openai';

// --- Types ---

export interface EvalMetrics {
  faithfulness: number; // 0-1: are claims grounded in sources?
  contextRelevance: number; // 0-1: are retrieved sources relevant to query?
  answerRelevance: number; // 0-1: does response answer the query?
  citationAccuracy: number; // 0-1: do [Source N] refs match actual content?
  overall: number; // weighted average
}

// --- OpenAI Singleton ---

let client: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (client) return client;
  client = new OpenAI();
  return client;
}

// --- LLM-as-Judge Helper ---

async function llmScore(prompt: string): Promise<number> {
  const openai = getOpenAI();
  const res = await openai.responses.create({
    model: 'gpt-5-nano',
    max_output_tokens: 16,
    instructions:
      'You are a strict evaluator. Output ONLY a number between 0.0 and 1.0, nothing else.',
    input: prompt,
  });
  const text = res.output_text?.trim() ?? '';
  const score = parseFloat(text);
  return Number.isFinite(score) ? Math.min(1, Math.max(0, score)) : 0;
}

// --- Individual Metrics ---

/**
 * Faithfulness: Are the factual claims in the response grounded in the sources?
 */
export async function measureFaithfulness(
  response: string,
  sourcesText: string,
): Promise<number> {
  return llmScore(
    `SOURCES:\n${sourcesText}\n\n---\n\nRESPONSE:\n${response}\n\n---\n\n` +
      'Score from 0.0 to 1.0: What fraction of factual claims in the RESPONSE are directly supported by the SOURCES? ' +
      '1.0 = all claims are grounded. 0.0 = no claims are grounded. ' +
      'Ignore disclaimers and hedged language. Focus on specific facts like article numbers, amounts, deadlines, and procedures.',
  );
}

/**
 * Context Relevance: Are the retrieved sources relevant to answering the query?
 */
export async function measureContextRelevance(
  query: string,
  sourcesText: string,
): Promise<number> {
  return llmScore(
    `USER QUERY:\n${query}\n\n---\n\nRETRIEVED SOURCES:\n${sourcesText}\n\n---\n\n` +
      'Score from 0.0 to 1.0: How relevant are the retrieved sources to the user query? ' +
      '1.0 = all sources are highly relevant. 0.0 = none are relevant.',
  );
}

/**
 * Answer Relevance: Does the response actually answer the user's question?
 */
export async function measureAnswerRelevance(
  query: string,
  response: string,
): Promise<number> {
  return llmScore(
    `USER QUERY:\n${query}\n\n---\n\nRESPONSE:\n${response}\n\n---\n\n` +
      'Score from 0.0 to 1.0: How well does the response answer the user query? ' +
      '1.0 = fully answered with specific details. 0.0 = completely irrelevant or off-topic. ' +
      'A response that correctly says "I don\'t have enough information" for an unanswerable query scores 0.7.',
  );
}

/**
 * Citation Accuracy: Do [Source N] references match actual source content?
 */
export async function measureCitationAccuracy(
  response: string,
  sourcesText: string,
): Promise<number> {
  // Check if response contains any citations
  const citationPattern = /\[Source \d+\]/g;
  const citations = response.match(citationPattern);

  if (!citations || citations.length === 0) {
    // No citations — penalize if response contains factual claims
    const hasFacts = response.match(
      /\d+\s*(euro|€|jour|month|year|mois|an)/i,
    );
    return hasFacts ? 0.3 : 0.5;
  }

  return llmScore(
    `SOURCES:\n${sourcesText}\n\n---\n\nRESPONSE:\n${response}\n\n---\n\n` +
      'Score from 0.0 to 1.0: For each [Source N] citation in the RESPONSE, does the claim match the content of that source? ' +
      '1.0 = all citations accurately reference correct sources. 0.0 = all citations are wrong or fabricated.',
  );
}

// --- Combined Evaluation ---

const WEIGHTS = {
  faithfulness: 0.35,
  contextRelevance: 0.2,
  answerRelevance: 0.25,
  citationAccuracy: 0.2,
};

export async function evaluateResponse(params: {
  query: string;
  response: string;
  sourcesText: string;
}): Promise<EvalMetrics> {
  const { query, response, sourcesText } = params;

  // Run all metrics in parallel
  const [faithfulness, contextRelevance, answerRelevance, citationAccuracy] =
    await Promise.all([
      measureFaithfulness(response, sourcesText),
      measureContextRelevance(query, sourcesText),
      measureAnswerRelevance(query, response),
      measureCitationAccuracy(response, sourcesText),
    ]);

  const overall =
    faithfulness * WEIGHTS.faithfulness +
    contextRelevance * WEIGHTS.contextRelevance +
    answerRelevance * WEIGHTS.answerRelevance +
    citationAccuracy * WEIGHTS.citationAccuracy;

  return {
    faithfulness,
    contextRelevance,
    answerRelevance,
    citationAccuracy,
    overall: Math.round(overall * 100) / 100,
  };
}
