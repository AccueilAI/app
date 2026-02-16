'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { ChatSource } from '@/lib/chat/types';

export function SourceCitations({ sources }: { sources: ChatSource[] }) {
  const t = useTranslations('Chat');
  const [open, setOpen] = useState(false);

  if (sources.length === 0) return null;

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-[#5C5C6F] transition-colors hover:text-[#2B4C8C]"
      >
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
        />
        {open
          ? t('hideSources')
          : t('viewSources', { count: sources.length })}
      </button>

      {open && (
        <div className="mt-2 space-y-2">
          {sources.map((source, i) => (
            <div
              key={i}
              className="rounded-lg border border-[#E5E3DE] bg-white p-3"
            >
              <div className="flex items-start gap-2">
                <Badge variant="secondary" className="shrink-0 text-[10px]">
                  {source.doc_type}
                </Badge>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-[#1A1A2E]">
                      {source.source}
                    </span>
                    {source.article_number && (
                      <span className="shrink-0 text-xs text-[#5C5C6F]">
                        Art. {source.article_number}
                      </span>
                    )}
                    {source.source_url && (
                      <a
                        href={source.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 cursor-pointer text-[#2B4C8C] transition-colors hover:text-[#1E3A6E]"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                    {source.last_crawled_at && (() => {
                      const days = Math.floor((Date.now() - new Date(source.last_crawled_at!).getTime()) / 86400000);
                      const isStale = days > 90;
                      return (
                        <span className={`shrink-0 text-[10px] ${isStale ? 'text-amber-600' : 'text-[#8A8A9A]'}`}>
                          {days}d ago
                        </span>
                      );
                    })()}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-[#5C5C6F]">
                    {source.content.length > 100
                      ? source.content.slice(0, 100) + '...'
                      : source.content}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
