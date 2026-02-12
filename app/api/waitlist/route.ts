import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { getResend } from '@/lib/resend';

const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 3;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return false;
  }

  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown';

  if (isRateLimited(ip)) {
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

  const supabase = getSupabase();

  // Check for duplicate
  const { data: existing } = await supabase
    .from('waitlist')
    .select('id')
    .eq('email', email)
    .single();

  if (existing) {
    return NextResponse.json(
      { success: false, message: 'This email is already on the waitlist.' },
      { status: 409 },
    );
  }

  // Insert into waitlist
  const { error: insertError } = await supabase
    .from('waitlist')
    .insert({ email, language: body.language ?? null });

  if (insertError) {
    console.error('Supabase insert error:', insertError);
    return NextResponse.json(
      { success: false, message: 'Something went wrong. Please try again.' },
      { status: 500 },
    );
  }

  // Get position
  const { count } = await supabase
    .from('waitlist')
    .select('*', { count: 'exact', head: true });

  // Send welcome email (non-blocking — don't fail the request if email fails)
  if (process.env.RESEND_API_KEY) {
    const resend = getResend();
    resend.emails
      .send({
        from: 'AccueilAI <onboarding@resend.dev>',
        to: email,
        subject: 'Welcome to the AccueilAI waitlist!',
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="color: #171717;">You're on the list!</h2>
            <p style="color: #525252; line-height: 1.6;">
              Thanks for joining the AccueilAI waitlist. You're <strong>#${count ?? '?'}</strong> in line.
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
  }

  return NextResponse.json({
    success: true,
    position: count ?? 0,
  });
}
