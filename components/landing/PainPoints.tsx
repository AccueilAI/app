import { useTranslations } from 'next-intl';
import { FileX, Shuffle, AlarmClock } from 'lucide-react';

const items = [
  { icon: FileX, color: 'text-[#002395]' },
  { icon: Shuffle, color: 'text-[#002395]' },
  { icon: AlarmClock, color: 'text-[#ED2939]' },
] as const;

export function PainPoints() {
  const t = useTranslations('PainPoints');

  return (
    <section className="bg-[#FAFAF8] py-14 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-[600px] text-center">
          <p className="text-[13px] font-bold uppercase tracking-[2px] text-[#002395]">
            {t('label')}
          </p>
          <h2 className="mt-3 font-serif text-2xl leading-tight text-[#1A1A2E] sm:mt-4 sm:text-[42px]">
            {t('headline')}
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-[#5C5C6F] sm:mt-4 sm:text-lg">
            {t('subhead')}
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:mt-12 sm:grid-cols-3 sm:gap-6">
          {items.map((item, i) => {
            const Icon = item.icon;
            return (
              <div
                key={i}
                className="rounded-[14px] border border-l-4 border-[#E5E3DE] border-l-[#ED2939] bg-white p-5 sm:p-8"
              >
                <Icon className={`h-8 w-8 ${item.color}`} />
                <h3 className="mt-4 text-lg font-bold text-[#1A1A2E]">
                  {t(`items.${i}.title`)}
                </h3>
                <p className="mt-2 text-[15px] leading-[1.6] text-[#5C5C6F]">
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
