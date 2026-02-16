'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  ClipboardList,
  Loader2,
  ChevronDown,
  Trash2,
  Clock,
  Check,
  Plus,
} from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { PROCEDURE_TYPES } from '@/lib/experiences/types';
import type { DocumentChecklist, ChecklistItem } from '@/lib/documents/types';

const CATEGORY_COLORS: Record<string, string> = {
  identity: 'bg-blue-100 text-blue-700',
  proof_of_residence: 'bg-green-100 text-green-700',
  financial: 'bg-amber-100 text-amber-700',
  professional: 'bg-purple-100 text-purple-700',
  medical: 'bg-pink-100 text-pink-700',
  administrative: 'bg-slate-100 text-slate-700',
  other: 'bg-gray-100 text-gray-600',
};

interface ChecklistGeneratorProps {
  language: string;
}

export function ChecklistGenerator({ language }: ChecklistGeneratorProps) {
  const t = useTranslations('Checklist');
  const tProc = useTranslations('Experiences.procedureTypes');
  const { profile } = useAuth();

  const [procedureType, setProcedureType] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeChecklist, setActiveChecklist] = useState<DocumentChecklist | null>(null);
  const [savedChecklists, setSavedChecklists] = useState<DocumentChecklist[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch saved checklists on mount
  useEffect(() => {
    fetchSavedChecklists();
  }, []);

  const fetchSavedChecklists = async () => {
    try {
      const res = await fetch('/api/documents/checklist');
      if (res.ok) {
        const data = await res.json();
        setSavedChecklists(data);
      }
    } catch {
      // Silently fail
    }
  };

  const handleGenerate = useCallback(async () => {
    if (!procedureType) return;
    setIsGenerating(true);
    setError(null);
    setActiveChecklist(null);

    try {
      const res = await fetch('/api/documents/checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          procedure_type: procedureType,
          nationality: profile?.nationality ?? undefined,
          visa_type: profile?.visa_type ?? undefined,
          prefecture: profile?.prefecture ?? undefined,
          language,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === 'daily_limit') {
          setError(t('errors.dailyLimit'));
        } else {
          setError(t('errors.generationFailed'));
        }
        return;
      }

      setActiveChecklist(data);
      setSavedChecklists((prev) => [data, ...prev]);
    } catch {
      setError(t('errors.generationFailed'));
    } finally {
      setIsGenerating(false);
    }
  }, [procedureType, profile, language, t]);

  const toggleItem = useCallback(
    async (index: number) => {
      if (!activeChecklist) return;

      const newItems = activeChecklist.items.map((item, i) =>
        i === index ? { ...item, checked: !item.checked } : item,
      );

      setActiveChecklist({ ...activeChecklist, items: newItems });

      // Debounced save
      setIsSaving(true);
      try {
        await fetch('/api/documents/checklist', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: activeChecklist.id, items: newItems }),
        });
      } catch {
        // Silently fail
      } finally {
        setIsSaving(false);
      }
    },
    [activeChecklist],
  );

  const deleteChecklist = useCallback(
    async (id: string) => {
      try {
        await fetch(`/api/documents/checklist?id=${id}`, { method: 'DELETE' });
        setSavedChecklists((prev) => prev.filter((c) => c.id !== id));
        if (activeChecklist?.id === id) {
          setActiveChecklist(null);
        }
      } catch {
        // Silently fail
      }
    },
    [activeChecklist],
  );

  const completedCount = activeChecklist?.items.filter((i) => i.checked).length ?? 0;
  const totalCount = activeChecklist?.items.length ?? 0;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  // Group items by category
  const groupedItems = activeChecklist?.items.reduce(
    (acc, item, index) => {
      const cat = item.category ?? 'other';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push({ ...item, _index: index });
      return acc;
    },
    {} as Record<string, (ChecklistItem & { _index: number })[]>,
  );

  return (
    <div className="space-y-6">
      {/* Generator form */}
      <div className="rounded-xl border border-[#E5E3DE] bg-white p-6">
        <h2 className="mb-2 text-lg font-semibold text-[#1A1A2E]">
          {t('title')}
        </h2>
        <p className="mb-6 text-sm text-[#5C5C6F]">{t('subtitle')}</p>

        <div className="space-y-4">
          {/* Procedure type selector */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#1A1A2E]">
              {t('procedureType')}
            </label>
            <div className="relative">
              <select
                value={procedureType}
                onChange={(e) => setProcedureType(e.target.value)}
                className="w-full appearance-none rounded-lg border border-[#E5E3DE] bg-white px-4 py-2.5 pr-10 text-sm text-[#1A1A2E] transition-colors focus:border-[#2B4C8C] focus:ring-1 focus:ring-[#2B4C8C] focus:outline-none"
              >
                <option value="">{t('selectProcedure')}</option>
                {PROCEDURE_TYPES.filter((p) => p !== 'other').map((type) => (
                  <option key={type} value={type}>
                    {tProc(type)}
                  </option>
                ))}
                <option value="other">{tProc('other')}</option>
              </select>
              <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-[#5C5C6F]" />
            </div>
          </div>

          {/* Profile info (auto-filled) */}
          {profile && (profile.nationality || profile.visa_type || profile.prefecture) && (
            <div className="rounded-lg bg-[#EEF2F9] px-4 py-3">
              <p className="mb-1 text-xs font-medium text-[#2B4C8C]">
                {t('profileInfo')}
              </p>
              <div className="flex flex-wrap gap-2">
                {profile.nationality && (
                  <span className="rounded-full bg-white px-2.5 py-0.5 text-xs text-[#1A1A2E]">
                    {profile.nationality}
                  </span>
                )}
                {profile.visa_type && (
                  <span className="rounded-full bg-white px-2.5 py-0.5 text-xs text-[#1A1A2E]">
                    {profile.visa_type}
                  </span>
                )}
                {profile.prefecture && (
                  <span className="rounded-full bg-white px-2.5 py-0.5 text-xs text-[#1A1A2E]">
                    {profile.prefecture}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={!procedureType || isGenerating}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#2B4C8C] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1E3A6E] disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('generating')}
              </>
            ) : (
              <>
                <ClipboardList className="h-4 w-4" />
                {t('generate')}
              </>
            )}
          </button>

          {error && (
            <p className="text-center text-sm text-red-500">{error}</p>
          )}
        </div>
      </div>

      {/* Active checklist */}
      {activeChecklist && (
        <div className="rounded-xl border border-[#E5E3DE] bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#1A1A2E]">
              {activeChecklist.title}
            </h2>
            <div className="flex items-center gap-2">
              {isSaving && (
                <span className="text-xs text-[#5C5C6F]">{t('saving')}</span>
              )}
              <span className="text-sm font-medium text-[#2B4C8C]">
                {completedCount}/{totalCount}
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-6 h-2 overflow-hidden rounded-full bg-[#E5E3DE]">
            <div
              className="h-full rounded-full bg-[#2B4C8C] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Grouped checklist items */}
          {groupedItems &&
            Object.entries(groupedItems).map(([category, items]) => (
              <div key={category} className="mb-4 last:mb-0">
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${CATEGORY_COLORS[category] ?? CATEGORY_COLORS.other}`}
                  >
                    {t(`categories.${category}`)}
                  </span>
                </div>
                <ul className="space-y-2">
                  {items.map((item) => (
                    <li
                      key={item._index}
                      className="flex items-start gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-[#FAFAF8]"
                    >
                      <button
                        onClick={() => toggleItem(item._index)}
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                          item.checked
                            ? 'border-[#2B4C8C] bg-[#2B4C8C]'
                            : 'border-[#E5E3DE] hover:border-[#2B4C8C]'
                        }`}
                      >
                        {item.checked && (
                          <Check className="h-3.5 w-3.5 text-white" />
                        )}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm ${item.checked ? 'text-[#5C5C6F] line-through' : 'text-[#1A1A2E]'}`}
                        >
                          {item.item}
                        </p>
                        {item.details && (
                          <p className="mt-0.5 text-xs text-[#5C5C6F]">
                            {item.details}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
        </div>
      )}

      {/* Saved checklists */}
      {savedChecklists.length > 0 && (
        <div className="rounded-xl border border-[#E5E3DE] bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-[#1A1A2E]">
            {t('saved.title')}
          </h2>
          <ul className="space-y-2">
            {savedChecklists.map((cl) => {
              const done = cl.items.filter((i) => i.checked).length;
              const total = cl.items.length;
              return (
                <li key={cl.id}>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setActiveChecklist(cl)}
                      className={`flex min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-[#FAFAF8] ${
                        activeChecklist?.id === cl.id
                          ? 'border border-[#2B4C8C]/20 bg-[#EEF2F9]'
                          : ''
                      }`}
                    >
                      <ClipboardList className="h-5 w-5 shrink-0 text-[#2B4C8C]" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[#1A1A2E]">
                          {cl.title}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#5C5C6F]">
                            {done}/{total} {t('saved.completed')}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-[#5C5C6F]">
                            <Clock className="h-3 w-3" />
                            {new Date(cl.updated_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={() => deleteChecklist(cl.id)}
                      className="rounded-md p-1.5 text-[#5C5C6F] transition-colors hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Empty state with prompt to generate */}
      {!activeChecklist && savedChecklists.length === 0 && !isGenerating && (
        <div className="flex flex-col items-center py-8 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#EEF2F9]">
            <Plus className="h-6 w-6 text-[#2B4C8C]" />
          </div>
          <p className="text-sm text-[#5C5C6F]">{t('empty')}</p>
        </div>
      )}
    </div>
  );
}
