'use client';

import { useTranslations } from 'next-intl';
import { Globe } from 'lucide-react';
import type { WebSource } from '@/lib/chat/types';

export function WebSourceCards({ sources }: { sources: WebSource[] }) {
  const t = useTranslations('Chat');
  if (sources.length === 0) return null;
  return (
    <div className="mb-3">
      <p className="mb-2 text-xs font-medium text-[#8A8A9A]">{t('webSource.title')}</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {sources.slice(0, 4).map((source, i) => (
          <a
            key={i}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg border border-[#E5E3DE] bg-white p-2.5 transition-colors hover:border-[#2B4C8C] hover:bg-[#EEF2F9]"
          >
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-[#EEF2F9]">
              <Globe className="h-3.5 w-3.5 text-[#2B4C8C]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-[#1A1A2E]">{source.title}</p>
              <p className="truncate text-[10px] text-[#8A8A9A]">{source.domain}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
