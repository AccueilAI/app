'use client';

import { useTranslations } from 'next-intl';
import { Database, Globe, MapPin, Sparkles, ShieldCheck, Brain, RefreshCw } from 'lucide-react';
import type { ProgressStage } from '@/lib/chat/types';

const STAGE_ICONS: Record<ProgressStage, React.ElementType> = {
  searching_rag: Database,
  searching_web: Globe,
  looking_up: MapPin,
  thinking: Brain,
  generating: Sparkles,
  verifying: ShieldCheck,
  regenerating: RefreshCw,
};

export function StreamProgress({ stage }: { stage: ProgressStage }) {
  const t = useTranslations('Chat');
  const Icon = STAGE_ICONS[stage];
  return (
    <div className="flex items-center gap-2 py-1 text-sm text-[#5C5C6F]">
      <Icon className="h-4 w-4 animate-pulse text-[#2B4C8C]" />
      <span className="animate-pulse">{t(`progress.${stage}`)}</span>
    </div>
  );
}
