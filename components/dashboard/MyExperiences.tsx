'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Star, Clock, Trash2 } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import type { Experience, ProcedureType } from '@/lib/experiences/types';

export function MyExperiences() {
  const t = useTranslations('Dashboard');
  const tExp = useTranslations('Experiences');
  const { user } = useAuth();

  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchMyExperiences = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch('/api/experiences?mine=true');
      if (res.ok) {
        const data = await res.json();
        setExperiences(data.experiences ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMyExperiences();
  }, [fetchMyExperiences]);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm(t('myExperiences.confirmDelete'))) return;

      // Optimistic removal
      setDeletingId(id);
      setExperiences((prev) => prev.filter((e) => e.id !== id));

      const res = await fetch('/api/experiences', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) {
        // Revert on failure
        await fetchMyExperiences();
      }
      setDeletingId(null);
    },
    [t, fetchMyExperiences],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#2B4C8C] border-t-transparent" />
      </div>
    );
  }

  if (experiences.length === 0) {
    return (
      <div className="rounded-xl border border-[#E5E3DE] bg-white p-8 text-center">
        <p className="text-sm font-medium text-[#1A1A2E]">
          {t('myExperiences.empty')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {experiences.map((exp) => (
        <div
          key={exp.id}
          className="rounded-xl border border-[#E5E3DE] bg-white p-5 transition-colors hover:border-[#2B4C8C]/20"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="inline-block rounded-full bg-[#EEF2F9] px-2.5 py-0.5 text-xs font-medium text-[#2B4C8C]">
                {tExp(
                  `procedureTypes.${exp.procedure_type as ProcedureType}`,
                )}
              </span>
              {exp.outcome && (
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    exp.outcome === 'approved'
                      ? 'bg-emerald-50 text-emerald-700'
                      : exp.outcome === 'rejected'
                        ? 'bg-red-50 text-red-700'
                        : exp.outcome === 'pending'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-gray-50 text-gray-700'
                  }`}
                >
                  {tExp(`outcomes.${exp.outcome}`)}
                </span>
              )}
            </div>
            <button
              onClick={() => handleDelete(exp.id)}
              disabled={deletingId === exp.id}
              className="rounded-lg p-1.5 text-[#5C5C6F] transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
              title={t('myExperiences.delete')}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          {/* Meta row */}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[#5C5C6F]">
            {exp.prefecture && <span>{exp.prefecture}</span>}
            {exp.city && <span>{exp.city}</span>}
            {exp.wait_time_days != null && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {tExp('card.daysWait', { count: exp.wait_time_days })}
              </span>
            )}
            {exp.difficulty != null && (
              <span className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    className={`h-3 w-3 ${
                      n <= exp.difficulty!
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-[#E5E3DE]'
                    }`}
                  />
                ))}
              </span>
            )}
            {exp.experience_date && (
              <span>
                {new Date(exp.experience_date).toLocaleDateString()}
              </span>
            )}
          </div>

          {/* Tips */}
          {exp.tips && (
            <p className="mt-3 text-sm leading-relaxed text-[#1A1A2E]">
              {exp.tips}
            </p>
          )}

          {/* Documents used */}
          {exp.documents_used && exp.documents_used.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {exp.documents_used.map((doc) => (
                <span
                  key={doc}
                  className="rounded-full bg-[#FAFAF8] px-2.5 py-0.5 text-xs text-[#5C5C6F]"
                >
                  {doc}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
