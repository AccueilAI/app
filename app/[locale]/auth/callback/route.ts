import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params;
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Redirect to locale root; client-side AuthProvider reads
      // localStorage 'auth_return_to' for the final destination
      return NextResponse.redirect(new URL(`/${locale}`, request.url));
    }
  }

  // Auth failed — redirect to landing with error flag
  return NextResponse.redirect(
    new URL(`/${locale}?auth_error=true`, request.url),
  );
}
