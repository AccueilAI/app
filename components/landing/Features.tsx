import { useTranslations } from 'next-intl';
import {
  MessageCircleQuestion,
  ClipboardList,
  ScanText,
  CalendarClock,
} from 'lucide-react';

const features = [
  { icon: MessageCircleQuestion, color: 'bg-[#EEF2F9] text-[#2B4C8C]' },
  { icon: ClipboardList, color: 'bg-[#EEF2F9] text-[#2B4C8C]' },
  { icon: ScanText, color: 'bg-[#EEF2F9] text-[#2B4C8C]' },
  { icon: CalendarClock, color: 'bg-[#EEF2F9] text-[#2B4C8C]' },
] as const;

export function Features() {
  const t = useTranslations('Features');

  return (
    <section id="features" className="bg-[#FAFAF8] py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-[600px] text-center">
          <p className="text-[13px] font-bold uppercase tracking-[2px] text-[#002395]">
            {t('badge')}
          </p>
          <h2 className="mt-4 whitespace-pre-line font-serif text-[42px] leading-[1.2] text-[#1A1A2E]">
            {t('headline')}
          </h2>
          <p className="mt-4 text-lg text-[#5C5C6F]">{t('subhead')}</p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {features.map((feat, i) => {
            const Icon = feat.icon;
            return (
              <div
                key={i}
                className="rounded-[14px] border border-[#E5E3DE] bg-white p-8"
              >
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl ${feat.color}`}
                >
                  <Icon className="h-6 w-6" />
                </div>
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
