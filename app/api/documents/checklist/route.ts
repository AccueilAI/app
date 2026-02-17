import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@/lib/supabase/server';
import { getSupabase } from '@/lib/supabase/client';
import { ragSearch } from '@/lib/search/pipeline';
import { documentAnalysisLimit, checklistDailyLimitFree } from '@/lib/rate-limit';
import type { ChecklistItem } from '@/lib/documents/types';

let openaiClient: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (openaiClient) return openaiClient;
  openaiClient = new OpenAI();
  return openaiClient;
}

const PROCEDURE_LABELS: Record<string, string> = {
  visa_renewal: 'renouvellement de visa / titre de séjour',
  first_visa: 'première demande de visa long séjour',
  caf: 'demande allocation CAF (APL, prime activité)',
  cpam: 'inscription CPAM / affiliation sécurité sociale',
  tax_declaration: 'déclaration de revenus / impôts',
  prefecture_rdv: 'rendez-vous préfecture',
  housing: 'location logement / bail',
  banking: 'ouverture de compte bancaire',
  nationality: 'demande de nationalité française',
  other: 'démarche administrative en France',
};

function buildSearchQuery(procedureType: string, nationality?: string, visaType?: string): string {
  const label = PROCEDURE_LABELS[procedureType] ?? PROCEDURE_LABELS.other;
  let query = `documents nécessaires pour ${label}`;
  if (nationality) query += ` nationalité ${nationality}`;
  if (visaType) query += ` visa ${visaType}`;
  return query;
}

function buildPrompt(
  procedureType: string,
  ragContext: string,
  nationality?: string,
  visaType?: string,
  prefecture?: string,
  language?: string,
): string {
  const langName = language === 'fr' ? 'French' : language === 'ko' ? 'Korean' : 'English';
  const label = PROCEDURE_LABELS[procedureType] ?? PROCEDURE_LABELS.other;

  let profileContext = '';
  if (nationality) profileContext += `Nationality: ${nationality}. `;
  if (visaType) profileContext += `Visa type: ${visaType}. `;
  if (prefecture) profileContext += `Prefecture: ${prefecture}. `;

  return `You are an expert in French administrative procedures. Generate a comprehensive document checklist for: ${label}

${profileContext ? `User profile: ${profileContext}` : ''}

Based on the following official sources:
---
${ragContext}
---

Generate a JSON array of checklist items. Each item must have:
- "item": the document or step name (clear, specific)
- "checked": false
- "details": practical tip about where to get it or what to watch out for (1-2 sentences)
- "category": one of "identity", "proof_of_residence", "financial", "professional", "medical", "administrative", "other"

Rules:
- Include ALL required documents, not just common ones
- Order by importance (most critical first)
- Include originals AND copies requirements when applicable
- Mention certified translations if needed for non-French documents
- Be specific: say "3 recent pay slips" not just "pay slips"
- Tailor to the user's nationality/visa type when relevant
- Respond in ${langName}

Return ONLY the JSON array, no other text.`;
}

