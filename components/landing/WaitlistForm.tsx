'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';

export function WaitlistForm() {
  const t = useTranslations('Waitlist');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    setStatus('loading');
    setErrorMsg('');

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Something went wrong');
      }

      setStatus('success');
      setEmail('');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  return (
    <section
      id="waitlist"
      className="border-t border-neutral-100 bg-neutral-50/50 py-20 sm:py-28"
    >
      <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
        <h2 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
          {t('headline')}
        </h2>
        <p className="mt-4 text-neutral-600">{t('subhead')}</p>

        {status === 'success' ? (
          <div className="mt-8 flex flex-col items-center gap-2 rounded-2xl bg-emerald-50 p-8">
            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
            <p className="text-lg font-semibold text-emerald-900">
              {t('success')}
            </p>
            <p className="text-sm text-emerald-700">{t('successSub')}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:gap-2">
              <Input
                type="email"
                placeholder={t('placeholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 flex-1 rounded-full px-5"
                disabled={status === 'loading'}
              />
              <Button
                type="submit"
                size="lg"
                className="h-12 gap-2 rounded-full px-6"
                disabled={status === 'loading'}
              >
                {status === 'loading' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    {t('cta')}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
            {status === 'error' && (
              <p className="mt-2 text-sm text-red-600">{errorMsg}</p>
            )}
            <p className="mt-3 text-xs text-neutral-500">{t('privacy')}</p>
          </form>
        )}
      </div>
    </section>
  );
}
