import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@/lib/supabase/server';
import { getSupabase } from '@/lib/supabase/client';
import { docAnalysisDailyLimitPlus, docAnalysisDailyLimitPro } from '@/lib/rate-limit';
import type { DocumentAnalysis, ChecklistItem } from '@/lib/documents/types';

let openaiClient: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (openaiClient) return openaiClient;
  openaiClient = new OpenAI();
  return openaiClient;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

const SYSTEM_PROMPT = `You are an expert in French administrative documents. Analyze this document and provide:
1) The document type (e.g., CERFA form, convocation, avis d'imposition, attestation, etc.)
2) A clear summary of the document's content and purpose in plain language
3) A checklist of actions the recipient should take, formatted as a JSON array of {item, checked: false, details}

Respond in the user's language. Format your response as:
## Document Type
[type]

## Summary
[summary]

## Checklist
\`\`\`json
[checklist array]
\`\`\``;

export async function POST(request: NextRequest) {
  // Auth check
  const authSupabase = await createClient();
  const {
    data: { user },
  } = await authSupabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required.' },
      { status: 401 },
    );
  }

  // Get user tier for rate limiting
  const supabase = getSupabase();
  let effectiveTier = 'free';
  try {
    const { data: tierData } = await supabase
      .from('profiles')
      .select('subscription_tier, subscription_expires_at')
      .eq('id', user.id)
      .single();
    if (tierData) {
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
    return NextResponse.json(
      { error: 'tier_required', tier: 'free', minimumTier: 'plus' },
      { status: 403 },
    );
  } else if (effectiveTier === 'plus') {
    const { success } = await docAnalysisDailyLimitPlus.limit(user.id);
    if (!success) {
      return NextResponse.json({ error: 'daily_limit', tier: 'plus' }, { status: 429 });
    }
  } else if (effectiveTier === 'pro') {
    const { success } = await docAnalysisDailyLimitPro.limit(user.id);
    if (!success) {
      return NextResponse.json({ error: 'daily_limit', tier: 'pro' }, { status: 429 });
    }
  }
  // max, admin: no limit

  // Parse multipart form data
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: 'Invalid form data.' },
      { status: 400 },
    );
  }

  const file = formData.get('file') as File | null;
  if (!file) {
    return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
  }

  // File validation
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'file_too_large' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: 'unsupported_format' },
      { status: 400 },
    );
  }

  const language = formData.get('language')?.toString() || 'en';

  try {
    // Convert file to base64
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString('base64');

    // Call OpenAI Vision API
    const openai = getOpenAI();
    const isPdf = file.type === 'application/pdf';
    const userContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = isPdf
      ? [
          {
            type: 'file' as const,
            file: {
              filename: file.name,
              file_data: `data:application/pdf;base64,${base64}`,
            },
          } as unknown as OpenAI.Chat.Completions.ChatCompletionContentPart,
        ]
      : [
          {
            type: 'image_url',
            image_url: {
              url: `data:${file.type};base64,${base64}`,
            },
          },
        ];

    const response = await openai.chat.completions.create({
      model: 'gpt-5-nano',
      messages: [
        {
          role: 'system',
          content: `${SYSTEM_PROMPT}\n\nRespond in: ${language === 'fr' ? 'French' : language === 'ko' ? 'Korean' : 'English'}`,
        },
        {
          role: 'user',
          content: userContent,
        },
      ],
      max_completion_tokens: 4096,
    });

    const analysisText = response.choices[0]?.message?.content ?? '';

    // Parse document type
    const typeMatch = analysisText.match(
      /##\s*Document\s*Type\s*\n+(.+?)(?:\n\n|$)/i,
    );
    const documentType = typeMatch?.[1]?.trim() ?? null;

    // Parse checklist JSON
    let checklist: ChecklistItem[] | null = null;
    const jsonMatch = analysisText.match(/```json\s*\n([\s\S]*?)\n```/);
    if (jsonMatch?.[1]) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (Array.isArray(parsed)) {
          checklist = parsed.map((item: Record<string, unknown>) => ({
            item: String(item.item ?? ''),
            checked: false,
            details: item.details ? String(item.details) : null,
          }));
        }
      } catch {
        // Checklist parsing failed — continue without it
      }
    }

    // Upload file to Supabase Storage
    const supabase = getSupabase();
    const ext = file.name.split('.').pop() ?? 'bin';
    const storagePath = `${user.id}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('[documents] Storage upload error:', uploadError);
    }

    // Save analysis to database
    const { data: analysis, error: dbError } = await supabase
      .from('document_analyses')
      .insert({
        user_id: user.id,
        file_name: file.name,
        file_type: file.type,
        storage_path: storagePath,
        analysis: analysisText,
        checklist,
        document_type: documentType,
        language,
      })
      .select()
      .single();

    if (dbError) {
      console.error('[documents] DB insert error:', dbError);
      return NextResponse.json(
        { error: 'Failed to save analysis.' },
        { status: 500 },
      );
    }

    return NextResponse.json(analysis as DocumentAnalysis);
  } catch (err) {
    console.error('[documents] Analysis error:', err);
    return NextResponse.json(
      { error: 'Analysis failed. Please try again.' },
      { status: 500 },
    );
  }
}
