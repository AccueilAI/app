'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Copy, Check, RefreshCw } from 'lucide-react';

interface MessageActionsProps {
  content: string;
  onRegenerate: () => void;
}

export function MessageActions({ content, onRegenerate }: MessageActionsProps) {
  const t = useTranslations('Chat');
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <button
        onClick={handleCopy}
        className="flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-1 text-xs text-[#8A8A9A] transition-colors hover:bg-[#EEF2F9] hover:text-[#2B4C8C]"
        aria-label={t('actions.copy')}
      >
        {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
        <span>{copied ? t('actions.copied') : t('actions.copy')}</span>
      </button>
      <button
        onClick={onRegenerate}
        className="flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-1 text-xs text-[#8A8A9A] transition-colors hover:bg-[#EEF2F9] hover:text-[#2B4C8C]"
        aria-label={t('actions.regenerate')}
      >
        <RefreshCw className="h-3.5 w-3.5" />
        <span>{t('actions.regenerate')}</span>
      </button>
    </>
  );
}
