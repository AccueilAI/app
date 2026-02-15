'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Sparkles, Stamp, Home, HeartPulse, Receipt, Briefcase, HelpCircle } from 'lucide-react';

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  visa: Stamp,
  housing: Home,
  health: HeartPulse,
  tax: Receipt,
  work: Briefcase,
  other: HelpCircle,
};

const CATEGORIES = ['visa', 'housing', 'health', 'tax', 'work', 'other'] as const;

interface OnboardingWelcomeProps {
  onSend: (question: string) => void;
}

export function OnboardingWelcome({ onSend }: OnboardingWelcomeProps) {
  const t = useTranslations('Chat');
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#EEF2F9]">
        <Sparkles className="h-6 w-6 text-[#2B4C8C]" />
      </div>
      <h2 className="font-serif text-2xl text-[#1A1A2E]">{t('onboarding.title')}</h2>
      <p className="mt-2 max-w-md text-sm text-[#5C5C6F]">{t('welcomeSub')}</p>
      <div className="mt-8 grid w-full max-w-lg grid-cols-2 gap-3 sm:grid-cols-3">
        {CATEGORIES.map(cat => {
          const Icon = CATEGORY_ICONS[cat];
          const isOpen = expanded === cat;
          return (
            <div key={cat} className="flex flex-col">
              <button
                onClick={() => setExpanded(isOpen ? null : cat)}
                className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border p-4 text-sm transition-all ${
                  isOpen
                    ? 'border-[#2B4C8C] bg-[#EEF2F9] text-[#2B4C8C]'
                    : 'border-[#E5E3DE] bg-white text-[#1A1A2E] hover:border-[#2B4C8C] hover:bg-[#EEF2F9]'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{t(`onboarding.categories.${cat}`)}</span>
              </button>
              {isOpen && (
                <div className="mt-2 flex flex-col gap-1.5">
                  {[0, 1, 2].map(i => (
                    <button
                      key={i}
                      onClick={() => onSend(t(`onboarding.examples.${cat}.${i}`))}
                      className="cursor-pointer rounded-lg border border-[#D0D0D8] bg-white px-3 py-2 text-left text-xs text-[#5C5C6F] transition-colors hover:border-[#2B4C8C] hover:bg-[#EEF2F9] hover:text-[#1A1A2E]"
                    >
                      {t(`onboarding.examples.${cat}.${i}`)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
