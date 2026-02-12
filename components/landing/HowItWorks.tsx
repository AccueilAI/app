import { useTranslations } from 'next-intl';

export function HowItWorks() {
  const t = useTranslations('HowItWorks');

  return (
    <section className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-[600px] text-center">
          <p className="text-[13px] font-bold uppercase tracking-[2px] text-[#002395]">
            {t('label')}
          </p>
          <h2 className="mt-4 font-serif text-[42px] leading-tight text-[#1A1A2E]">
            {t('headline')}
          </h2>
        </div>

        <div className="relative mt-14 grid gap-12 sm:grid-cols-3 sm:gap-8">
          {/* Connection lines (desktop) */}
          <div className="absolute left-[calc(33.33%-60px)] top-7 hidden h-0.5 w-[120px] bg-[#002395] sm:block" />
          <div className="absolute left-[calc(66.66%-60px)] top-7 hidden h-0.5 w-[120px] bg-[#002395] sm:block" />

          {([0, 1, 2] as const).map((i) => (
            <div key={i} className="relative text-center">
              {/* Number circle */}
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#2B4C8C]">
                <span className="text-xl font-bold text-white">{i + 1}</span>
              </div>
              <h3 className="mt-5 text-xl font-bold text-[#1A1A2E]">
                {t(`steps.${i}.title`)}
              </h3>
              <p className="mt-3 text-[15px] leading-[1.6] text-[#5C5C6F]">
                {t(`steps.${i}.description`)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
