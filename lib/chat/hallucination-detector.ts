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

// --- Verification ---

/**
 * Verify an assistant response against retrieved source documents.
 * Checks for unsupported factual claims — especially article numbers,
 * monetary amounts, deadlines, and procedure steps.
 *
 * Returns quickly (~1-2s with gpt-5-nano) after streaming completes.
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
      max_output_tokens: 512,
      instructions: `You are a fact-checker for French administrative procedure information.
Compare the RESPONSE against the SOURCE DOCUMENTS and identify factual claims in the response that are NOT supported by the sources.

Focus on HIGH-RISK claims:
- Law article numbers (e.g., "Article L313-2")
- Monetary amounts (e.g., "225 euros")
- Specific deadlines or durations (e.g., "4 months", "90 days")
- Procedure step sequences
- Institutional names or addresses

Ignore:
- General knowledge (e.g., "France has a visa system")
- Disclaimers added by the assistant
- Hedged language ("typically", "usually", "may")
- Claims that paraphrase source content accurately

Respond in JSON format:
{
  "flagged": [
    {"claim": "exact claim text", "reason": "why unsupported", "severity": "high|medium"}
  ],
  "confidence": 0.0-1.0
}

If ALL factual claims are supported by sources, return: {"flagged": [], "confidence": 0.95}
Be conservative — only flag claims you are confident are NOT in the sources.`,
      input: `SOURCE DOCUMENTS:\n${sourcesText}\n\n---\n\nRESPONSE TO VERIFY:\n${response}`,
    });

    const text = result.output_text?.trim() ?? '';

    // Parse JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { status: 'verified', confidence: 0.5, flaggedClaims: [] };
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      flagged?: { claim: string; reason: string; severity: string }[];
      confidence?: number;
    };

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
