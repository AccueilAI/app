'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, CheckCircle2 } from 'lucide-react';

export function WaitlistForm() {
  const t = useTranslations('Waitlist');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [position, setPosition] = useState<number | null>(null);

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

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || 'Something went wrong');
      }

      setPosition(data.position ?? null);
      setStatus('success');
      setEmail('');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  return (
    <section id="waitlist" className="bg-[#001A6E]">
      {/* Tricolor top accent */}
      <div className="flex h-[3px]">
        <div className="flex-1 bg-[#002395]" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-[#ED2939]" />
      </div>

      <div className="px-4 py-20 sm:py-28">
        <div className="mx-auto max-w-[600px] text-center">
          <h2 className="font-serif text-[42px] leading-tight text-white">
            {t('headline')}
          </h2>
          <p className="mt-5 text-lg leading-[1.6] text-[#C0C8E0]">
            {t('subhead')}
          </p>

          {status === 'success' ? (
            <div className="mt-10 flex flex-col items-center gap-3 rounded-2xl bg-white/10 p-10">
              <CheckCircle2 className="h-10 w-10 text-emerald-400" />
              <p className="text-lg font-semibold text-white">{t('success')}</p>
              <p className="text-sm text-[#C0C8E0]">
                {t('successSub', { position: position ?? '?' })}
              </p>
            </div>
          ) : (
            <>
              <form
                onSubmit={handleSubmit}
                className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
              >
                <input
                  type="email"
                  placeholder={t('placeholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={status === 'loading'}
                  className="h-12 w-full rounded-lg border border-[#D0D0D8] bg-white px-5 text-[15px] text-[#1A1A2E] placeholder:text-[#8A8A9A] focus:outline-none focus:ring-2 focus:ring-white/30 sm:w-[360px]"
                />
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="flex h-12 items-center justify-center gap-2 rounded-lg bg-[#ED2939] px-8 text-[15px] font-semibold text-white transition-colors hover:bg-[#D41F2F] disabled:opacity-60"
                >
                  {status === 'loading' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    t('cta')
                  )}
                </button>
              </form>
              {status === 'error' && (
                <p className="mt-3 text-sm text-red-300">{errorMsg}</p>
              )}
              <p className="mt-4 text-[13px] text-[#8A9AC0]">{t('privacy')}</p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
