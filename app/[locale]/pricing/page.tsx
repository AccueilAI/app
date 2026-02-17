'use client';

import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { Check, Lock } from 'lucide-react';
import { Navbar } from '@/components/landing/Navbar';
import { useAuth } from '@/components/auth/AuthProvider';

const tiers = [
  { key: 'free', featured: false },
  { key: 'plus', featured: true },
  { key: 'pro', featured: false },
] as const;

export default function PricingPage() {
  const t = useTranslations('Pricing');
  const tp = useTranslations('Plans');
  const locale = useLocale();
  const { tier } = useAuth();

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 pt-24 pb-16">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#1A1A2E]">{tp('pageTitle')}</h1>
          <p className="mt-2 text-sm text-[#5C5C6F]">{tp('pageSubtitle')}</p>
        </div>

        {/* Coming soon banner */}
        <div className="mx-auto mt-6 max-w-md rounded-lg border border-[#E5E3DE] bg-[#FAFAF8] p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-sm font-semibold text-[#1A1A2E]">
            <Lock className="h-4 w-4" />
            {tp('comingSoon')}
          </div>
          <p className="mt-1 text-xs text-[#5C5C6F]">{tp('comingSoonDesc')}</p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3 sm:gap-6">
          {tiers.map(({ key, featured }) => {
            const isCurrent = tier === key;

            return (
              <div
                key={key}
                className={`relative flex flex-col rounded-2xl p-6 sm:p-8 ${
                  featured
                    ? 'bg-[#002395] text-white'
                    : 'border border-[#E8E6E1] bg-white'
                }`}
              >
                {featured && (
                  <span className="absolute right-6 top-6 rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
                    {t('popular')}
                  </span>
                )}

                {isCurrent && (
                  <span className={`mb-3 inline-flex w-fit rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                    featured ? 'bg-white/20 text-white' : 'bg-[#EEF2F9] text-[#2B4C8C]'
                  }`}>
                    {tp('currentPlan')}
                  </span>
                )}

                <h3 className={`text-base font-bold ${featured ? 'text-white/80' : 'text-[#5C5C6F]'}`}>
                  {t(`tiers.${key}.name`)}
                </h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className={`text-3xl font-bold tracking-tight sm:text-4xl ${featured ? 'text-white' : 'text-[#1A1A2E]'}`}>
                    {t(`tiers.${key}.price`)}
                  </span>
                  <span className={`text-sm ${featured ? 'text-white/60' : 'text-[#5C5C6F]'}`}>
                    {t(`tiers.${key}.period`)}
                  </span>
                </div>
                <p className={`mt-3 text-[15px] leading-relaxed ${featured ? 'text-white/80' : 'text-[#5C5C6F]'}`}>
                  {t(`tiers.${key}.description`)}
                </p>

                <div className={`my-6 h-px ${featured ? 'bg-white/20' : 'bg-[#E5E3DE]'}`} />

                <ul className="flex-1 space-y-3">
                  {Array.from({ length: 7 }, (_, i) => i).map((i) => {
                    const feature = t.has(`tiers.${key}.features.${i}`)
                      ? t(`tiers.${key}.features.${i}`)
                      : null;
                    if (!feature) return null;
                    return (
                      <li key={i} className="flex items-start gap-2.5 text-sm">
                        <Check className={`mt-0.5 h-4 w-4 shrink-0 ${featured ? 'text-white/60' : 'text-[#2B4C8C]'}`} />
                        <span className={featured ? 'text-white/90' : 'text-[#5C5C6F]'}>
                          {feature}
                        </span>
                      </li>
                    );
                  })}
                </ul>

                <button
                  disabled
                  className={`mt-8 block w-full cursor-not-allowed rounded-lg py-3.5 text-center text-[15px] font-semibold opacity-50 ${
                    isCurrent
                      ? featured
                        ? 'bg-white/30 text-white'
                        : 'border-[1.5px] border-[#E5E3DE] text-[#5C5C6F]'
                      : featured
                        ? 'bg-white text-[#002395]'
                        : 'border-[1.5px] border-[#2B4C8C] text-[#2B4C8C]'
                  }`}
                >
                  {isCurrent ? tp('currentPlan') : tp('selectPlan')}
                </button>
              </div>
            );
          })}
        </div>

        {/* Early bird banner */}
        <div className="mx-auto mt-8 max-w-md rounded-full bg-[#ED2939]/10 px-6 py-2.5 text-center text-sm font-semibold text-[#ED2939]">
          {t('earlyBird')}
        </div>
      </main>
    </>
  );
}
