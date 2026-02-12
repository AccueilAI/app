import { useTranslations } from 'next-intl';
import { FileWarning, MapPinOff, Clock } from 'lucide-react';

const icons = [FileWarning, MapPinOff, Clock] as const;

export function PainPoints() {
  const t = useTranslations('PainPoints');

  return (
    <section className="border-t border-neutral-100 bg-neutral-50/50 py-20 sm:py-28">
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
              <div key={i} className="group relative rounded-2xl bg-white p-6 shadow-sm ring-1 ring-neutral-100 transition-shadow hover:shadow-md">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-600">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-neutral-900">
                  {t(`items.${i}.title`)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                  {t(`items.${i}.description`)}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
