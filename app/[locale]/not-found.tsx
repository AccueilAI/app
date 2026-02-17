'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

export default function NotFound() {
  const t = useTranslations('NotFound');

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#EEF2F9]">
        <span className="font-serif text-3xl font-bold text-[#2B4C8C]">404</span>
      </div>
      <h1 className="mb-2 font-serif text-2xl font-bold text-[#1A1A2E]">
        {t('title')}
      </h1>
      <p className="mb-8 max-w-sm text-sm text-[#5C5C6F]">
        {t('description')}
      </p>
      <Link
        href="/"
        className="rounded-lg bg-[#2B4C8C] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1E3A6E]"
      >
        {t('goHome')}
      </Link>
    </main>
  );
}
