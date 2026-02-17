'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { Clock } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { LoginModal } from '@/components/auth/LoginModal';
import { DeadlineForm } from '@/components/deadlines/DeadlineForm';
import { DeadlineList } from '@/components/deadlines/DeadlineList';
import { ProcessTracker } from '@/components/benefits/ProcessTracker';

export function DeadlinesContent() {
  const t = useTranslations('Deadlines');
  const locale = useLocale();
  const { isLoading, user } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);

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
            <Clock className="h-8 w-8 text-[#2B4C8C]" />
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

      <DeadlineForm />
      <DeadlineList />

      {user && (
        <div className="mt-10">
          <ProcessTracker locale={locale} />
        </div>
      )}
    </main>
  );
}
