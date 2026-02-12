import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import {
  MessageCircleQuestion,
  ClipboardList,
  ScanText,
  CalendarClock,
} from 'lucide-react';

const features = [
  { icon: MessageCircleQuestion, color: 'bg-blue-50 text-blue-600' },
  { icon: ClipboardList, color: 'bg-emerald-50 text-emerald-600' },
  { icon: ScanText, color: 'bg-violet-50 text-violet-600' },
  { icon: CalendarClock, color: 'bg-amber-50 text-amber-600' },
] as const;

export function Features() {
  const t = useTranslations('Features');

  return (
    <section className="border-t border-neutral-100 bg-neutral-50/50 py-20 sm:py-28">
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

        <div className="mt-14 grid gap-6 sm:grid-cols-2">
          {features.map((feat, i) => {
            const Icon = feat.icon;
            return (
              <div
                key={i}
                className="flex gap-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-neutral-100 transition-shadow hover:shadow-md"
              >
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${feat.color}`}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-neutral-900">
                    {t(`items.${i}.title`)}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-neutral-600">
                    {t(`items.${i}.description`)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
