import { useTranslations } from 'next-intl';
import { ShieldCheck } from 'lucide-react';

export function Hero() {
  const t = useTranslations('Hero');

  return (
    <section className="relative overflow-hidden pt-16">
      {/* French tricolor top accent */}
      <div className="flex bg-[#E8E6E1]">
        <div className="h-1 flex-1 bg-[#002395]" />
        <div className="h-1 flex-1 bg-[#F5F5F3]" />
        <div className="h-1 flex-1 bg-[#ED2939]" />
      </div>

      <div className="flex min-h-[80vh] items-center justify-center px-4 sm:px-6">
        <div className="mx-auto max-w-[820px] text-center">
          {/* Trust badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-[#EEF2F9] px-5 py-2">
            <ShieldCheck className="h-4 w-4 text-[#2B4C8C]" />
            <span className="text-[13px] font-semibold text-[#2B4C8C]">
              {t('trust')}
            </span>
          </div>

          {/* Headline */}
          <h1 className="mx-auto max-w-[720px] font-serif text-5xl leading-[1.15] text-[#1A1A2E] sm:text-[56px]">
            {t('headline')}
          </h1>

          {/* Subhead */}
          <p className="mx-auto mt-8 max-w-[560px] text-[19px] leading-[1.65] text-[#5C5C6F]">
            {t('subhead')}
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <a
              href="#waitlist"
              className="rounded-lg bg-[#2B4C8C] px-8 py-3.5 text-base font-semibold text-white transition-colors hover:bg-[#1E3A6E]"
            >
              {t('cta')}
            </a>
            <a
              href="#features"
              className="rounded-lg border-[1.5px] border-[#2B4C8C] px-8 py-3.5 text-base font-semibold text-[#2B4C8C] transition-colors hover:bg-[#2B4C8C]/5"
            >
              {t('ctaSub')}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
