import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';

const tiers = [
  { key: 'free', featured: false },
  { key: 'essential', featured: true },
  { key: 'premium', featured: false },
] as const;

export function Pricing() {
  const t = useTranslations('Pricing');

  return (
    <section id="pricing" className="bg-white py-14 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-[600px] text-center">
          <p className="text-[13px] font-bold uppercase tracking-[2px] text-[#002395]">
            {t('badge')}
          </p>
          <h2 className="mt-3 whitespace-pre-line font-serif text-2xl leading-tight text-[#1A1A2E] sm:mt-4 sm:text-[42px]">
            {t('headline')}
          </h2>
          <p className="mt-3 text-[15px] text-[#5C5C6F] sm:mt-4 sm:text-lg">{t('subhead')}</p>
        </div>

        <div className="mt-8 grid gap-4 sm:mt-14 sm:grid-cols-3 sm:gap-6">
          {tiers.map(({ key, featured }) => (
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
              <h3
                className={`text-base font-bold ${featured ? 'text-white/80' : 'text-[#5C5C6F]'}`}
              >
                {t(`tiers.${key}.name`)}
              </h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span
                  className={`text-3xl font-bold tracking-tight sm:text-4xl ${featured ? 'text-white' : 'text-[#1A1A2E]'}`}
                >
                  {t(`tiers.${key}.price`)}
                </span>
                <span
                  className={`text-sm ${featured ? 'text-white/60' : 'text-[#5C5C6F]'}`}
                >
                  {t(`tiers.${key}.period`)}
                </span>
              </div>
              <p
                className={`mt-3 text-[15px] leading-relaxed ${featured ? 'text-white/80' : 'text-[#5C5C6F]'}`}
              >
                {t(`tiers.${key}.description`)}
              </p>

              <div
                className={`my-6 h-px ${featured ? 'bg-white/20' : 'bg-[#E5E3DE]'}`}
              />

              <ul className="flex-1 space-y-3">
                {[0, 1, 2, 3].map((i) => {
                  const feature = t.has(`tiers.${key}.features.${i}`)
                    ? t(`tiers.${key}.features.${i}`)
                    : null;
                  if (!feature) return null;
                  return (
                    <li key={i} className="flex items-start gap-2.5 text-sm">
                      <Check
                        className={`mt-0.5 h-4 w-4 shrink-0 ${featured ? 'text-white/60' : 'text-[#2B4C8C]'}`}
                      />
                      <span
                        className={featured ? 'text-white/90' : 'text-[#5C5C6F]'}
                      >
                        {feature}
                      </span>
                    </li>
                  );
                })}
              </ul>

              <a
                href="#waitlist"
                className={`mt-8 block rounded-lg py-3.5 text-center text-[15px] font-semibold transition-colors ${
                  featured
                    ? 'bg-white text-[#002395] hover:bg-white/90'
                    : 'border-[1.5px] border-[#2B4C8C] text-[#2B4C8C] hover:bg-[#2B4C8C]/5'
                }`}
              >
                {t('cta')}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
