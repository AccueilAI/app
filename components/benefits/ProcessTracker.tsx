'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Check, ListChecks } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import type { Deadline, DeadlineStage } from '@/lib/deadlines/types';
import { DEADLINE_STAGES } from '@/lib/deadlines/types';

export function ProcessTracker({ locale }: { locale: string }) {
  const t = useTranslations('Benefits');
  const { user } = useAuth();
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    fetch('/api/deadlines')
      .then((r) => r.json())
      .then((data) => setDeadlines(data.deadlines ?? []))
      .catch(() => setDeadlines([]))
      .finally(() => setLoading(false));
  }, [user]);

  async function updateStage(deadlineId: string, newStage: DeadlineStage) {
    const res = await fetch(`/api/deadlines/${deadlineId}/stage`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: newStage }),
    });
    if (res.ok) {
      setDeadlines((prev) =>
        prev.map((d) =>
          d.id === deadlineId
            ? { ...d, stage: newStage, stage_updated_at: new Date().toISOString() }
            : d
        )
      );
    }
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-[#D6DDE8] bg-white py-16 text-center">
        <ListChecks className="h-10 w-10 text-[#D6DDE8]" />
        <p className="text-[#5C5C6F]">{t('auth.loginRequired')}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl bg-white" />
        ))}
      </div>
    );
  }

  if (deadlines.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-[#D6DDE8] bg-white py-16 text-center">
        <ListChecks className="h-10 w-10 text-[#D6DDE8]" />
        <p className="text-[#5C5C6F]">{t('procedures.noProcedures')}</p>
        <a
          href={`/${locale}/deadlines`}
          className="mt-2 text-sm font-medium text-[#2B4C8C] hover:underline"
        >
          {t('procedures.title')} &rarr;
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-[#1A1A2E]">{t('procedures.title')}</h2>
      <p className="mb-4 text-sm text-[#5C5C6F]">{t('procedures.subtitle')}</p>

      {deadlines.map((deadline) => {
        const currentIdx = DEADLINE_STAGES.indexOf(deadline.stage);
        return (
          <div
            key={deadline.id}
            className="rounded-xl border border-[#D6DDE8] bg-white p-5"
          >
            {/* Title + date */}
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[15px] font-semibold text-[#1A1A2E]">
                {deadline.title}
              </h3>
              <time className="text-xs text-[#5C5C6F]">
                {new Date(deadline.deadline_date).toLocaleDateString(locale)}
              </time>
            </div>

            {/* Stepper */}
            <div className="mb-4 flex items-center gap-1">
              {DEADLINE_STAGES.map((stage, idx) => {
                const isComplete = idx < currentIdx;
                const isCurrent = idx === currentIdx;
                return (
                  <div key={stage} className="flex flex-1 flex-col items-center gap-1.5">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                        isComplete
                          ? 'bg-[#2B4C8C] text-white'
                          : isCurrent
                            ? 'border-2 border-[#2B4C8C] bg-white text-[#2B4C8C]'
                            : 'border border-[#D6DDE8] bg-[#EEF2F9] text-[#5C5C6F]'
                      }`}
                    >
                      {isComplete ? <Check className="h-4 w-4" /> : idx + 1}
                    </div>
                    <span
                      className={`text-center text-[10px] leading-tight sm:text-xs ${
                        isCurrent ? 'font-semibold text-[#2B4C8C]' : 'text-[#5C5C6F]'
                      }`}
                    >
                      {t(`procedures.stages.${stage}`)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Stage selector + last updated */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs text-[#5C5C6F]">{t('procedures.updateStage')}:</label>
                <select
                  value={deadline.stage}
                  onChange={(e) => updateStage(deadline.id, e.target.value as DeadlineStage)}
                  className="rounded-md border border-[#D6DDE8] bg-white px-2 py-1 text-xs text-[#1A1A2E]"
                >
                  {DEADLINE_STAGES.map((s) => (
                    <option key={s} value={s}>
                      {t(`procedures.stages.${s}`)}
                    </option>
                  ))}
                </select>
              </div>
              {deadline.stage_updated_at && (
                <time className="text-[10px] text-[#5C5C6F]">
                  {new Date(deadline.stage_updated_at).toLocaleDateString(locale)}
                </time>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
