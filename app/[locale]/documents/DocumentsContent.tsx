'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { FileText, ClipboardList } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { LoginModal } from '@/components/auth/LoginModal';
import { DocumentUpload } from '@/components/documents/DocumentUpload';
import { AnalysisResult } from '@/components/documents/AnalysisResult';
import { ChecklistGenerator } from '@/components/documents/ChecklistGenerator';
import type { DocumentAnalysis } from '@/lib/documents/types';

interface DocumentsContentProps {
  locale: string;
}

type Tab = 'analyzer' | 'checklist';

export function DocumentsContent({ locale }: DocumentsContentProps) {
  const t = useTranslations('Documents');
  const { user, isLoading } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);
  const [analysis, setAnalysis] = useState<DocumentAnalysis | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('checklist');

  if (isLoading) {
    return (
      <main className="mx-auto max-w-3xl px-4 pt-28 pb-16">
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#2B4C8C] border-t-transparent" />
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-3xl px-4 pt-28 pb-16">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#EEF2F9]">
            <FileText className="h-8 w-8 text-[#2B4C8C]" />
          </div>
          <p className="mb-4 text-sm text-[#5C5C6F]">
            {t('auth.loginRequired')}
          </p>
          <button
            onClick={() => setLoginOpen(true)}
            className="rounded-lg bg-[#2B4C8C] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1E3A6E]"
          >
            {t('auth.loginRequired')}
          </button>
          <LoginModal open={loginOpen} onOpenChange={setLoginOpen} />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 pt-28 pb-16">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-[#1A1A2E]">{t('pageTitle')}</h1>
        <p className="mt-2 text-sm text-[#5C5C6F]">{t('pageSubtitle')}</p>
      </div>

      {/* Tab navigation */}
      <div className="mb-6 flex gap-1 rounded-lg border border-[#E5E3DE] bg-[#FAFAF8] p-1">
        <button
          onClick={() => setActiveTab('checklist')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'checklist'
              ? 'bg-white text-[#1A1A2E] shadow-sm'
              : 'text-[#5C5C6F] hover:text-[#1A1A2E]'
          }`}
        >
          <ClipboardList className="h-4 w-4" />
          {t('tabs.checklist')}
        </button>
        <button
          onClick={() => setActiveTab('analyzer')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'analyzer'
              ? 'bg-white text-[#1A1A2E] shadow-sm'
              : 'text-[#5C5C6F] hover:text-[#1A1A2E]'
          }`}
        >
          <FileText className="h-4 w-4" />
          {t('tabs.analyzer')}
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'checklist' ? (
        <ChecklistGenerator language={locale} />
      ) : (
        <>
          <DocumentUpload language={locale} onAnalysisComplete={setAnalysis} />
          <div className="mt-8">
            <AnalysisResult analysis={analysis} userId={user.id} />
          </div>
        </>
      )}
    </main>
  );
}
