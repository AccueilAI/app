'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Pencil, Trash2, Calendar } from 'lucide-react';
import type { Deadline, DeadlineType } from '@/lib/deadlines/types';
import { DeadlineForm } from './DeadlineForm';

function getDaysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(dateStr);
  deadline.setHours(0, 0, 0, 0);
  return Math.ceil(
    (deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
}

export function DeadlineList() {
  const t = useTranslations('Deadlines');

  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchDeadlines = useCallback(async () => {
    const res = await fetch('/api/deadlines');
    if (!res.ok) return;
    const data = await res.json();
    setDeadlines(data.deadlines ?? []);
  }, []);

  useEffect(() => {
    fetchDeadlines().finally(() => setLoading(false));
  }, [fetchDeadlines]);

  useEffect(() => {
    const handler = () => {
      fetchDeadlines();
    };
    window.addEventListener('deadline-created', handler);
    return () => window.removeEventListener('deadline-created', handler);
  }, [fetchDeadlines]);

  const toggleComplete = useCallback(
    async (id: string, completed: boolean) => {
      // Optimistic update
      setDeadlines((prev) =>
        prev.map((d) => (d.id === id ? { ...d, completed } : d)),
      );

      await fetch('/api/deadlines', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, completed }),
      });
    },
    [],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm(t('confirmDelete'))) return;

      setDeadlines((prev) => prev.filter((d) => d.id !== id));

      await fetch(`/api/deadlines?id=${id}`, { method: 'DELETE' });
    },
    [t],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#2B4C8C] border-t-transparent" />
      </div>
    );
  }

  const upcoming = deadlines.filter((d) => !d.completed);
  const completed = deadlines.filter((d) => d.completed);

  if (deadlines.length === 0) {
    return (
      <div className="rounded-xl border border-[#E5E3DE] bg-white p-8 text-center">
        <p className="text-sm font-medium text-[#1A1A2E]">
          {t('empty.noDeadlines')}
        </p>
        <p className="mt-1 text-xs text-[#5C5C6F]">{t('empty.addFirst')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-[#1A1A2E]">
            {t('status.upcoming')} ({upcoming.length})
          </h3>
          {upcoming.map((deadline) => {
            if (editingId === deadline.id) {
              return (
                <DeadlineForm
                  key={deadline.id}
                  editDeadline={deadline}
                  onClose={() => setEditingId(null)}
                />
              );
            }

            const daysLeft = getDaysUntil(deadline.deadline_date);
            const isOverdue = daysLeft < 0;
            const isDueToday = daysLeft === 0;

            return (
              <div
                key={deadline.id}
                className={`rounded-xl border bg-white p-5 transition-colors ${
                  isOverdue
                    ? 'border-red-300 bg-red-50/50'
                    : 'border-[#E5E3DE] hover:border-[#2B4C8C]/20'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() =>
                        toggleComplete(deadline.id, true)
                      }
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-[#E5E3DE] text-transparent transition-colors hover:border-[#2B4C8C] hover:text-[#2B4C8C]"
                      aria-label="Mark complete"
                    >
                      <Check className="h-3 w-3" />
                    </button>
                    <div>
                      <span className="text-sm font-medium text-[#1A1A2E]">
                        {deadline.title}
                      </span>
                      <span className="ml-2 inline-block rounded-full bg-[#EEF2F9] px-2.5 py-0.5 text-xs font-medium text-[#2B4C8C]">
                        {t(
                          `deadlineTypes.${deadline.deadline_type as DeadlineType}`,
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      onClick={() => setEditingId(deadline.id)}
                      className="rounded-lg p-1.5 text-[#5C5C6F] transition-colors hover:bg-[#EEF2F9] hover:text-[#2B4C8C]"
                      aria-label={t('form.edit')}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(deadline.id)}
                      className="rounded-lg p-1.5 text-[#5C5C6F] transition-colors hover:bg-red-50 hover:text-red-500"
                      aria-label={t('form.delete')}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-3 pl-8 text-xs text-[#5C5C6F]">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(deadline.deadline_date).toLocaleDateString()}
                  </span>
                  <span
                    className={`font-medium ${
                      isOverdue
                        ? 'text-red-600'
                        : isDueToday
                          ? 'text-amber-600'
                          : daysLeft <= 7
                            ? 'text-amber-600'
                            : 'text-emerald-600'
                    }`}
                  >
                    {isOverdue
                      ? t('status.daysOverdue', { count: Math.abs(daysLeft) })
                      : isDueToday
                        ? t('status.dueToday')
                        : t('status.daysLeft', { count: daysLeft })}
                  </span>
                  {deadline.reminder_sent && (
                    <span className="text-[#2B4C8C]">
                      {t('reminder.reminderSent')}
                    </span>
                  )}
                </div>

                {deadline.description && (
                  <p className="mt-2 pl-8 text-sm leading-relaxed text-[#5C5C6F]">
                    {deadline.description}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-[#5C5C6F]">
            {t('status.completed')} ({completed.length})
          </h3>
          {completed.map((deadline) => (
            <div
              key={deadline.id}
              className="rounded-xl border border-[#E5E3DE] bg-white/60 p-5 opacity-70"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() =>
                      toggleComplete(deadline.id, false)
                    }
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-emerald-400 bg-emerald-50 text-emerald-600"
                    aria-label="Mark incomplete"
                  >
                    <Check className="h-3 w-3" />
                  </button>
                  <span className="text-sm font-medium text-[#5C5C6F] line-through">
                    {deadline.title}
                  </span>
                  <span className="inline-block rounded-full bg-[#EEF2F9] px-2.5 py-0.5 text-xs font-medium text-[#2B4C8C]/60">
                    {t(
                      `deadlineTypes.${deadline.deadline_type as DeadlineType}`,
                    )}
                  </span>
                </div>
                <button
                  onClick={() => handleDelete(deadline.id)}
                  className="rounded-lg p-1.5 text-[#5C5C6F] transition-colors hover:bg-red-50 hover:text-red-500"
                  aria-label={t('form.delete')}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
