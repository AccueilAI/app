import createIntlMiddleware from 'next-intl/middleware';
import { type NextRequest } from 'next/server';
import { routing } from './i18n/routing';
import { updateSession } from '@/lib/supabase/middleware';

const intlMiddleware = createIntlMiddleware(routing);

export default async function middleware(request: NextRequest) {
  // 1) i18n routing (locale detection + redirect)
  const response = intlMiddleware(request);

  // 2) Supabase session refresh (cookie-based auth)
  return await updateSession(request, response);
}

export const config = {
  matcher: '/((?!api|trpc|_next|_vercel|icon|apple-icon|sitemap|robots|.*\\..*).*)',
};
