'use client';

import { useTranslations } from 'next-intl';

interface FollowUpChipsProps {
  questions: string[];
  onSend: (question: string) => void;
}

export function FollowUpChips({ questions, onSend }: FollowUpChipsProps) {
  const t = useTranslations('Chat');
  if (questions.length === 0) return null;
  return (
    <div className="mt-3">
      <p className="mb-2 text-xs font-medium text-[#8A8A9A]">{t('followUp.title')}</p>
      <div className="flex flex-wrap gap-2">
        {questions.map((q, i) => (
          <button
            key={i}
            onClick={() => onSend(q)}
            className="cursor-pointer rounded-full border border-[#D0D0D8] bg-white px-3 py-1.5 text-xs text-[#1A1A2E] transition-colors hover:border-[#2B4C8C] hover:bg-[#EEF2F9]"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
