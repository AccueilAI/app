'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/components/auth/AuthProvider';
import { LoginModal } from '@/components/auth/LoginModal';
import { DEADLINE_TYPES } from '@/lib/deadlines/types';
import type { Deadline } from '@/lib/deadlines/types';

interface DeadlineFormProps {
  editDeadline?: Deadline;
  onClose?: () => void;
}

export function DeadlineForm({ editDeadline, onClose }: DeadlineFormProps) {
  const t = useTranslations('Deadlines');
  const { user } = useAuth();

  const [loginOpen, setLoginOpen] = useState(false);
  const [form, setForm] = useState({
    title: editDeadline?.title ?? '',
    deadline_type: editDeadline?.deadline_type ?? '',
    deadline_date: editDeadline?.deadline_date ?? '',
    description: editDeadline?.description ?? '',
    days_before_reminder: editDeadline?.days_before_reminder ?? 7,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setField = useCallback(
    (field: string, value: string | number) => {
      setForm((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!form.title || !form.deadline_type || !form.deadline_date) return;

      setSubmitting(true);
      setError(null);

      try {
        const isEdit = !!editDeadline;
        const res = await fetch('/api/deadlines', {
          method: isEdit ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...(isEdit ? { id: editDeadline.id } : {}),
            title: form.title,
            deadline_type: form.deadline_type,
            deadline_date: form.deadline_date,
            description: form.description || null,
            days_before_reminder: form.days_before_reminder,
          }),
        });

        if (!res.ok) {
          setError('Failed to save');
          return;
        }

        window.dispatchEvent(new Event('deadline-created'));
        if (onClose) onClose();
      } catch {
        setError('Failed to save');
      } finally {
        setSubmitting(false);
      }
    },
    [form, editDeadline, onClose],
  );

  if (!user) {
    return (
      <>
        <div className="mb-6 rounded-xl border border-[#E5E3DE] bg-[#EEF2F9] p-5 text-center">
          <p className="mb-3 text-sm text-[#5C5C6F]">
            {t('auth.loginRequired')}
          </p>
          <button
            onClick={() => setLoginOpen(true)}
            className="rounded-lg bg-[#2B4C8C] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1E3A6E]"
          >
            {t('auth.loginRequired')}
          </button>
        </div>
        <LoginModal open={loginOpen} onOpenChange={setLoginOpen} />
      </>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 rounded-xl border border-[#E5E3DE] bg-white p-6"
    >
      <h2 className="mb-5 text-lg font-semibold text-[#1A1A2E]">
        {editDeadline ? t('form.edit') : t('form.submit')}
      </h2>

      <div className="space-y-4">
        {/* Title */}
        <div>
          <label
            htmlFor="deadline-title"
            className="mb-1.5 block text-sm font-medium text-[#1A1A2E]"
          >
            {t('form.title')} *
          </label>
          <input
            id="deadline-title"
            type="text"
            required
            maxLength={200}
            value={form.title}
            onChange={(e) => setField('title', e.target.value)}
            className="w-full rounded-lg border border-[#E5E3DE] px-3.5 py-2.5 text-sm text-[#1A1A2E] outline-none transition-colors focus:border-[#2B4C8C] focus:ring-1 focus:ring-[#2B4C8C]"
          />
        </div>

        {/* Type & Date */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="deadline-type"
              className="mb-1.5 block text-sm font-medium text-[#1A1A2E]"
            >
              {t('form.type')} *
            </label>
            <select
              id="deadline-type"
              required
              value={form.deadline_type}
              onChange={(e) => setField('deadline_type', e.target.value)}
              className="w-full rounded-lg border border-[#E5E3DE] px-3.5 py-2.5 text-sm text-[#1A1A2E] outline-none transition-colors focus:border-[#2B4C8C] focus:ring-1 focus:ring-[#2B4C8C]"
            >
              <option value="">—</option>
              {DEADLINE_TYPES.map((dt) => (
                <option key={dt} value={dt}>
                  {t(`deadlineTypes.${dt}`)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="deadline-date"
              className="mb-1.5 block text-sm font-medium text-[#1A1A2E]"
            >
              {t('form.date')} *
            </label>
            <input
              id="deadline-date"
              type="date"
              required
              value={form.deadline_date}
              onChange={(e) => setField('deadline_date', e.target.value)}
              className="w-full rounded-lg border border-[#E5E3DE] px-3.5 py-2.5 text-sm text-[#1A1A2E] outline-none transition-colors focus:border-[#2B4C8C] focus:ring-1 focus:ring-[#2B4C8C]"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="deadline-desc"
            className="mb-1.5 block text-sm font-medium text-[#1A1A2E]"
          >
            {t('form.description')}
          </label>
          <textarea
            id="deadline-desc"
            rows={2}
            maxLength={1000}
            value={form.description}
            onChange={(e) => setField('description', e.target.value)}
            className="w-full resize-none rounded-lg border border-[#E5E3DE] px-3.5 py-2.5 text-sm text-[#1A1A2E] outline-none transition-colors focus:border-[#2B4C8C] focus:ring-1 focus:ring-[#2B4C8C]"
          />
        </div>

        {/* Reminder days */}
        <div>
          <label
            htmlFor="deadline-reminder"
            className="mb-1.5 block text-sm font-medium text-[#1A1A2E]"
          >
            {t('form.reminder')}
          </label>
          <input
            id="deadline-reminder"
            type="number"
            min="0"
            max="365"
            value={form.days_before_reminder}
            onChange={(e) =>
              setField('days_before_reminder', Number(e.target.value))
            }
            className="w-full rounded-lg border border-[#E5E3DE] px-3.5 py-2.5 text-sm text-[#1A1A2E] outline-none transition-colors focus:border-[#2B4C8C] focus:ring-1 focus:ring-[#2B4C8C]"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={
              submitting ||
              !form.title ||
              !form.deadline_type ||
              !form.deadline_date
            }
            className="rounded-lg bg-[#2B4C8C] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1E3A6E] disabled:opacity-50"
          >
            {submitting
              ? '...'
              : editDeadline
                ? t('form.save')
                : t('form.submit')}
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[#E5E3DE] px-6 py-2.5 text-sm font-medium text-[#5C5C6F] transition-colors hover:bg-[#FAFAF8]"
            >
              {t('form.cancel')}
            </button>
          )}
          {error && (
            <span className="text-sm font-medium text-red-500">{error}</span>
          )}
        </div>
      </div>
    </form>
  );
}
