import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

const tiers = [
  { key: 'free', featured: false },
  { key: 'essential', featured: true },
  { key: 'premium', featured: false },
] as const;

export function Pricing() {
  const t = useTranslations('Pricing');

  return (
    <section id="pricing" className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Badge
          variant="secondary"
          className="mx-auto mb-4 block w-fit rounded-full px-3 py-1 text-xs font-medium"
        >
          {t('badge')}
        </Badge>
        <h2 className="mx-auto max-w-2xl text-center text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
          {t('headline')}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-center text-neutral-600">
          {t('subhead')}
        </p>

        <div className="mt-14 grid gap-6 sm:grid-cols-3">
          {tiers.map(({ key, featured }) => (
            <div
              key={key}
              className={`relative flex flex-col rounded-2xl p-6 ${
                featured
                  ? 'bg-neutral-900 text-white shadow-xl ring-1 ring-neutral-900'
                  : 'bg-white shadow-sm ring-1 ring-neutral-200'
              }`}
            >
              {featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-0.5 text-xs font-medium text-white">
                  {t('popular')}
                </span>
              )}
              <h3
                className={`text-lg font-semibold ${featured ? 'text-white' : 'text-neutral-900'}`}
              >
                {t(`tiers.${key}.name`)}
              </h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span
                  className={`text-4xl font-bold tracking-tight ${featured ? 'text-white' : 'text-neutral-900'}`}
                >
                  {t(`tiers.${key}.price`)}
                </span>
                <span
                  className={`text-sm ${featured ? 'text-neutral-400' : 'text-neutral-500'}`}
                >
                  {t(`tiers.${key}.period`)}
                </span>
              </div>
              <p
                className={`mt-3 text-sm ${featured ? 'text-neutral-300' : 'text-neutral-600'}`}
              >
                {t(`tiers.${key}.description`)}
              </p>

              <ul className="mt-6 flex-1 space-y-3">
                {[0, 1, 2, 3].map((i) => {
                  const feature = t.has(`tiers.${key}.features.${i}`)
                    ? t(`tiers.${key}.features.${i}`)
                    : null;
                  if (!feature) return null;
                  return (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check
                        className={`mt-0.5 h-4 w-4 shrink-0 ${featured ? 'text-blue-400' : 'text-blue-600'}`}
                      />
                      <span
                        className={
                          featured ? 'text-neutral-200' : 'text-neutral-700'
                        }
                      >
                        {feature}
                      </span>
                    </li>
                  );
                })}
              </ul>

              <Button
                className="mt-6 w-full rounded-full"
                variant={featured ? 'secondary' : 'outline'}
                asChild
              >
                <a href="#waitlist">{t('cta')}</a>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
