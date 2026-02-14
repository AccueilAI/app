import { NextRequest } from 'next/server';

const SESSION_COOKIE = '__accueil_sid';
const SESSION_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/**
 * Extract session ID from cookie, or generate a new one.
 * Uses session ID as primary rate-limit key; falls back to IP.
 */
export function getSessionId(request: NextRequest): {
  sessionId: string;
  isNew: boolean;
} {
  const existing = request.cookies.get(SESSION_COOKIE)?.value;
  if (existing && existing.length >= 20) {
    return { sessionId: existing, isNew: false };
  }
  return { sessionId: crypto.randomUUID(), isNew: true };
}

/**
 * Build the Set-Cookie header value for the session cookie.
 */
export function sessionCookieHeader(sessionId: string): string {
  const parts = [
    `${SESSION_COOKIE}=${sessionId}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${SESSION_MAX_AGE}`,
  ];
  if (process.env.NODE_ENV === 'production') parts.push('Secure');
  return parts.join('; ');
}

/**
 * Get a rate-limit identifier: session ID (preferred) or IP (fallback).
 */
export function getRateLimitKey(request: NextRequest): {
  key: string;
  sessionId: string;
  isNewSession: boolean;
} {
  const { sessionId, isNew } = getSessionId(request);
  return { key: sessionId, sessionId, isNewSession: isNew };
}
