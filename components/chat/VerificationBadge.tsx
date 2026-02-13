'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ShieldCheck, ShieldAlert, AlertTriangle } from 'lucide-react';
import type { VerificationInfo } from '@/lib/chat/types';

export function VerificationBadge({
  verification,
}: {
  verification: VerificationInfo;
}) {
  const t = useTranslations('Chat');
  const [expanded, setExpanded] = useState(false);

  const { status, flaggedClaims } = verification;

  if (status === 'verified') {
    return (
      <span className="flex items-center gap-1 text-[10px] text-green-600">
        <ShieldCheck className="h-3 w-3" />
        {t('verified')}
      </span>
    );
  }

  const isError = status === 'error';

  return (
    <div className="relative">
      <button
        onClick={() => setExpanded(!expanded)}
        className={`flex items-center gap-1 text-[10px] ${
          isError ? 'text-red-500' : 'text-amber-500'
        }`}
      >
        {isError ? (
          <ShieldAlert className="h-3 w-3" />
        ) : (
          <AlertTriangle className="h-3 w-3" />
        )}
        {isError ? t('unverified') : t('partiallyVerified')}
      </button>
      {expanded && flaggedClaims.length > 0 && (
        <div className="absolute bottom-full left-0 z-10 mb-1 w-64 rounded-lg border border-[#E5E3DE] bg-white p-3 shadow-lg">
          <p className="mb-2 text-[10px] font-medium text-[#5C5C6F]">
            {t('flaggedClaims')}
          </p>
          <ul className="space-y-1.5">
            {flaggedClaims.map((claim, i) => (
              <li key={i} className="text-[10px] leading-relaxed text-[#1A1A2E]">
                <span
                  className={`mr-1 inline-block rounded px-1 py-0.5 text-[9px] font-medium ${
                    claim.severity === 'high'
                      ? 'bg-red-100 text-red-600'
                      : 'bg-amber-100 text-amber-600'
                  }`}
                >
                  {claim.severity}
                </span>
                {claim.claim}
                <span className="block text-[9px] text-[#8A8A9A]">
                  {claim.reason}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
