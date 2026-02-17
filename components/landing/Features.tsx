import { useTranslations } from 'next-intl';
import {
  MessageCircleQuestion,
  ClipboardList,
  ScanText,
  CalendarClock,
  Users,
  Gift,
} from 'lucide-react';

const features = [
  { icon: MessageCircleQuestion, color: 'bg-[#EEF2F9] text-[#2B4C8C]' },
  { icon: ClipboardList, color: 'bg-[#EEF2F9] text-[#2B4C8C]' },
  { icon: ScanText, color: 'bg-[#EEF2F9] text-[#2B4C8C]' },
  { icon: CalendarClock, color: 'bg-[#EEF2F9] text-[#2B4C8C]' },
  { icon: Users, color: 'bg-[#EEF2F9] text-[#2B4C8C]' },
  { icon: Gift, color: 'bg-[#EEF2F9] text-[#2B4C8C]' },
] as const;

export function Features() {
  const t = useTranslations('Features');

  return (
    <section id="features" className="bg-[#FAFAF8] py-14 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-[600px] text-center">
          <p className="text-[13px] font-bold uppercase tracking-[2px] text-[#002395]">
            {t('badge')}
          </p>
          <h2 className="mt-3 whitespace-pre-line font-serif text-2xl leading-[1.2] text-[#1A1A2E] sm:mt-4 sm:text-[42px]">
            {t('headline')}
          </h2>
          <p className="mt-3 text-[15px] text-[#5C5C6F] sm:mt-4 sm:text-lg">{t('subhead')}</p>
        </div>

        <div className="mt-8 grid gap-4 sm:mt-12 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
          {features.map((feat, i) => {
            const Icon = feat.icon;
            return (
              <div
                key={i}
                className="rounded-[14px] border border-[#E5E3DE] bg-white p-5 sm:p-8"
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
