'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { createClient } from '@/lib/supabase/browser';

interface DocumentAnalysis {
  id: string;
  user_id: string;
  file_name: string;
  document_type: string;
  explanation: string | null;
  action_items: string[] | null;
  summary: string | null;
  created_at: string;
}

export function MyDocuments() {
  const t = useTranslations('Dashboard');
  const { user } = useAuth();

  const [documents, setDocuments] = useState<DocumentAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('document_analyses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setDocuments((data as DocumentAnalysis[]) ?? []);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#2B4C8C] border-t-transparent" />
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="rounded-xl border border-[#E5E3DE] bg-white p-8 text-center">
        <p className="text-sm font-medium text-[#1A1A2E]">
          {t('myDocuments.empty')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {documents.map((doc) => {
        const isExpanded = expandedId === doc.id;
        return (
          <div
            key={doc.id}
            className="rounded-xl border border-[#E5E3DE] bg-white p-5 transition-colors hover:border-[#2B4C8C]/20"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EEF2F9]">
                  <FileText className="h-4 w-4 text-[#2B4C8C]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#1A1A2E]">
                    {doc.file_name}
                  </p>
                  <p className="text-xs text-[#5C5C6F]">
                    {new Date(doc.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <span className="inline-block rounded-full bg-[#EEF2F9] px-2.5 py-0.5 text-xs font-medium text-[#2B4C8C]">
                {doc.document_type}
              </span>
            </div>

            {/* Summary preview */}
            {doc.summary && (
              <p className="mt-3 text-sm leading-relaxed text-[#5C5C6F]">
                {isExpanded ? doc.summary : doc.summary.slice(0, 100)}
                {!isExpanded && doc.summary.length > 100 && '...'}
              </p>
            )}

            {/* Expanded content */}
            {isExpanded && (
              <div className="mt-4 space-y-3 border-t border-[#E5E3DE] pt-4">
                {doc.explanation && (
                  <div>
                    <p className="text-sm leading-relaxed text-[#1A1A2E]">
                      {doc.explanation}
                    </p>
                  </div>
                )}
                {doc.action_items && doc.action_items.length > 0 && (
                  <ul className="list-inside list-disc space-y-1 text-sm text-[#1A1A2E]">
                    {doc.action_items.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Toggle expand */}
            {(doc.explanation || (doc.action_items && doc.action_items.length > 0)) && (
              <button
                onClick={() =>
                  setExpandedId(isExpanded ? null : doc.id)
                }
                className="mt-3 flex items-center gap-1 text-xs font-medium text-[#2B4C8C] transition-colors hover:text-[#1E3A6E]"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-3.5 w-3.5" />
                  </>
                ) : (
                  <>
                    {t('myDocuments.viewAnalysis')}
                    <ChevronDown className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
