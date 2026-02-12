import { useTranslations } from 'next-intl';
import { MessageSquareText, Brain, CheckCircle } from 'lucide-react';

const icons = [MessageSquareText, Brain, CheckCircle] as const;

export function HowItWorks() {
  const t = useTranslations('HowItWorks');

  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="text-center text-sm font-medium uppercase tracking-widest text-neutral-500">
          {t('label')}
        </p>
        <h2 className="mx-auto mt-3 max-w-2xl text-center text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
          {t('headline')}
        </h2>

        <div className="mt-14 grid gap-8 sm:grid-cols-3">
          {([0, 1, 2] as const).map((i) => {
            const Icon = icons[i];
            return (
              <div key={i} className="relative text-center">
                {/* Step number connector */}
                {i < 2 && (
                  <div className="absolute right-0 top-8 hidden h-px w-full translate-x-1/2 bg-neutral-200 sm:block" />
                )}
                <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <Icon className="h-7 w-7" />
                  <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                    {i + 1}
                  </span>
                </div>
                <h3 className="mt-5 text-lg font-semibold text-neutral-900">
                  {t(`steps.${i}.title`)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                  {t(`steps.${i}.description`)}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
