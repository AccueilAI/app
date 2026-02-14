'use client';

import { useTranslations } from 'next-intl';
import { useAuth } from '@/components/auth/AuthProvider';
import { DeadlineForm } from '@/components/deadlines/DeadlineForm';
import { DeadlineList } from '@/components/deadlines/DeadlineList';

export function DeadlinesContent() {
  const t = useTranslations('Deadlines');
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <main className="mx-auto max-w-3xl px-4 pt-28 pb-16">
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#2B4C8C] border-t-transparent" />
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

      <DeadlineForm />
      <DeadlineList />
    </main>
  );
}
