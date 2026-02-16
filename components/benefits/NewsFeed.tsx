'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { ExternalLink, Newspaper } from 'lucide-react';
import type { BenefitUpdate } from '@/lib/benefits/types';

function getLocalizedSummary(update: BenefitUpdate, locale: string): string {
  const key = `summary_${locale}` as keyof BenefitUpdate;
  return (update[key] as string) || update.summary_en || update.title;
}

export function NewsFeed({ locale }: { locale: string }) {
  const t = useTranslations('Benefits');
  const [updates, setUpdates] = useState<BenefitUpdate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/benefits/news')
      .then((r) => r.json())
      .then((data) => setUpdates(data.updates ?? []))
      .catch(() => setUpdates([]))
      .finally(() => setLoading(false));
  }, []);

  const sourceLabel = (src: string) => {
    if (src === 'legifrance_rss') return 'Légifrance';
    if (src === 'service_public_rss') return 'Service-Public';
    return 'Manual';
  };

  const sourceColor = (src: string) => {
    if (src === 'legifrance_rss') return 'bg-amber-100 text-amber-700';
    if (src === 'service_public_rss') return 'bg-blue-100 text-blue-700';
    return 'bg-slate-100 text-slate-700';
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-white" />
        ))}
      </div>
    );
  }

  if (updates.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-[#D6DDE8] bg-white py-16 text-center">
        <Newspaper className="h-10 w-10 text-[#D6DDE8]" />
        <p className="text-[#5C5C6F]">{t('news.noNews')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-[#1A1A2E]">{t('news.title')}</h2>
      <p className="mb-4 text-sm text-[#5C5C6F]">{t('news.subtitle')}</p>

      {updates.map((update) => (
        <article
          key={update.id}
          className="rounded-xl border border-[#D6DDE8] bg-white p-4 transition-shadow hover:shadow-sm"
        >
          <div className="mb-2 flex items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${sourceColor(update.source)}`}>
              {sourceLabel(update.source)}
            </span>
            <time className="text-xs text-[#5C5C6F]">
              {new Date(update.published_at).toLocaleDateString(locale)}
            </time>
          </div>

          <h3 className="mb-1.5 text-[15px] font-semibold text-[#1A1A2E]">
            {update.title}
          </h3>

          <p className="mb-3 line-clamp-2 text-sm text-[#5C5C6F]">
            {getLocalizedSummary(update, locale)}
          </p>

          <div className="flex items-center gap-3">
            {update.benefit && (
              <span className="rounded-full bg-[#EEF2F9] px-2.5 py-0.5 text-xs font-medium text-[#2B4C8C]">
                {t('news.relatedBenefit')}: {(update.benefit as unknown as Record<string, string>)[`name_${locale}`] || update.benefit.name_en}
              </span>
            )}
            <a
              href={update.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto inline-flex items-center gap-1 text-sm font-medium text-[#2B4C8C] hover:underline"
            >
              {t('news.readMore')}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </article>
      ))}
    </div>
  );
}
