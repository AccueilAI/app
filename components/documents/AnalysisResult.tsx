'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FileText, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/browser';
import type { DocumentAnalysis, ChecklistItem } from '@/lib/documents/types';

interface AnalysisResultProps {
  analysis: DocumentAnalysis | null;
  userId: string;
}

export function AnalysisResult({ analysis, userId }: AnalysisResultProps) {
  const t = useTranslations('Documents');
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [history, setHistory] = useState<DocumentAnalysis[]>([]);
  const [activeAnalysis, setActiveAnalysis] = useState<DocumentAnalysis | null>(
    null,
  );

  const current = activeAnalysis ?? analysis;

  useEffect(() => {
    if (analysis) {
      setActiveAnalysis(null);
      setChecklist(analysis.checklist ?? []);
    }
  }, [analysis]);

  const fetchHistory = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('document_analyses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) setHistory(data as DocumentAnalysis[]);
  }, [userId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory, analysis]);

  const toggleCheckItem = useCallback((index: number) => {
    setChecklist((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, checked: !item.checked } : item,
      ),
    );
  }, []);

  const viewHistoryItem = useCallback((item: DocumentAnalysis) => {
    setActiveAnalysis(item);
    setChecklist(item.checklist ?? []);
  }, []);

  // Strip the checklist JSON block from the analysis for markdown rendering
  const analysisMarkdown = current?.analysis
    ?.replace(/##\s*Checklist[\s\S]*$/i, '')
    .trim();

  return (
    <div className="space-y-6">
      {current && (
        <div className="rounded-xl border border-[#E5E3DE] bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-[#1A1A2E]">
            {t('analysisTitle')}
          </h2>

          {current.document_type && (
            <div className="mb-4">
              <span className="inline-block rounded-full bg-[#EEF2F9] px-3 py-1 text-xs font-medium text-[#2B4C8C]">
                {t('documentType')}: {current.document_type}
              </span>
            </div>
          )}

          <div className="prose prose-sm max-w-none text-[#1A1A2E] prose-headings:text-[#1A1A2E] prose-p:text-[#5C5C6F] prose-strong:text-[#1A1A2E]">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {analysisMarkdown ?? ''}
            </ReactMarkdown>
          </div>

          {checklist.length > 0 && (
            <div className="mt-6 border-t border-[#E5E3DE] pt-4">
              <h3 className="mb-3 text-sm font-semibold text-[#1A1A2E]">
                {t('checklist')}
              </h3>
              <ul className="space-y-2">
                {checklist.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => toggleCheckItem(i)}
                      className="mt-0.5 h-4 w-4 rounded border-[#E5E3DE] text-[#2B4C8C] accent-[#2B4C8C]"
                    />
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
          )}
        </div>
      )}

      {/* History */}
      <div className="rounded-xl border border-[#E5E3DE] bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-[#1A1A2E]">
          {t('history.title')}
        </h2>

        {history.length === 0 ? (
          <p className="text-sm text-[#5C5C6F]">{t('history.empty')}</p>
        ) : (
          <ul className="space-y-2">
            {history.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => viewHistoryItem(item)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-[#FAFAF8] ${
                    current?.id === item.id
                      ? 'border border-[#2B4C8C]/20 bg-[#EEF2F9]'
                      : ''
                  }`}
                >
                  <FileText className="h-5 w-5 shrink-0 text-[#2B4C8C]" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[#1A1A2E]">
                      {item.file_name}
                    </p>
                    <div className="flex items-center gap-2">
                      {item.document_type && (
                        <span className="text-xs text-[#5C5C6F]">
                          {item.document_type}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-xs text-[#5C5C6F]">
                        <Clock className="h-3 w-3" />
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