export async function POST(request: NextRequest) {
  const authSupabase = await createClient();
  const {
    data: { user },
  } = await authSupabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  // Resolve subscription tier
  let effectiveTier = 'free';
  try {
    const tierSupabase = getSupabase();
    const { data: tierData } = await tierSupabase
      .from('profiles')
      .select('subscription_tier, subscription_expires_at')
      .eq('id', user.id)
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
  } catch { /* default free */ }

  // Rate limit based on tier
  if (effectiveTier === 'free') {
    const { success } = await checklistDailyLimitFree.limit(user.id);
    if (!success) {
      return NextResponse.json({ error: 'daily_limit', tier: 'free' }, { status: 429 });
    }
  } else {
    const { success } = await documentAnalysisLimit.limit(user.id);
    if (!success) {
      return NextResponse.json({ error: 'daily_limit' }, { status: 429 });
    }
  }

  let body: {
    procedure_type?: string;
    nationality?: string;
    visa_type?: string;
    prefecture?: string;
    language?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { procedure_type, nationality, visa_type, prefecture, language = 'en' } = body;

  if (!procedure_type) {
    return NextResponse.json({ error: 'procedure_type is required.' }, { status: 400 });
  }

  try {
    // RAG search for relevant documents
    const searchQuery = buildSearchQuery(procedure_type, nationality, visa_type);
    console.log(`[checklist] RAG search: "${searchQuery.slice(0, 100)}"`);

    const searchResults = await ragSearch(searchQuery, { count: 12 });
    const ragContext = searchResults.results
      .map((r, i) => `[Source ${i + 1}] (${r.source}${r.source_url ? ` - ${r.source_url}` : ''})\n${r.content.slice(0, 1500)}`)
      .join('\n\n');

    console.log(`[checklist] RAG returned ${searchResults.results.length} results`);

    // Generate checklist via GPT
    const openai = getOpenAI();
    const prompt = buildPrompt(procedure_type, ragContext, nationality, visa_type, prefecture, language);

    const response = await openai.chat.completions.create({
      model: 'gpt-5-mini',
      messages: [
        { role: 'system', content: prompt },
        {
          role: 'user',
          content: `Generate the document checklist for: ${PROCEDURE_LABELS[procedure_type] ?? procedure_type}`,
        },
      ],
      max_completion_tokens: 4096,
    });

    const content = response.choices[0]?.message?.content ?? '[]';

    // Parse JSON from response (handle markdown code blocks)
    let items: ChecklistItem[] = [];
    const jsonMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/) ?? content.match(/^\s*(\[[\s\S]*\])\s*$/);
    const jsonStr = jsonMatch?.[1] ?? content;

    try {
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed)) {
        items = parsed.map((item: Record<string, unknown>) => ({
          item: String(item.item ?? ''),
          checked: false,
          details: item.details ? String(item.details) : null,
          category: item.category ? String(item.category) : null,
        }));
      }
    } catch {
      console.error('[checklist] JSON parse failed, raw:', content.slice(0, 200));
      return NextResponse.json({ error: 'Failed to generate checklist.' }, { status: 500 });
    }

    if (items.length === 0) {
      return NextResponse.json({ error: 'No checklist items generated.' }, { status: 500 });
    }

    // Generate title
    const langName = language === 'fr' ? 'French' : language === 'ko' ? 'Korean' : 'English';
    const titleResponse = await openai.chat.completions.create({
      model: 'gpt-5-nano',
      messages: [
        {
          role: 'user',
          content: `Generate a short title (max 8 words) in ${langName} for a document checklist about: ${PROCEDURE_LABELS[procedure_type] ?? procedure_type}. Return only the title, nothing else.`,
        },
      ],
      max_completion_tokens: 64,
    });
    const title = titleResponse.choices[0]?.message?.content?.trim() ?? procedure_type;

    // Save to database
    const supabase = getSupabase();
    const { data: checklist, error: dbError } = await supabase
      .from('document_checklists')
      .insert({
        user_id: user.id,
        procedure_type,
        title,
        items,
        nationality: nationality ?? null,
        visa_type: visa_type ?? null,
        prefecture: prefecture ?? null,
        language,
      })
      .select()
      .single();

    if (dbError) {
      console.error('[checklist] DB insert error:', dbError);
      return NextResponse.json({ error: 'Failed to save checklist.' }, { status: 500 });
    }

    console.log(`[checklist] Generated ${items.length} items for ${procedure_type}`);
    return NextResponse.json(checklist);
  } catch (err) {
    console.error('[checklist] Error:', err);
    return NextResponse.json({ error: 'Checklist generation failed.' }, { status: 500 });
  }
}

// GET: Fetch user's saved checklists
export async function GET() {
  const authSupabase = await createClient();
  const {
    data: { user },
  } = await authSupabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('document_checklists')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch checklists.' }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

// PATCH: Update checklist items (toggle checks)
export async function PATCH(request: NextRequest) {
  const authSupabase = await createClient();
  const {
    data: { user },
  } = await authSupabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  let body: { id: string; items: ChecklistItem[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  if (!body.id || !Array.isArray(body.items)) {
    return NextResponse.json({ error: 'id and items are required.' }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('document_checklists')
    .update({ items: body.items, updated_at: new Date().toISOString() })
    .eq('id', body.id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to update checklist.' }, { status: 500 });
  }

  return NextResponse.json(data);
}

// DELETE: Delete a checklist
export async function DELETE(request: NextRequest) {
  const authSupabase = await createClient();
  const {
    data: { user },
  } = await authSupabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id is required.' }, { status: 400 });
  }

  const supabase = getSupabase();
  const { error } = await supabase
    .from('document_checklists')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: 'Failed to delete checklist.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
