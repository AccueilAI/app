'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/components/auth/AuthProvider';
import { LoginModal } from '@/components/auth/LoginModal';
import { PROCEDURE_TYPES, OUTCOMES } from '@/lib/experiences/types';

export function ExperienceForm() {
  const t = useTranslations('Experiences');
  const { user, profile } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({
    procedure_type: '' as string,
    tips: '',
    outcome: '' as string,
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);

  const setField = useCallback(
    (field: string, value: string) => {
      setForm((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const resetForm = useCallback(() => {
    setForm({ procedure_type: '', tips: '', outcome: '' });
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!form.procedure_type || !form.tips.trim()) return;

      setSubmitting(true);
      setError(null);

      try {
        const res = await fetch('/api/experiences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            procedure_type: form.procedure_type,
            tips: form.tips,
            outcome: form.outcome || null,
            nationality: profile?.nationality ?? null,
            visa_type: profile?.visa_type ?? null,
          }),
        });

        if (!res.ok) {
          setError('Failed to submit');
          return;
        }

        setSuccess(true);
        resetForm();
        setIsOpen(false);
        window.dispatchEvent(new Event('experience-created'));
        setTimeout(() => setSuccess(false), 4000);
      } catch {
        setError('Failed to submit');
      } finally {
        setSubmitting(false);
      }
    },
    [form, profile, resetForm],
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
            {t('auth.loginToShare')}
          </button>
        </div>
        <LoginModal open={loginOpen} onOpenChange={setLoginOpen} />
      </>
    );
  }

  return (
    <div className="mb-6">
      {success && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center text-sm font-medium text-emerald-700">
          {t('form.success')}
        </div>
      )}

      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="w-full rounded-xl bg-[#2B4C8C] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1E3A6E]"
        >
          {t('shareButton')}
        </button>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-[#E5E3DE] bg-white p-6"
        >
          <h2 className="mb-5 text-lg font-semibold text-[#1A1A2E]">
            {t('form.title')}
          </h2>

          <div className="space-y-4">
            {/* Procedure Type */}
            <div>
              <label
                htmlFor="procedure_type"
                className="mb-1.5 block text-sm font-medium text-[#1A1A2E]"
              >
                {t('form.procedureType')} *
              </label>
              <select
                id="procedure_type"
                required
                value={form.procedure_type}
                onChange={(e) => setField('procedure_type', e.target.value)}
                className="w-full rounded-lg border border-[#E5E3DE] px-3.5 py-2.5 text-sm text-[#1A1A2E] outline-none transition-colors focus:border-[#2B4C8C] focus:ring-1 focus:ring-[#2B4C8C]"
              >
                <option value="">—</option>
                {PROCEDURE_TYPES.map((pt) => (
                  <option key={pt} value={pt}>
                    {t(`procedureTypes.${pt}`)}
                  </option>
                ))}
              </select>
            </div>

            {/* Tips / Story */}
            <div>
              <label
                htmlFor="tips"
                className="mb-1.5 block text-sm font-medium text-[#1A1A2E]"
              >
                {t('form.tips')} *
              </label>
              <textarea
                id="tips"
                required
                rows={4}
                maxLength={2000}
                value={form.tips}
                onChange={(e) => setField('tips', e.target.value)}
                placeholder={t('form.tipsPlaceholder')}
                className="w-full resize-none rounded-lg border border-[#E5E3DE] px-3.5 py-2.5 text-sm text-[#1A1A2E] outline-none transition-colors focus:border-[#2B4C8C] focus:ring-1 focus:ring-[#2B4C8C]"
              />
            </div>

            {/* Outcome */}
            <div>
              <label
                htmlFor="outcome"
                className="mb-1.5 block text-sm font-medium text-[#1A1A2E]"
              >
                {t('form.outcome')}
              </label>
              <select
                id="outcome"
                value={form.outcome}
                onChange={(e) => setField('outcome', e.target.value)}
                className="w-full rounded-lg border border-[#E5E3DE] px-3.5 py-2.5 text-sm text-[#1A1A2E] outline-none transition-colors focus:border-[#2B4C8C] focus:ring-1 focus:ring-[#2B4C8C]"
              >
                <option value="">—</option>
                {OUTCOMES.map((o) => (
                  <option key={o} value={o}>
                    {t(`outcomes.${o}`)}
                  </option>
                ))}
              </select>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting || !form.procedure_type || !form.tips.trim()}
                className="rounded-lg bg-[#2B4C8C] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1E3A6E] disabled:opacity-50"
              >
                {submitting ? t('form.submitting') : t('form.submit')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  resetForm();
                }}
                className="rounded-lg border border-[#E5E3DE] px-6 py-2.5 text-sm font-medium text-[#5C5C6F] transition-colors hover:bg-[#FAFAF8]"
              >
                {t('form.cancel')}
              </button>
              {error && (
                <span className="text-sm font-medium text-red-500">
                  {error}
                </span>
              )}
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
