'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { X, Star, Plus } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { LoginModal } from '@/components/auth/LoginModal';
import { PROCEDURE_TYPES, OUTCOMES } from '@/lib/experiences/types';

export function ExperienceForm() {
  const t = useTranslations('Experiences');
  const { user, profile } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [form, setForm] = useState({
    procedure_type: '' as string,
    prefecture: '',
    city: '',
    wait_time_days: '',
    difficulty: 0,
    tips: '',
    outcome: '' as string,
    experience_date: '',
  });
  const [documents, setDocuments] = useState<string[]>([]);
  const [docInput, setDocInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setField = useCallback(
    (field: string, value: string | number) => {
      setForm((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const resetForm = useCallback(() => {
    setForm({
      procedure_type: '',
      prefecture: '',
      city: '',
      wait_time_days: '',
      difficulty: 0,
      tips: '',
      outcome: '',
      experience_date: '',
    });
    setDocuments([]);
    setDocInput('');
  }, []);

  const addDocument = useCallback(() => {
    const trimmed = docInput.trim();
    if (trimmed && !documents.includes(trimmed)) {
      setDocuments((prev) => [...prev, trimmed]);
    }
    setDocInput('');
  }, [docInput, documents]);

  const removeDocument = useCallback((doc: string) => {
    setDocuments((prev) => prev.filter((d) => d !== doc));
  }, []);

  const handleDocKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addDocument();
      }
    },
    [addDocument],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!form.procedure_type) return;

      setSubmitting(true);
      setError(null);

      try {
        const res = await fetch('/api/experiences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...form,
            wait_time_days: form.wait_time_days
              ? Number(form.wait_time_days)
              : null,
            difficulty: form.difficulty || null,
            outcome: form.outcome || null,
            experience_date: form.experience_date || null,
            documents_used: documents.length > 0 ? documents : null,
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
    [form, documents, profile, resetForm],
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

            {/* Prefecture & City */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="prefecture"
                  className="mb-1.5 block text-sm font-medium text-[#1A1A2E]"
                >
                  {t('form.prefecture')}
                </label>
                <input
                  id="prefecture"
                  type="text"
                  value={form.prefecture}
                  onChange={(e) => setField('prefecture', e.target.value)}
                  className="w-full rounded-lg border border-[#E5E3DE] px-3.5 py-2.5 text-sm text-[#1A1A2E] outline-none transition-colors focus:border-[#2B4C8C] focus:ring-1 focus:ring-[#2B4C8C]"
                />
              </div>
              <div>
                <label
                  htmlFor="city"
                  className="mb-1.5 block text-sm font-medium text-[#1A1A2E]"
                >
                  {t('form.city')}
                </label>
                <input
                  id="city"
                  type="text"
                  value={form.city}
                  onChange={(e) => setField('city', e.target.value)}
                  className="w-full rounded-lg border border-[#E5E3DE] px-3.5 py-2.5 text-sm text-[#1A1A2E] outline-none transition-colors focus:border-[#2B4C8C] focus:ring-1 focus:ring-[#2B4C8C]"
                />
              </div>
            </div>

            {/* Wait Time & Difficulty */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="wait_time"
                  className="mb-1.5 block text-sm font-medium text-[#1A1A2E]"
                >
                  {t('form.waitTime')}
                </label>
                <input
                  id="wait_time"
                  type="number"
                  min="0"
                  value={form.wait_time_days}
                  onChange={(e) => setField('wait_time_days', e.target.value)}
                  className="w-full rounded-lg border border-[#E5E3DE] px-3.5 py-2.5 text-sm text-[#1A1A2E] outline-none transition-colors focus:border-[#2B4C8C] focus:ring-1 focus:ring-[#2B4C8C]"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#1A1A2E]">
                  {t('form.difficulty')}
                </label>
                <div className="flex gap-1 pt-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() =>
                        setField('difficulty', form.difficulty === n ? 0 : n)
                      }
                      className="p-0.5"
                      aria-label={`${n}/5`}
                    >
                      <Star
                        className={`h-6 w-6 transition-colors ${
                          n <= form.difficulty
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-[#E5E3DE]'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Documents Used (tag input) */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#1A1A2E]">
                {t('form.documents')}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={docInput}
                  onChange={(e) => setDocInput(e.target.value)}
                  onKeyDown={handleDocKeyDown}
                  placeholder={t('form.documentsPlaceholder')}
                  className="min-w-0 flex-1 rounded-lg border border-[#E5E3DE] px-3.5 py-2.5 text-sm text-[#1A1A2E] outline-none transition-colors focus:border-[#2B4C8C] focus:ring-1 focus:ring-[#2B4C8C]"
                />
                <button
                  type="button"
                  onClick={addDocument}
                  className="flex items-center justify-center rounded-lg border border-[#E5E3DE] px-3 py-2.5 text-[#5C5C6F] transition-colors hover:border-[#2B4C8C] hover:text-[#2B4C8C]"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              {documents.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {documents.map((doc) => (
                    <span
                      key={doc}
                      className="inline-flex items-center gap-1 rounded-full bg-[#EEF2F9] px-3 py-1 text-xs font-medium text-[#2B4C8C]"
                    >
                      {doc}
                      <button
                        type="button"
                        onClick={() => removeDocument(doc)}
                        className="ml-0.5 text-[#2B4C8C]/60 hover:text-[#2B4C8C]"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Tips */}
            <div>
              <label
                htmlFor="tips"
                className="mb-1.5 block text-sm font-medium text-[#1A1A2E]"
              >
                {t('form.tips')}
              </label>
              <textarea
                id="tips"
                rows={3}
                maxLength={2000}
                value={form.tips}
                onChange={(e) => setField('tips', e.target.value)}
                placeholder={t('form.tipsPlaceholder')}
                className="w-full resize-none rounded-lg border border-[#E5E3DE] px-3.5 py-2.5 text-sm text-[#1A1A2E] outline-none transition-colors focus:border-[#2B4C8C] focus:ring-1 focus:ring-[#2B4C8C]"
              />
            </div>

            {/* Outcome & Date */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
              <div>
                <label
                  htmlFor="experience_date"
                  className="mb-1.5 block text-sm font-medium text-[#1A1A2E]"
                >
                  {t('form.experienceDate')}
                </label>
                <input
                  id="experience_date"
                  type="date"
                  value={form.experience_date}
                  onChange={(e) => setField('experience_date', e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full rounded-lg border border-[#E5E3DE] px-3.5 py-2.5 text-sm text-[#1A1A2E] outline-none transition-colors focus:border-[#2B4C8C] focus:ring-1 focus:ring-[#2B4C8C]"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting || !form.procedure_type}
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
