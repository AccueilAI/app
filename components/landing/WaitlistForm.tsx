'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Loader2, CheckCircle2, X } from 'lucide-react';

const REGION_KEYS = [
  'idf', 'ara', 'naq', 'occ', 'hdf', 'paca', 'pdl', 'bre', 'nor', 'ges', 'bfc', 'cvl', 'cor', 'dom', 'other',
] as const;

const DIFFICULTY_KEYS = [
  'visa', 'housing', 'health', 'employment', 'banking', 'taxes', 'education', 'driving', 'other',
] as const;

const FEATURE_KEYS = [
  'chat', 'checklist', 'deadlines', 'benefits', 'email', 'phone', 'experiences', 'other',
] as const;

export function WaitlistForm() {
  const t = useTranslations('Waitlist');
  const locale = useLocale();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'survey' | 'loading' | 'success' | 'already' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  // Survey fields
  const [nationality, setNationality] = useState('');
  const [region, setRegion] = useState('');
  const [adminDifficulty, setAdminDifficulty] = useState('');
  const [desiredFeature, setDesiredFeature] = useState('');

  function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus('survey');
  }

  async function submitWaitlist(includeSurvey: boolean) {
    setStatus('loading');
    setErrorMsg('');

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          language: locale,
          ...(includeSurvey && {
            nationality: nationality || undefined,
            region: region || undefined,
            admin_difficulty: adminDifficulty || undefined,
            desired_feature: desiredFeature || undefined,
          }),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data.error === 'already_registered') {
          setStatus('already');
          setEmail('');
          return;
        }
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
    <section id="waitlist" className="bg-[#001A6E]">
      {/* Tricolor top accent */}
      <div className="flex h-[3px]">
        <div className="flex-1 bg-[#002395]" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-[#ED2939]" />
      </div>

      <div className="px-4 py-14 sm:py-28">
        <div className="mx-auto max-w-[600px] text-center">
          <h2 className="font-serif text-2xl leading-tight text-white sm:text-[42px]">
            {t('headline')}
          </h2>
          <p className="mt-3 text-[15px] leading-[1.6] text-[#C0C8E0] sm:mt-5 sm:text-lg">
            {t('subhead')}
          </p>

          {status === 'success' || status === 'already' ? (
            <div className="mt-10 flex flex-col items-center gap-3 rounded-2xl bg-white/10 p-10">
              <CheckCircle2 className="h-10 w-10 text-emerald-400" />
              <p className="text-lg font-semibold text-white">
                {status === 'already' ? t('alreadyRegistered') : t('success')}
              </p>
              <p className="text-sm text-[#C0C8E0]">
                {status === 'already' ? t('alreadyRegisteredSub') : t('successSub')}
              </p>
            </div>
          ) : (
            <>
              <form
                onSubmit={handleEmailSubmit}
                className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
              >
                <input
                  type="email"
                  placeholder={t('placeholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={status === 'loading' || status === 'survey'}
                  className="h-12 w-full rounded-lg border border-[#D0D0D8] bg-white px-5 text-[15px] text-[#1A1A2E] placeholder:text-[#8A8A9A] focus:outline-none focus:ring-2 focus:ring-white/30 sm:w-[360px]"
                />
                <button
                  type="submit"
                  disabled={status === 'loading' || status === 'survey'}
                  className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#ED2939] px-8 text-[15px] font-semibold text-white transition-colors hover:bg-[#D41F2F] disabled:opacity-60"
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

      {/* Survey Modal */}
      {status === 'survey' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl sm:p-8">
            <button
              onClick={() => setStatus('idle')}
              className="absolute right-4 top-4 cursor-pointer text-[#8A8A9A] transition-colors hover:text-[#1A1A2E]"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-bold text-[#1A1A2E]">{t('survey.title')}</h3>
            <p className="mt-1 text-sm text-[#5C5C6F]">{t('survey.subtitle')}</p>

            <div className="mt-6 space-y-4">
              {/* Nationality */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#1A1A2E]">
                  {t('survey.nationality')}
                </label>
                <input
                  type="text"
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  placeholder={t('survey.nationalityPlaceholder')}
                  className="h-10 w-full rounded-lg border border-[#E5E3DE] px-3 text-sm text-[#1A1A2E] placeholder:text-[#8A8A9A] focus:border-[#2B4C8C] focus:outline-none focus:ring-1 focus:ring-[#2B4C8C]"
                />
              </div>

              {/* Region */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#1A1A2E]">
                  {t('survey.region')}
                </label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="h-10 w-full cursor-pointer rounded-lg border border-[#E5E3DE] px-3 text-sm text-[#1A1A2E] focus:border-[#2B4C8C] focus:outline-none focus:ring-1 focus:ring-[#2B4C8C]"
                >
                  <option value="">{t('survey.regionPlaceholder')}</option>
                  {REGION_KEYS.map((key) => (
                    <option key={key} value={key}>{t(`survey.regions.${key}`)}</option>
                  ))}
                </select>
              </div>

              {/* Admin Difficulty */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#1A1A2E]">
                  {t('survey.adminDifficulty')}
                </label>
                <select
                  value={adminDifficulty}
                  onChange={(e) => setAdminDifficulty(e.target.value)}
                  className="h-10 w-full cursor-pointer rounded-lg border border-[#E5E3DE] px-3 text-sm text-[#1A1A2E] focus:border-[#2B4C8C] focus:outline-none focus:ring-1 focus:ring-[#2B4C8C]"
                >
                  <option value="">{t('survey.adminDifficultyPlaceholder')}</option>
                  {DIFFICULTY_KEYS.map((key) => (
                    <option key={key} value={key}>{t(`survey.difficulties.${key}`)}</option>
                  ))}
                </select>
              </div>

              {/* Desired Feature */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#1A1A2E]">
                  {t('survey.desiredFeature')}
                </label>
                <select
                  value={desiredFeature}
                  onChange={(e) => setDesiredFeature(e.target.value)}
                  className="h-10 w-full cursor-pointer rounded-lg border border-[#E5E3DE] px-3 text-sm text-[#1A1A2E] focus:border-[#2B4C8C] focus:outline-none focus:ring-1 focus:ring-[#2B4C8C]"
                >
                  <option value="">{t('survey.desiredFeaturePlaceholder')}</option>
                  {FEATURE_KEYS.map((key) => (
                    <option key={key} value={key}>{t(`survey.features.${key}`)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-2">
              <button
                onClick={() => submitWaitlist(true)}
                className="flex h-11 cursor-pointer items-center justify-center rounded-lg bg-[#002395] text-sm font-semibold text-white transition-colors hover:bg-[#001A6E]"
              >
                {t('survey.submit')}
              </button>
              <button
                onClick={() => submitWaitlist(false)}
                className="flex h-9 cursor-pointer items-center justify-center text-sm text-[#5C5C6F] transition-colors hover:text-[#1A1A2E]"
              >
                {t('survey.skip')}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
