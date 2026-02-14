'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { ThumbsUp, Star, Clock, Filter } from 'lucide-react';
import { PROCEDURE_TYPES } from '@/lib/experiences/types';
import type { Experience, ProcedureType } from '@/lib/experiences/types';

export function ExperienceList() {
  const t = useTranslations('Experiences');

  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');
  const [filterPrefecture, setFilterPrefecture] = useState('');
  const [debouncedPrefecture, setDebouncedPrefecture] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'helpful'>('recent');
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [helpedIds, setHelpedIds] = useState<Set<string>>(new Set());

  // Debounce prefecture filter
  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedPrefecture(filterPrefecture),
      400,
    );
    return () => clearTimeout(timer);
  }, [filterPrefecture]);

  const fetchExperiences = useCallback(
    async (cursor?: string) => {
      const params = new URLSearchParams();
      if (filterType) params.set('procedure_type', filterType);
      if (debouncedPrefecture) params.set('prefecture', debouncedPrefecture);
      params.set('sort', sortBy);
      if (cursor) params.set('cursor', cursor);

      const res = await fetch(`/api/experiences?${params}`);
      if (!res.ok) return null;
      return (await res.json()) as {
        experiences: Experience[];
        nextCursor: string | null;
      };
    },
    [filterType, debouncedPrefecture, sortBy],
  );

  useEffect(() => {
    setLoading(true);
    fetchExperiences().then((data) => {
      if (data) {
        setExperiences(data.experiences);
        setNextCursor(data.nextCursor);
      }
      setLoading(false);
    });
  }, [fetchExperiences]);

  // Re-fetch when a new experience is submitted
  useEffect(() => {
    const handler = () => {
      fetchExperiences().then((data) => {
        if (data) {
          setExperiences(data.experiences);
          setNextCursor(data.nextCursor);
        }
      });
    };
    window.addEventListener('experience-created', handler);
    return () => window.removeEventListener('experience-created', handler);
  }, [fetchExperiences]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    const data = await fetchExperiences(nextCursor);
    if (data) {
      setExperiences((prev) => [...prev, ...data.experiences]);
      setNextCursor(data.nextCursor);
    }
    setLoadingMore(false);
  }, [nextCursor, loadingMore, fetchExperiences]);

  const handleHelpful = useCallback(
    async (id: string) => {
      if (helpedIds.has(id)) return;

      // Optimistic update
      setHelpedIds((prev) => new Set(prev).add(id));
      setExperiences((prev) =>
        prev.map((e) =>
          e.id === id ? { ...e, helpful_count: e.helpful_count + 1 } : e,
        ),
      );

      await fetch('/api/experiences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
    },
    [helpedIds],
  );

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-sm text-[#5C5C6F]">
          <Filter className="h-4 w-4" />
          <span>{t('filter.filterBy')}</span>
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="rounded-lg border border-[#E5E3DE] px-3 py-1.5 text-sm text-[#1A1A2E] outline-none focus:border-[#2B4C8C]"
        >
          <option value="">{t('filter.all')}</option>
          {PROCEDURE_TYPES.map((pt) => (
            <option key={pt} value={pt}>
              {t(`procedureTypes.${pt as ProcedureType}`)}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={filterPrefecture}
          onChange={(e) => setFilterPrefecture(e.target.value)}
          placeholder={t('form.prefecture')}
          className="rounded-lg border border-[#E5E3DE] px-3 py-1.5 text-sm text-[#1A1A2E] outline-none focus:border-[#2B4C8C]"
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'recent' | 'helpful')}
          className="rounded-lg border border-[#E5E3DE] px-3 py-1.5 text-sm text-[#1A1A2E] outline-none focus:border-[#2B4C8C]"
        >
          <option value="recent">Recent</option>
          <option value="helpful">Most Helpful</option>
        </select>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#2B4C8C] border-t-transparent" />
        </div>
      )}

      {/* Empty */}
      {!loading && experiences.length === 0 && (
        <div className="rounded-xl border border-[#E5E3DE] bg-white p-8 text-center">
          <p className="text-sm font-medium text-[#1A1A2E]">
            {t('empty.noExperiences')}
          </p>
          <p className="mt-1 text-xs text-[#5C5C6F]">{t('empty.beFirst')}</p>
        </div>
      )}

      {/* Cards */}
      {!loading &&
        experiences.map((exp) => (
          <div
            key={exp.id}
            className="rounded-xl border border-[#E5E3DE] bg-white p-5 transition-colors hover:border-[#2B4C8C]/20"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EEF2F9] text-xs font-semibold text-[#2B4C8C]">
                  {exp.profiles?.display_name?.[0]?.toUpperCase() || '?'}
                </div>
                <span className="inline-block rounded-full bg-[#EEF2F9] px-2.5 py-0.5 text-xs font-medium text-[#2B4C8C]">
                  {t(`procedureTypes.${exp.procedure_type as ProcedureType}`)}
                </span>
              </div>
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
                  {t(`outcomes.${exp.outcome}`)}
                </span>
              )}
            </div>

            {/* Meta row */}
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[#5C5C6F]">
              {exp.prefecture && <span>{exp.prefecture}</span>}
              {exp.city && <span>{exp.city}</span>}
              {exp.wait_time_days != null && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {t('card.daysWait', { count: exp.wait_time_days })}
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

            {/* Helpful */}
            <div className="mt-4 border-t border-[#E5E3DE] pt-3">
              <button
                onClick={() => handleHelpful(exp.id)}
                disabled={helpedIds.has(exp.id)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-colors ${
                  helpedIds.has(exp.id)
                    ? 'bg-[#EEF2F9] text-[#2B4C8C]'
                    : 'text-[#5C5C6F] hover:bg-[#EEF2F9] hover:text-[#2B4C8C]'
                }`}
              >
                <ThumbsUp className="h-3.5 w-3.5" />
                {t('card.helpful')}
                {exp.helpful_count > 0 && (
                  <span className="font-medium">({exp.helpful_count})</span>
                )}
              </button>
            </div>
          </div>
        ))}

      {/* Load more */}
      {nextCursor && !loading && (
        <div className="flex justify-center pt-2">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="rounded-lg border border-[#E5E3DE] px-6 py-2 text-sm font-medium text-[#1A1A2E] transition-colors hover:bg-[#FAFAF8] disabled:opacity-50"
          >
            {loadingMore ? '...' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}
