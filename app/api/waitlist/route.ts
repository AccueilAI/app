import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/client';
import { getResend } from '@/lib/resend';
import { waitlistRateLimit } from '@/lib/rate-limit';
import { getRateLimitKey, sessionCookieHeader } from '@/lib/session';
import WaitlistWelcome from '@/emails/waitlist-welcome';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  const { key, sessionId, isNewSession } = getRateLimitKey(request);

  const { success } = await waitlistRateLimit.limit(key);
  if (!success) {
    return NextResponse.json(
      { success: false, message: 'Too many requests. Please try again later.' },
      { status: 429 },
    );
  }

  let body: { email?: string; language?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: 'Invalid request body.' },
      { status: 400 },
    );
  }

  const email = body.email?.trim().toLowerCase();

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { success: false, message: 'Please provide a valid email address.' },
      { status: 400 },
    );
  }

  try {
    const supabase = getSupabase();

    // Check for duplicate — maybeSingle returns null (no error) when 0 rows
    const { data: existing } = await supabase
      .from('waitlist')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'already_registered' },
        { status: 409 },
      );
    }

    // Insert into waitlist
    const { error: insertError } = await supabase
      .from('waitlist')
      .insert({ email, language: body.language ?? null });

    if (insertError) {
      // Unique constraint violation — race condition with concurrent request
      if (insertError.code === '23505') {
        return NextResponse.json(
          { success: false, error: 'already_registered' },
          { status: 409 },
        );
      }
      console.error('Supabase insert error:', insertError);
      return NextResponse.json(
        { success: false, message: 'Something went wrong. Please try again.' },
        { status: 500 },
      );
    }

    // Send welcome email (non-blocking — don't fail the request if email fails)
    const lang = (body.language ?? 'en') as 'en' | 'fr' | 'ko';
    if (process.env.RESEND_API_KEY) {
      const subjects = {
        en: 'Welcome to the AccueilAI waitlist!',
        fr: "Bienvenue sur la liste d'attente AccueilAI !",
        ko: 'AccueilAI 대기자 명단에 등록되었습니다!',
      };
      try {
        const resend = getResend();
        resend.emails
          .send({
            from: 'AccueilAI <hello@accueil.ai>',
            to: email,
            subject: subjects[lang] ?? subjects.en,
            react: WaitlistWelcome({ language: lang }),
            headers: {
              'List-Unsubscribe': '<mailto:hello@accueil.ai?subject=unsubscribe>',
            },
          })
          .then((result) => console.log('[waitlist] Resend result:', JSON.stringify(result)))
          .catch((err) => console.error('[waitlist] Resend email error:', err));
      } catch (emailErr) {
        console.error('[waitlist] Resend init error:', emailErr);
      }
    }

    const response = NextResponse.json({ success: true });
    if (isNewSession) {
      response.headers.set('Set-Cookie', sessionCookieHeader(sessionId));
    }
    return response;
  } catch (err) {
    console.error('Waitlist API error:', err);
    return NextResponse.json(
      { success: false, message: 'Something went wrong. Please try again.' },
      { status: 500 },
    );
  }
}
