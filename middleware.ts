import createIntlMiddleware from 'next-intl/middleware';
import { type NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';
import { updateSession } from '@/lib/supabase/middleware';

const intlMiddleware = createIntlMiddleware(routing);

const locales = ['en', 'fr', 'ko'] as const;

export default async function middleware(request: NextRequest) {
  // 0) Intercept OAuth code that lands on wrong URL (Supabase redirect fallback)
  const code = request.nextUrl.searchParams.get('code');
  if (code && !request.nextUrl.pathname.includes('/auth/callback')) {
    const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
    const pathSegment = request.nextUrl.pathname.split('/').filter(Boolean)[0];
    const locale =
      (locales as readonly string[]).includes(cookieLocale ?? '')
        ? cookieLocale
        : (locales as readonly string[]).includes(pathSegment ?? '')
          ? pathSegment
          : 'en';

    const callbackUrl = request.nextUrl.clone();
    callbackUrl.pathname = `/${locale}/auth/callback`;
    return NextResponse.redirect(callbackUrl);
  }

  // 1) i18n routing (locale detection + redirect)
  const response = intlMiddleware(request);

  // 2) Supabase session refresh (cookie-based auth)
  return await updateSession(request, response);
}

export const config = {
  matcher: '/((?!api|trpc|_next|_vercel|icon|apple-icon|sitemap|robots|.*\\..*).*)',
};
