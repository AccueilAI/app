'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { FileText } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { LoginModal } from '@/components/auth/LoginModal';
import { DocumentUpload } from '@/components/documents/DocumentUpload';
import { AnalysisResult } from '@/components/documents/AnalysisResult';
import type { DocumentAnalysis } from '@/lib/documents/types';

interface DocumentsContentProps {
  locale: string;
}

export function DocumentsContent({ locale }: DocumentsContentProps) {
  const t = useTranslations('Documents');
  const { user, isLoading } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);
  const [analysis, setAnalysis] = useState<DocumentAnalysis | null>(null);

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

      <DocumentUpload language={locale} onAnalysisComplete={setAnalysis} />

      <div className="mt-8">
        <AnalysisResult analysis={analysis} userId={user.id} />
      </div>
    </main>
  );
}
