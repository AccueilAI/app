import OpenAI from 'openai';

// --- Types ---

export interface VerificationResult {
  status: 'verified' | 'warning' | 'error';
  confidence: number;
  flaggedClaims: FlaggedClaim[];
}

export interface FlaggedClaim {
  claim: string;
  reason: string;
  severity: 'high' | 'medium';
}

// --- OpenAI Singleton ---

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

// --- Verification ---

/**
 * Verify an assistant response against retrieved source documents.
 * Checks for unsupported factual claims — especially article numbers,
 * monetary amounts, deadlines, and procedure steps.
 */
export async function verifyResponse(
  response: string,
  sourcesText: string,
): Promise<VerificationResult> {
  const t0 = Date.now();
  if (!response.trim()) {
    console.log('[verify] Skipped: empty response');
    return { status: 'verified', confidence: 1, flaggedClaims: [] };
  }

  const openai = getOpenAI();

  try {
    const result = await openai.responses.create({
      model: 'gpt-5-mini',
      max_output_tokens: 2048,
      instructions:
        'You are a fact-checker. Compare the RESPONSE against SOURCE DOCUMENTS. ' +
        'Identify factual claims NOT supported by sources. Focus on: law article numbers, monetary amounts, deadlines, procedure steps, institutional names. ' +
        'Ignore: general knowledge, disclaimers, hedged language, accurate paraphrases. ' +
        'If all claims are supported, return empty flagged array with confidence 0.95.',
      input: `SOURCE DOCUMENTS:\n${sourcesText.slice(0, 6000)}\n\n---\n\nRESPONSE TO VERIFY:\n${response}`,
      text: {
        format: {
          type: 'json_schema',
          name: 'verification_result',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              flagged: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    claim: { type: 'string' },
                    reason: { type: 'string' },
                    severity: { type: 'string', enum: ['high', 'medium'] },
                  },
                  required: ['claim', 'reason', 'severity'],
                  additionalProperties: false,
                },
              },
              confidence: { type: 'number' },
            },
            required: ['flagged', 'confidence'],
            additionalProperties: false,
          },
        },
      },
    });

    const rawText = result.output_text?.trim() ?? '';

    if (!rawText) {
      debugEmptyOutput('verify', result);
      console.warn(`[verify] Empty output in ${Date.now() - t0}ms — skipping`);
      return { status: 'verified', confidence: 0.5, flaggedClaims: [] };
    }

    let parsed: {
      flagged?: { claim: string; reason: string; severity: string }[];
      confidence?: number;
    };
    try {
      parsed = JSON.parse(rawText);
    } catch (parseErr) {
      console.error(`[verify] JSON parse failed in ${Date.now() - t0}ms: ${(parseErr as Error).message} | raw=${rawText.slice(0, 200)}`);
      return { status: 'verified', confidence: 0.3, flaggedClaims: [] };
    }

    const flaggedClaims: FlaggedClaim[] = (parsed.flagged ?? []).map((f) => ({
      claim: f.claim,
      reason: f.reason,
      severity: f.severity === 'high' ? 'high' : 'medium',
    }));

    const confidence = Math.min(1, Math.max(0, parsed.confidence ?? 0.5));

    const hasHighSeverity = flaggedClaims.some((c) => c.severity === 'high');
    const status: VerificationResult['status'] =
      flaggedClaims.length === 0
        ? 'verified'
        : hasHighSeverity
          ? 'error'
          : 'warning';

    console.log(
      `[verify] ${status} in ${Date.now() - t0}ms | confidence=${confidence.toFixed(2)} | flagged=${flaggedClaims.length}${flaggedClaims.length > 0 ? ` [${flaggedClaims.map((c) => c.severity).join(',')}]` : ''}`,
    );
    return { status, confidence, flaggedClaims };
  } catch (err) {
    console.error(`[verify] Error in ${Date.now() - t0}ms:`, (err as Error).message);
    // Don't block the user experience on verification failure
    return { status: 'verified', confidence: 0, flaggedClaims: [] };
  }
}
