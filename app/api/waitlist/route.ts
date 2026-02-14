import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/client';
import { getResend } from '@/lib/resend';
import { waitlistRateLimit } from '@/lib/rate-limit';
import { getRateLimitKey, sessionCookieHeader } from '@/lib/session';

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
        { success: false, message: 'This email is already on the waitlist.' },
        { status: 409 },
      );
    }

    // Insert into waitlist and get the assigned id as position
    const { data: inserted, error: insertError } = await supabase
      .from('waitlist')
      .insert({ email, language: body.language ?? null })
      .select('id')
      .single();

    if (insertError || !inserted) {
      // Unique constraint violation — race condition with concurrent request
      if (insertError?.code === '23505') {
        return NextResponse.json(
          { success: false, message: 'This email is already on the waitlist.' },
          { status: 409 },
        );
      }
      console.error('Supabase insert error:', insertError);
      return NextResponse.json(
        { success: false, message: 'Something went wrong. Please try again.' },
        { status: 500 },
      );
    }

    const position = inserted.id;

    // Send welcome email (non-blocking — don't fail the request if email fails)
    if (process.env.RESEND_API_KEY) {
      try {
        const resend = getResend();
        resend.emails
          .send({
            from: 'AccueilAI <hello@accueil.ai>',
            to: email,
            subject: 'Welcome to the AccueilAI waitlist!',
            html: `
              <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
                <h2 style="color: #171717;">You're on the list!</h2>
                <p style="color: #525252; line-height: 1.6;">
                  Thanks for joining the AccueilAI waitlist. You're <strong>#${position}</strong> in line.
                </p>
                <p style="color: #525252; line-height: 1.6;">
                  We're building an AI-powered assistant to help expats navigate French bureaucracy
                  — visas, CAF, taxes, healthcare — in your language.
                </p>
                <p style="color: #525252; line-height: 1.6;">
                  We'll notify you as soon as early access is ready. Stay tuned!
                </p>
                <p style="color: #a3a3a3; font-size: 12px; margin-top: 32px;">
                  AccueilAI · AI-powered admin assistant for expats in France
                </p>
              </div>
            `,
          })
          .catch((err) => console.error('Resend email error:', err));
      } catch (emailErr) {
        console.error('Resend init error:', emailErr);
      }
    }

    const response = NextResponse.json({
      success: true,
      position,
    });
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
